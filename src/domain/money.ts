/**
 * Montants : toujours des centimes entiers (jamais de nombre à virgule pour de l'argent).
 * Les relevés bancaires écrivent les montants de mille façons : « 1 234,56 », « -1.234,56 »,
 * « 1,234.56 », « 12,30 € », « (45,00) », « +8.5 ». On lit le texte caractère par caractère,
 * sans passer par parseFloat, pour ne jamais perdre un centime.
 */

/** Convertit un montant écrit en texte en centimes entiers, ou `null` s'il est illisible. */
export function parseAmountToCents(raw: string): number | null {
  let text = raw
    .replace(/[\u00a0\u202f\s']/g, '') // espaces (y compris insécables) et apostrophes de milliers
    .replace(/(EUR|USD|GBP|CHF|€|\$|£)/gi, '');
  if (!text) return null;

  let negative = false;
  if (text.startsWith('(') && text.endsWith(')')) {
    negative = true;
    text = text.slice(1, -1);
  }
  if (text.startsWith('-') || text.startsWith('−')) {
    negative = !negative;
    text = text.slice(1);
  } else if (text.startsWith('+')) {
    text = text.slice(1);
  }
  if (text.endsWith('-')) {
    negative = !negative;
    text = text.slice(0, -1);
  }
  if (!/^[\d.,]+$/.test(text) || !/\d/.test(text)) return null;

  // Le dernier séparateur suivi de 1 ou 2 chiffres est la virgule décimale ; suivi de 3 chiffres,
  // c'est un séparateur de milliers (« 1.250 » = 1 250). Les autres séparateurs sont des milliers.
  const lastSep = Math.max(text.lastIndexOf(','), text.lastIndexOf('.'));
  let intPart = text;
  let decPart = '';
  if (lastSep >= 0) {
    const after = text.slice(lastSep + 1);
    if (after.length >= 1 && after.length <= 2) {
      intPart = text.slice(0, lastSep);
      decPart = after;
    } else if (after.length !== 3) {
      return null;
    }
  }
  const digits = intPart.replace(/[.,]/g, '');
  if (!/^\d+$/.test(digits)) return null;
  const cents = Number(digits) * 100 + Number((decPart + '00').slice(0, 2));
  if (!Number.isSafeInteger(cents)) return null;
  return negative ? -cents : cents;
}

/** Somme sûre de centimes. */
export function sumCents(values: number[]): number {
  return values.reduce((s, v) => s + v, 0);
}
