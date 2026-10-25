import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useApp } from '../../app/AppContext';
import { ROUTES } from '../../app/paths';
import { useAsync } from '../../app/useAsync';
import { PCard, PField, PIconButton, PSelect, PTopBar } from '../../design-system/components';
import { useI18n } from '../../i18n';
import { TransactionList } from './FinanceScreen';
import { listAccounts, listTransactions, monthTotals } from './financeRepository';
import { Money, useMonthTools } from './ui';

/** Toutes les opérations, par mois, avec filtre par compte et recherche dans les libellés. */
export function TransactionsScreen() {
  const { t, tn } = useI18n();
  const { db, version } = useApp();
  const months = useMonthTools();
  const [params, setParams] = useSearchParams();
  const accountId = params.get('compte') ?? '';
  const [month, setMonth] = useState(months.current);
  const [search, setSearch] = useState('');
  const accounts = useAsync(() => listAccounts(db), [db, version]);
  const data = useAsync(async () => {
    const [y, m] = month.split('-').map(Number);
    const last = new Date(y, m, 0).getDate();
    return {
      items: await listTransactions(db, {
        accountId: accountId || undefined,
        from: search ? undefined : `${month}-01`,
        to: search ? undefined : `${month}-${String(last).padStart(2, '0')}`,
        search,
        limit: 1000,
      }),
      totals: await monthTotals(db, month, accountId || undefined),
    };
  }, [db, version, month, accountId, search]);

  return (
    <>
      <PTopBar title={t('finance.transactions.title')} back={ROUTES.finance} backLabel={t('common.back')} />
      <div className="p-form-grid">
        <PSelect
          id="tx-account"
          label={t('finance.transactions.account')}
          value={accountId}
          options={[
            { value: '', label: t('finance.transactions.allAccounts') },
            ...(accounts ?? []).map(({ account }) => ({ value: account.id, label: account.name })),
          ]}
          onChange={(e) => setParams(e.target.value ? { compte: e.target.value } : {}, { replace: true })}
        />
        <PField
          id="tx-search"
          type="search"
          label={t('finance.transactions.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <PCard>
        {!search && (
          <div className="p-month">
            <PIconButton
              icon={ChevronLeft}
              label={t('finance.month.previous')}
              onClick={() => setMonth((m) => months.shift(m, -1))}
              plain
            />
            <h2 className="p-heading p-month__label">{months.label(month)}</h2>
            <PIconButton icon={ChevronRight} label={t('finance.month.next')} onClick={() => setMonth((m) => months.shift(m, 1))} plain />
          </div>
        )}
        {!search &&
          data?.totals.map((tot) => (
            <p key={tot.currency} className="p-meta">
              <span>
                {t('finance.month.income')} <Money cents={tot.incomeCents} currency={tot.currency} />
              </span>
              <span>
                {t('finance.month.expense')} <Money cents={-tot.expenseCents} currency={tot.currency} />
              </span>
            </p>
          ))}
        {search && data && <p className="p-subtle">{tn('finance.transactions.found', data.items.length)}</p>}
        <TransactionList items={data?.items ?? []} showAccount={!accountId} />
      </PCard>
    </>
  );
}
