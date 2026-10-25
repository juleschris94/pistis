import { describe, expect, it } from 'vitest';
import { createMemoryDatabase } from '../../data/memoryDatabase';
import { migrate } from '../../data/migrations';
import { exportBackup, readBackup, restoreBackup } from '../backup/backup';
import {
  createAccount,
  deleteAccount,
  findAccountByRef,
  importStatement,
  listAccounts,
  listTransactions,
  monthTotals,
  updateAccount,
} from './financeRepository';
import type { ParsedStatement } from './statementImport';

const clock = { now: () => Date.UTC(2026, 9, 25, 9) };

async function setup() {
  const db = await createMemoryDatabase();
  await migrate(db);
  const id = await createAccount(db, { name: 'Compte courant', institution: 'labanquepostale', kind: 'checking' }, clock);
  return { db, id };
}

const statement = (over: Partial<ParsedStatement> = {}): ParsedStatement => ({
  format: 'csv',
  currency: null,
  accountRef: null,
  balance: null,
  rejected: [],
  transactions: [
    { date: '2026-10-01', label: 'SALAIRE', amountCents: 215000 },
    { date: '2026-10-03', label: 'CAFÉ', amountCents: -250 },
    { date: '2026-10-03', label: 'CAFÉ', amountCents: -250 },
    { date: '2026-09-28', label: 'LOYER', amountCents: -80000 },
  ],
  ...over,
});

describe('comptes et opérations', () => {
  it('importe, puis réimporter le même relevé n’ajoute rien', async () => {
    const { db, id } = await setup();
    expect(await importStatement(db, id, statement(), 'releve.csv', clock)).toEqual({ added: 4, skipped: 0, balanceUpdated: false });
    expect(await importStatement(db, id, statement(), 'releve.csv', clock)).toEqual({ added: 0, skipped: 4, balanceUpdated: false });
    const [summary] = await listAccounts(db);
    expect(summary).toMatchObject({ transactionCount: 4, firstDate: '2026-09-28', lastDate: '2026-10-03', lastImportAt: clock.now() });
  });

  it('totaux du mois par devise, en centimes exacts', async () => {
    const { db, id } = await setup();
    await importStatement(db, id, statement(), 'r.csv', clock);
    expect(await monthTotals(db, '2026-10')).toEqual([{ currency: 'EUR', incomeCents: 215000, expenseCents: 500, count: 3 }]);
    expect(await monthTotals(db, '2026-09')).toEqual([{ currency: 'EUR', incomeCents: 0, expenseCents: 80000, count: 1 }]);
  });

  it('le solde vient du fichier et ne recule jamais vers une date plus ancienne', async () => {
    const { db, id } = await setup();
    await importStatement(db, id, statement({ balance: { cents: 123456, date: '2026-10-24' }, accountRef: '00012345678' }), 'a.ofx', clock);
    await importStatement(db, id, statement({ balance: { cents: 999, date: '2026-09-30' } }), 'b.ofx', clock);
    const [{ account }] = await listAccounts(db);
    expect(account).toMatchObject({ balance_cents: 123456, balance_date: '2026-10-24', balance_source: 'file', external_ref: '5678' });
    expect(await findAccountByRef(db, '00012345678')).toBe(id);
  });

  it('solde saisi à la main, puis effacé', async () => {
    const { db, id } = await setup();
    const base = { name: 'Compte courant', institution: 'labanquepostale' as const, kind: 'checking' as const };
    await updateAccount(db, id, { ...base, balance: { cents: 5000, date: '2026-10-25' } }, clock);
    expect((await listAccounts(db))[0].account).toMatchObject({ balance_cents: 5000, balance_source: 'manual' });
    await updateAccount(db, id, { ...base, balance: null }, clock);
    expect((await listAccounts(db))[0].account.balance_cents).toBeNull();
  });

  it('refuse un relevé vide ou dans une autre devise, sans rien écrire', async () => {
    const { db, id } = await setup();
    await expect(importStatement(db, id, statement({ transactions: [] }), 'x', clock)).rejects.toMatchObject({ code: 'import.empty' });
    await expect(importStatement(db, id, statement({ currency: 'USD' }), 'x', clock)).rejects.toMatchObject({
      code: 'import.currencyMismatch',
    });
    expect(await listTransactions(db)).toEqual([]);
  });

  it('recherche dans les libellés (caractères spéciaux neutralisés) et suppression du compte', async () => {
    const { db, id } = await setup();
    await importStatement(db, id, statement(), 'r.csv', clock);
    expect((await listTransactions(db, { search: 'caf' })).length).toBe(2);
    expect(await listTransactions(db, { search: '%' })).toEqual([]);
    await deleteAccount(db, id);
    expect(await listTransactions(db)).toEqual([]);
  });

  it('comptes et opérations sont sauvegardés et restaurés', async () => {
    const { db, id } = await setup();
    await importStatement(db, id, statement(), 'r.csv', clock);
    const { bytes, manifest } = await exportBackup(db, { appVersion: 'test', clock });
    expect(manifest.counts).toMatchObject({ account: 1, bank_transaction: 4, import_batch: 1 });
    const target = await createMemoryDatabase();
    await migrate(target);
    await restoreBackup(target, await readBackup(bytes), clock);
    expect((await listTransactions(target)).length).toBe(4);
  });
});
