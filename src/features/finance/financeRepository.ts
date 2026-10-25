import { PistisError } from '../../core/errors';
import { newId, systemClock, type Clock } from '../../core/ids';
import { isValidLocalDate } from '../../core/localDate';
import type { Database, Statement } from '../../data/database';
import { ACCOUNT_KINDS, isInstitutionId, type AccountKind, type InstitutionId } from '../../content/institutions';
import { importKeys, type ParsedStatement } from './statementImport';

/**
 * Comptes et opérations. Règles :
 * - montants en centimes entiers avec leur devise ;
 * - un solde n'est jamais calculé ni deviné : il vient du fichier de la banque ou de l'utilisateur, avec sa date ;
 * - réimporter un relevé déjà importé n'ajoute rien en double.
 */

export interface Account {
  id: string;
  name: string;
  institution: InstitutionId;
  kind: AccountKind;
  currency: string;
  external_ref: string | null;
  balance_cents: number | null;
  balance_date: string | null;
  balance_source: 'file' | 'manual' | null;
  created_at: number;
  updated_at: number;
}

export interface AccountSummary {
  account: Account;
  transactionCount: number;
  firstDate: string | null;
  lastDate: string | null;
  lastImportAt: number | null;
}

export interface Transaction {
  id: string;
  account_id: string;
  date: string;
  label: string;
  amount_cents: number;
  currency: string;
  account_name: string;
}

export interface AccountInput {
  name: string;
  institution: InstitutionId;
  kind: AccountKind;
  currency?: string;
  externalRef?: string | null;
}

function checkAccount(input: AccountInput) {
  const name = input.name.trim();
  if (!name || name.length > 80) throw new PistisError('account.invalid', { detail: 'name' });
  if (!isInstitutionId(input.institution)) throw new PistisError('account.invalid', { detail: 'institution' });
  if (!ACCOUNT_KINDS.includes(input.kind)) throw new PistisError('account.invalid', { detail: 'kind' });
  if (input.currency && !/^[A-Z]{3}$/.test(input.currency)) throw new PistisError('account.invalid', { detail: 'currency' });
}

export async function createAccount(db: Database, input: AccountInput, clock: Clock = systemClock): Promise<string> {
  checkAccount(input);
  const id = newId();
  const now = clock.now();
  await db.run(
    `INSERT INTO account (id, name, institution, kind, currency, external_ref, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.name.trim(), input.institution, input.kind, input.currency ?? 'EUR', input.externalRef ?? null, now, now],
  );
  return id;
}

export async function updateAccount(
  db: Database,
  id: string,
  input: AccountInput & { balance?: { cents: number; date: string } | null },
  clock: Clock = systemClock,
): Promise<void> {
  checkAccount(input);
  if (input.balance && (!Number.isSafeInteger(input.balance.cents) || !isValidLocalDate(input.balance.date)))
    throw new PistisError('account.invalid', { detail: 'balance' });
  const now = clock.now();
  const statements: Statement[] = [
    {
      sql: 'UPDATE account SET name = ?, institution = ?, kind = ?, updated_at = ? WHERE id = ?',
      params: [input.name.trim(), input.institution, input.kind, now, id],
    },
  ];
  if (input.balance !== undefined) {
    statements.push({
      sql: 'UPDATE account SET balance_cents = ?, balance_date = ?, balance_source = ? WHERE id = ?',
      params: input.balance ? [input.balance.cents, input.balance.date, 'manual', id] : [null, null, null, id],
    });
  }
  await db.transaction(statements);
}

export async function deleteAccount(db: Database, id: string): Promise<void> {
  await db.run('DELETE FROM account WHERE id = ?', [id]);
}

export async function getAccount(db: Database, id: string): Promise<Account | null> {
  return (await db.all<Account & Record<string, never>>('SELECT * FROM account WHERE id = ?', [id]))[0] ?? null;
}

export async function listAccounts(db: Database): Promise<AccountSummary[]> {
  const rows = await db.all<Record<string, never>>(
    `SELECT a.*,
       (SELECT COUNT(*) FROM bank_transaction t WHERE t.account_id = a.id) AS tx_count,
       (SELECT MIN(date) FROM bank_transaction t WHERE t.account_id = a.id) AS first_date,
       (SELECT MAX(date) FROM bank_transaction t WHERE t.account_id = a.id) AS last_date,
       (SELECT MAX(imported_at) FROM import_batch b WHERE b.account_id = a.id) AS last_import
     FROM account a ORDER BY a.created_at`,
  );
  return rows.map((r) => {
    const { tx_count, first_date, last_date, last_import, ...account } = r as Record<string, unknown>;
    return {
      account: account as unknown as Account,
      transactionCount: Number(tx_count ?? 0),
      firstDate: (first_date as string | null) ?? null,
      lastDate: (last_date as string | null) ?? null,
      lastImportAt: last_import === null || last_import === undefined ? null : Number(last_import),
    };
  });
}

export interface ImportResult {
  added: number;
  skipped: number;
  balanceUpdated: boolean;
}

/** Enregistre les opérations d'un relevé dans un compte, en une seule transaction. */
export async function importStatement(
  db: Database,
  accountId: string,
  statement: ParsedStatement,
  fileName: string,
  clock: Clock = systemClock,
): Promise<ImportResult> {
  const account = await getAccount(db, accountId);
  if (!account) throw new PistisError('account.notFound');
  if (!statement.transactions.length) throw new PistisError('import.empty');
  const currency = statement.currency ?? account.currency;
  if (currency !== account.currency) throw new PistisError('import.currencyMismatch', { file: currency, account: account.currency });

  const keys = importKeys(statement.transactions);
  const existing = new Set(
    (await db.all<{ import_key: string }>('SELECT import_key FROM bank_transaction WHERE account_id = ?', [accountId])).map(
      (r) => r.import_key,
    ),
  );
  const now = clock.now();
  const batchId = newId();
  const statements: Statement[] = [];
  let added = 0;
  statement.transactions.forEach((t, i) => {
    if (existing.has(keys[i])) return;
    existing.add(keys[i]);
    added += 1;
    statements.push({
      sql: `INSERT INTO bank_transaction (id, account_id, batch_id, date, label, amount_cents, currency, import_key, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [newId(), accountId, batchId, t.date, t.label, t.amountCents, currency, keys[i], now],
    });
  });
  const skipped = statement.transactions.length - added;
  statements.unshift({
    sql: 'INSERT INTO import_batch (id, account_id, source, file_name, added, skipped, imported_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    params: [batchId, accountId, statement.format, fileName.slice(0, 200), added, skipped, now],
  });
  // Le solde du fichier remplace l'ancien seulement s'il est au moins aussi récent.
  const balance = statement.balance;
  const balanceUpdated = Boolean(balance && (!account.balance_date || balance.date >= account.balance_date));
  if (balance && balanceUpdated) {
    statements.push({
      sql: "UPDATE account SET balance_cents = ?, balance_date = ?, balance_source = 'file', updated_at = ? WHERE id = ?",
      params: [balance.cents, balance.date, now, accountId],
    });
  }
  if (!account.external_ref && statement.accountRef) {
    statements.push({ sql: 'UPDATE account SET external_ref = ? WHERE id = ?', params: [statement.accountRef.slice(-4), accountId] });
  }
  await db.transaction(statements);
  return { added, skipped, balanceUpdated };
}

