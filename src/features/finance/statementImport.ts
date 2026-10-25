import { isValidLocalDate } from '../../core/localDate';
import { parseAmountToCents } from '../../domain/money';

/**
 * Lecture des relevés téléchargés depuis l'espace client d'une banque.
 * Toutes les banques françaises proposent au moins un de ces formats :
 * - OFX / QFX (« Money », « Quicken ») : format structuré, avec identifiant unique par opération ;
 * - CSV (« Excel », « tableur ») : colonnes variables selon la banque, séparateur « ; » ou « , ».
 * Rien n'est envoyé nulle part : le fichier est lu dans l'appareil.
 */

export interface ParsedTransaction {
  date: string; // AAAA-MM-JJ
  label: string;
  amountCents: number;
  /** Identifiant fourni par la banque (OFX), sinon calculé à l'enregistrement. */
  bankId?: string;
}

export interface ParsedStatement {
  format: 'ofx' | 'csv';
  currency: string | null;
  accountRef: string | null;
  balance: { cents: number; date: string } | null;
  transactions: ParsedTransaction[];
  /** Lignes ignorées car illisibles (numéros de ligne, à partir de 1). */
  rejected: number[];
}

/* ---- Décodage du fichier ---------------------------------------------------------------- */

/** Beaucoup de banques exportent encore en Windows-1252 : on essaie UTF-8 strict, sinon Windows-1252. */
export function decodeStatement(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\ufeff/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

export function looksLikeOfx(text: string): boolean {
  return /<OFX>/i.test(text) || /OFXHEADER/i.test(text);
}

/* ---- OFX ---------------------------------------------------------------------------------- */

/** Valeur d'une balise OFX, qu'elle soit fermée (XML, OFX 2) ou non (SGML, OFX 1). */
function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}>([^<\\r\\n]*)`, 'i'));
  const value = m?.[1].trim();
  return value ? decodeEntities(value) : null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

/** « 20261025120000[+1:CET] » → « 2026-10-25 ». */
function ofxDate(raw: string | null): string | null {
  const m = raw?.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  const date = `${m[1]}-${m[2]}-${m[3]}`;
  return isValidLocalDate(date) ? date : null;
}

export function parseOfx(text: string): ParsedStatement {
  const blocks = text.split(/<STMTTRN>/i).slice(1);
  const transactions: ParsedTransaction[] = [];
  const rejected: number[] = [];
  blocks.forEach((raw, index) => {
    const block = raw.split(/<\/STMTTRN>/i)[0];
    const date = ofxDate(tag(block, 'DTPOSTED')) ?? ofxDate(tag(block, 'DTUSER'));
    const amount = parseAmountToCents(tag(block, 'TRNAMT') ?? '');
    const name = tag(block, 'NAME') ?? '';
    const memo = tag(block, 'MEMO') ?? '';
    const label = [name, memo && memo !== name ? memo : ''].filter(Boolean).join(' — ') || tag(block, 'TRNTYPE') || '';
    if (!date || amount === null) {
      rejected.push(index + 1);
      return;
    }
    transactions.push({ date, label: cleanLabel(label), amountCents: amount, bankId: tag(block, 'FITID') ?? undefined });
  });

  const balanceBlock = text.match(/<LEDGERBAL>([\s\S]*?)(<\/LEDGERBAL>|<AVAILBAL>|<\/STMTRS>|<\/CCSTMTRS>)/i)?.[1] ?? '';
  const balanceCents = parseAmountToCents(tag(balanceBlock, 'BALAMT') ?? '');
  const balanceDate = ofxDate(tag(balanceBlock, 'DTASOF'));
  return {
    format: 'ofx',
    currency: tag(text, 'CURDEF')?.toUpperCase() ?? null,
    accountRef: tag(text, 'ACCTID'),
    balance: balanceCents !== null && balanceDate ? { cents: balanceCents, date: balanceDate } : null,
    transactions,
    rejected,
  };
}

function cleanLabel(label: string): string {
  return label.replace(/\s+/g, ' ').trim().slice(0, 200);
}

/* ---- CSV ---------------------------------------------------------------------------------- */

/** Découpe un CSV (guillemets, séparateurs dans les champs, retours à la ligne dans les champs). */
export function splitCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += c;
    } else if (c === '"' && field.trim() === '') {
      quoted = true;
      field = '';
    } else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row.map((f) => f.trim()));
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row.map((f) => f.trim()));
  return rows;
}

/** Le séparateur le plus régulier sur les premières lignes (« ; » en France, « , » ailleurs, parfois tabulation). */
export function detectDelimiter(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .slice(0, 20);
  let best = ';';
  let bestScore = -1;
  for (const d of [';', ',', '\t', '|']) {
    // Nombre de colonnes le plus fréquent (au moins 2) × nombre de lignes qui l'ont : un séparateur
    // présent par hasard dans un montant (« 12,30 ») donne des lignes irrégulières et perd.
    const counts = lines.map((l) => splitCsv(l, d)[0]?.length ?? 0).filter((n) => n >= 2);
    const freq = new Map<number, number>();
    for (const n of counts) freq.set(n, (freq.get(n) ?? 0) + 1);
    let score = 0;
    for (const [n, f] of freq) score = Math.max(score, n * f);
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

export type DateOrder = 'dmy' | 'ymd' | 'mdy';

/** « 25/10/2026 », « 25-10-26 », « 2026-10-25 », « 10/25/2026 » → « 2026-10-25 ». */
export function parseCsvDate(raw: string, order: DateOrder): string | null {
  const m = raw.trim().match(/^(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4})/);
  if (!m) return null;
  let [a, b] = [m[1], m[2]];
  const c = m[3];
  let y: string, mo: string, d: string;
  if (a.length === 4) [y, mo, d] = [a, b, c];
  else if (order === 'mdy') [mo, d, y] = [a, b, c];
  else [d, mo, y] = [a, b, c];
  if (y.length === 2) y = `20${y}`;
  if (y.length !== 4) return null;
  [a, b] = [mo.padStart(2, '0'), d.padStart(2, '0')];
  const date = `${y}-${a}-${b}`;
  return isValidLocalDate(date) ? date : null;
}

export interface CsvMapping {
  /** Ligne d'en-tête (index) ou `null` s'il n'y en a pas. Les lignes au-dessus (infos du compte) sont ignorées. */
  header: number | null;
  date: number;
  label: number;
  /** Soit une colonne montant signée… */
  amount: number | null;
  /** … soit deux colonnes débit / crédit. */
  debit: number | null;
  credit: number | null;
  balance: number | null;
  dateOrder: DateOrder;
}

const HEADER_HINTS = {
  date: /^(date|date op|date d'op|date opération|date operation|date comptable|date de comptabilisation|started date|completed date|transaction date|booking date)/i,
  label: /(libell|description|intitul|^label$|merchant|payee)/i,
  labelFallback: /(détail|detail|nature|bénéficiaire|beneficiaire|opération|operation|label)/i,
  amount: /^(montant|amount|somme|valeur|montant \(eur\)|montant\(eur\))/i,
  debit: /(débit|debit|dépense|depense|sortie|paid out)/i,
  credit: /(crédit|credit|recette|entrée|entree|paid in)/i,
  balance: /(solde|balance)/i,
};

/** Devine les colonnes à partir de l'en-tête et des valeurs. L'utilisateur peut tout corriger ensuite. */
export function detectCsvMapping(rows: string[][]): CsvMapping {
  // L'en-tête est la première ligne (parmi les 15 premières) qui ressemble à des titres de colonnes :
  // certaines banques écrivent d'abord le numéro de compte, la date, le solde…
  const hints = [HEADER_HINTS.date, HEADER_HINTS.label, HEADER_HINTS.amount, HEADER_HINTS.debit, HEADER_HINTS.credit];
  const headerIndex = rows.slice(0, 15).findIndex((r) => r.filter((h) => hints.some((re) => re.test(h))).length >= 2);
  const headerRow = headerIndex >= 0;
  const header = headerRow ? rows[headerIndex] : [];
  const data = headerRow ? rows.slice(headerIndex + 1, headerIndex + 31) : rows.slice(0, 30);
  const width = Math.max(0, ...rows.map((r) => r.length));
  const find = (re: RegExp, exclude: number[] = []) => (headerRow ? header.findIndex((h, i) => re.test(h) && !exclude.includes(i)) : -1);
  const ratio = (col: number, test: (v: string) => boolean) => data.filter((r) => r[col] && test(r[col])).length / Math.max(1, data.length);

  let date = find(HEADER_HINTS.date);
  if (date < 0) date = range(width).find((c) => ratio(c, (v) => parseCsvDate(v, 'dmy') !== null) > 0.8) ?? 0;
  let debit = find(HEADER_HINTS.debit, [date]);
  let credit = find(HEADER_HINTS.credit, [date, debit]);
  let amount = find(HEADER_HINTS.amount, [date, debit, credit]);
  const balance = find(HEADER_HINTS.balance, [date, debit, credit, amount]);
  if (amount >= 0 || debit < 0 || credit < 0) {
    debit = -1;
    credit = -1;
  }
  if (amount < 0 && debit < 0) {
    amount =
      range(width).find((c) => c !== date && c !== balance && ratio(c, (v) => parseAmountToCents(v) !== null && /[.,]/.test(v)) > 0.8) ??
      -1;
  }
  let label = find(HEADER_HINTS.label, [date, amount, debit, credit, balance]);
  if (label < 0) label = find(HEADER_HINTS.labelFallback, [date, amount, debit, credit, balance]);
  if (label < 0) {
    const used = [date, amount, debit, credit, balance];
    label =
      range(width)
        .filter((c) => !used.includes(c))
        .sort((a, b) => avgLength(data, b) - avgLength(data, a))[0] ?? 1;
  }
  // Ordre de date : si une valeur a un premier nombre > 12, c'est jour/mois ; si le second > 12, mois/jour.
  const dates = data.map((r) => r[date] ?? '');
  const mdy = dates.some((v) => /^\d{1,2}[/.-](1[3-9]|2\d|3[01])[/.-]/.test(v)) && !dates.some((v) => /^(1[3-9]|2\d|3[01])[/.-]/.test(v));
  return {
    header: headerRow ? headerIndex : null,
    date,
    label,
    amount: amount >= 0 ? amount : null,
    debit: debit >= 0 ? debit : null,
    credit: credit >= 0 ? credit : null,
    balance: balance >= 0 ? balance : null,
    dateOrder: mdy ? 'mdy' : 'dmy',
  };
}

function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

function avgLength(rows: string[][], col: number): number {
  return rows.reduce((s, r) => s + (r[col]?.length ?? 0), 0) / Math.max(1, rows.length);
}

/** Applique un choix de colonnes : opérations lisibles + numéros des lignes ignorées. */
export function applyCsvMapping(rows: string[][], mapping: CsvMapping): ParsedStatement {
  const transactions: ParsedTransaction[] = [];
  const rejected: number[] = [];
  const start = mapping.header === null ? 0 : mapping.header + 1;
  let balance: ParsedStatement['balance'] = null;
  rows.slice(start).forEach((row, i) => {
    const line = i + start + 1;
    const date = parseCsvDate(row[mapping.date] ?? '', mapping.dateOrder);
    let amount: number | null = null;
    if (mapping.amount !== null) amount = parseAmountToCents(row[mapping.amount] ?? '');
    else if (mapping.debit !== null && mapping.credit !== null) {
      const d = row[mapping.debit] ? parseAmountToCents(row[mapping.debit]) : 0;
      const c = row[mapping.credit] ? parseAmountToCents(row[mapping.credit]) : 0;
      // Un débit est une sortie, qu'il soit écrit « 12,00 » ou « -12,00 ».
      if (d !== null && c !== null && (d !== 0 || c !== 0)) amount = Math.abs(c) - Math.abs(d);
    }
    const label = cleanLabel(row[mapping.label] ?? '');
    if (!date || amount === null) {
      rejected.push(line);
      return;
    }
    transactions.push({ date, label, amountCents: amount });
    if (mapping.balance !== null) {
      const b = parseAmountToCents(row[mapping.balance] ?? '');
      // Le solde le plus récent du fichier (les banques trient dans un sens ou dans l'autre).
      if (b !== null && (!balance || date >= balance.date)) balance = { cents: b, date };
    }
  });
  return { format: 'csv', currency: null, accountRef: null, balance, transactions, rejected };
}

/* ---- Doublons ------------------------------------------------------------------------------ */

/**
 * Clé de chaque opération, stable d'un import à l'autre : réimporter un relevé qui chevauche le précédent
 * n'ajoute rien en double. Deux opérations identiques le même jour (deux cafés à 2,50 €) restent distinctes
 * grâce à leur rang dans le fichier.
 */
export function importKeys(transactions: ParsedTransaction[]): string[] {
  const seen = new Map<string, number>();
  return transactions.map((t) => {
    if (t.bankId) return `fitid:${t.bankId}`;
    const base = `${t.date}|${t.amountCents}|${t.label.toLowerCase()}`;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return `line:${base}|${n}`;
  });
}

/** Période couverte par un relevé. */
export function statementPeriod(transactions: ParsedTransaction[]): { from: string; to: string } | null {
  if (!transactions.length) return null;
  const dates = transactions.map((t) => t.date).sort();
  return { from: dates[0], to: dates[dates.length - 1] };
}

/** « FR76 3000 4000 0312 3456 7890 143 » → « ••0143 » : on ne garde jamais un numéro complet à l'écran. */
export function maskAccountRef(ref: string | null): string | null {
  const digits = ref?.replace(/\s/g, '') ?? '';
  return digits.length >= 4 ? `••${digits.slice(-4)}` : null;
}
