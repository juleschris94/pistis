import { ChevronLeft, ChevronRight, Plug, Upload, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useApp } from '../../app/AppContext';
import { accountPath, ROUTES, transactionsPath } from '../../app/paths';
import { useAsync } from '../../app/useAsync';
import { PButtonLink, PCard, PEmpty, PIconButton, PList, PListRow, PTopBar } from '../../design-system/components';
import { useI18n } from '../../i18n';
import { listAccounts, listTransactions, monthTotals } from './financeRepository';
import { KIND_COLORS, KIND_ICONS, Money, useInstitutionName, useMonthTools, useShortDate } from './ui';

/** Onglet Finances : le mois en cours, les comptes et leurs soldes déclarés, les dernières opérations. */
export function FinanceScreen() {
  const { t, tn } = useI18n();
  const { db, version } = useApp();
  const months = useMonthTools();
  const shortDate = useShortDate();
  const institution = useInstitutionName();
  const [month, setMonth] = useState(months.current);
  const data = useAsync(
    async () => ({
      accounts: await listAccounts(db),
      totals: await monthTotals(db, month),
      recent: await listTransactions(db, { limit: 8 }),
    }),
    [db, version, month],
  );

  const importButton = (
    <PButtonLink to={ROUTES.financeImport}>
      <Upload aria-hidden="true" />
      {t('finance.import')}
    </PButtonLink>
  );

  if (data && data.accounts.length === 0) {
    return (
      <>
        <PTopBar title={t('nav.finance')} subtitle={t('finance.subtitle')} />
        <PCard>
          <PEmpty icon={Wallet} title={t('finance.empty.title')}>
            <p className="p-subtle">{t('finance.empty.body')}</p>
            <div className="p-actions">{importButton}</div>
          </PEmpty>
        </PCard>
        <ConnectorsTeaser />
      </>
    );
  }

  return (
    <>
      <PTopBar title={t('nav.finance')} subtitle={t('finance.subtitle')} actions={importButton} />

      <PCard variant="accent">
        <div className="p-month">
          <PIconButton icon={ChevronLeft} label={t('finance.month.previous')} onClick={() => setMonth((m) => months.shift(m, -1))} plain />
          <h2 className="p-heading p-month__label">{months.label(month)}</h2>
          <PIconButton icon={ChevronRight} label={t('finance.month.next')} onClick={() => setMonth((m) => months.shift(m, 1))} plain />
        </div>
        {!data ? (
          <p className="p-subtle">{t('common.loading')}</p>
        ) : data.totals.length === 0 ? (
          <p className="p-subtle">{t('finance.month.empty')}</p>
        ) : (
          data.totals.map((tot) => (
            <div key={tot.currency} className="p-totals">
              <div>
                <span className="p-caption">{t('finance.month.income')}</span>
                <Money cents={tot.incomeCents} currency={tot.currency} strong />
              </div>
              <div>
                <span className="p-caption">{t('finance.month.expense')}</span>
                <Money cents={-tot.expenseCents} currency={tot.currency} strong />
              </div>
              <div>
                <span className="p-caption">{t('finance.month.net')}</span>
                <Money cents={tot.incomeCents - tot.expenseCents} currency={tot.currency} signed strong />
              </div>
            </div>
          ))
        )}
        {data && data.totals.length > 0 && (
          <p className="p-caption">
            {tn(
              'finance.month.basis',
              data.totals.reduce((s, x) => s + x.count, 0),
            )}{' '}
            {t('finance.month.transfers')}
          </p>
        )}
      </PCard>

      <section className="p-stack p-stack--tight" aria-labelledby="finance-accounts">
        <h2 className="p-subheading" id="finance-accounts">
          {t('finance.accounts')}
        </h2>
        <PList>
          {(data?.accounts ?? []).map(({ account, lastImportAt }) => (
            <PListRow
              key={account.id}
              icon={KIND_ICONS[account.kind]}
              color={KIND_COLORS[account.kind]}
              title={account.name}
              subtitle={[
                institution(account.institution),
                account.external_ref ? `••${account.external_ref}` : null,
                lastImportAt
                  ? t('finance.account.importedOn', { date: shortDate(new Date(lastImportAt).toISOString().slice(0, 10)) })
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              to={accountPath(account.id)}
              trailing={
                <span className="p-balance">
                  {account.balance_cents === null ? (
                    <span className="p-caption">{t('finance.balance.unknown')}</span>
                  ) : (
                    <>
                      <Money cents={account.balance_cents} currency={account.currency} strong />
                      <span className="p-caption">{t('finance.balance.asOf', { date: shortDate(account.balance_date!) })}</span>
                    </>
                  )}
                </span>
              }
            />
          ))}
        </PList>
      </section>

      <PCard
        title={t('finance.recent')}
        action={
          <Link to={transactionsPath()} className="p-link">
            {t('finance.seeAll')}
          </Link>
        }
      >
        <TransactionList items={data?.recent ?? []} showAccount />
      </PCard>

      <ConnectorsTeaser />
    </>
  );
}

export function TransactionList({
  items,
  showAccount = false,
}: {
  items: { id: string; date: string; label: string; amount_cents: number; currency: string; account_name: string }[];
  showAccount?: boolean;
}) {
  const { t } = useI18n();
  const shortDate = useShortDate();
  if (!items.length) return <p className="p-subtle">{t('finance.transactions.none')}</p>;
  return (
    <ul className="p-tx-list">
      {items.map((tx) => (
        <li key={tx.id} className="p-tx">
          <span className="p-tx__text">
            <span className="p-tx__label">{tx.label || t('finance.transactions.noLabel')}</span>
            <span className="p-caption">{[shortDate(tx.date), showAccount ? tx.account_name : null].filter(Boolean).join(' · ')}</span>
          </span>
          <Money cents={tx.amount_cents} currency={tx.currency} signed />
        </li>
      ))}
    </ul>
  );
}

/** Rappel honnête : la connexion automatique aux banques arrive, sans jamais demander tes codes ici. */
function ConnectorsTeaser() {
  const { t } = useI18n();
  return (
    <PList>
      <PListRow
        icon={Plug}
        color="var(--cat-admin)"
        title={t('finance.connectors.title')}
        subtitle={t('finance.connectors.body')}
        to={ROUTES.connectors}
      />
    </PList>
  );
}