/** Compte dont la référence (4 derniers chiffres) correspond à celle du fichier, pour le proposer d'office. */
export async function findAccountByRef(db: Database, ref: string | null): Promise<string | null> {
  if (!ref) return null;
  const rows = await db.all<{ id: string }>('SELECT id FROM account WHERE external_ref = ? LIMIT 1', [ref.slice(-4)]);
  return rows[0]?.id ?? null;
}

export async function listTransactions(
  db: Database,
  opts: { accountId?: string; from?: string; to?: string; search?: string; limit?: number } = {},
): Promise<Transaction[]> {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts.accountId) {
    where.push('t.account_id = ?');
    params.push(opts.accountId);
  }
  if (opts.from) {
    where.push('t.date >= ?');
    params.push(opts.from);
  }
  if (opts.to) {
    where.push('t.date <= ?');
    params.push(opts.to);
  }
  if (opts.search?.trim()) {
    where.push("t.label LIKE ? ESCAPE '\\'");
    params.push(`%${opts.search.trim().replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
  }
  params.push(opts.limit ?? 500);
  return db.all<Transaction & Record<string, never>>(
    `SELECT t.id, t.account_id, t.date, t.label, t.amount_cents, t.currency, a.name AS account_name
     FROM bank_transaction t JOIN account a ON a.id = t.account_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY t.date DESC, t.created_at DESC, t.rowid DESC LIMIT ?`,
    params,
  );
}

export interface MonthTotals {
  currency: string;
  incomeCents: number;
  expenseCents: number;
  count: number;
}

/** Entrées et sorties d'un mois (« AAAA-MM »), par devise : on n'additionne jamais deux devises. */
export async function monthTotals(db: Database, month: string, accountId?: string): Promise<MonthTotals[]> {
  const rows = await db.all<{ currency: string; income: number; expense: number; n: number }>(
    `SELECT currency,
       COALESCE(SUM(CASE WHEN amount_cents > 0 THEN amount_cents END), 0) AS income,
       COALESCE(SUM(CASE WHEN amount_cents < 0 THEN -amount_cents END), 0) AS expense,
       COUNT(*) AS n
     FROM bank_transaction WHERE substr(date, 1, 7) = ? ${accountId ? 'AND account_id = ?' : ''}
     GROUP BY currency ORDER BY currency`,
    accountId ? [month, accountId] : [month],
  );
  return rows.map((r) => ({ currency: r.currency, incomeCents: Number(r.income), expenseCents: Number(r.expense), count: Number(r.n) }));
}
