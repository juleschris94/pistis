import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { useApp } from '../../app/AppContext';
import { ROUTES, transactionsPath } from '../../app/paths';
import { useAsync } from '../../app/useAsync';
import { ACCOUNT_KINDS, INSTITUTIONS, type AccountKind, type InstitutionId } from '../../content/institutions';
import { toLocalDate } from '../../core/localDate';
import { parseAmountToCents } from '../../domain/money';
import { PButton, PButtonLink, PCard, PField, PMessage, PSelect, PTopBar } from '../../design-system/components';
import { useI18n } from '../../i18n';
import { deleteAccount, listAccounts, updateAccount, type AccountSummary } from './financeRepository';
import { Money, useShortDate } from './ui';

/** Réglages d'un compte : nom, banque, type, solde saisi à la main, suppression. */
export function AccountScreen() {
  const { id = '' } = useParams();
  const { db, version } = useApp();
  const summary = useAsync(async () => (await listAccounts(db)).find((s) => s.account.id === id) ?? null, [db, version, id]);
  if (summary === undefined) return null;
  if (summary === null) return <Navigate to={ROUTES.finance} replace />;
  return <AccountForm key={summary.account.updated_at} summary={summary} />;
}

function AccountForm({ summary }: { summary: AccountSummary }) {
  const { t, tn, formatError, formatNumber } = useI18n();
  const { db, reload } = useApp();
  const navigate = useNavigate();
  const shortDate = useShortDate();
  const { account } = summary;
  const [name, setName] = useState(account.name);
  const [institution, setInstitution] = useState<InstitutionId>(account.institution);
  const [kind, setKind] = useState<AccountKind>(account.kind);
  const initialBalance =
    account.balance_source === 'manual' && account.balance_cents !== null
      ? formatNumber(account.balance_cents / 100, { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false })
      : '';
  const [balance, setBalance] = useState(initialBalance);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save() {
    setMessage(null);
    try {
      // Champ vidé : on efface le solde saisi à la main (celui d'un relevé, lui, n'est pas touché).
      let nextBalance: { cents: number; date: string } | null | undefined = account.balance_source === 'manual' ? null : undefined;
      if (balance === initialBalance) nextBalance = undefined;
      else if (balance.trim()) {
        const cents = parseAmountToCents(balance);
        if (cents === null) return setMessage({ tone: 'error', text: t('finance.account.balance.invalid') });
        nextBalance = { cents, date: toLocalDate(new Date()) };
      }
      await updateAccount(db, account.id, { name, institution, kind, balance: nextBalance });
      reload();
      setMessage({ tone: 'ok', text: t('finance.account.saved') });
    } catch (e) {
      setMessage({ tone: 'error', text: formatError(e) });
    }
  }

  return (
    <>
      <PTopBar title={account.name} back={ROUTES.finance} backLabel={t('common.back')} />
      <PCard>
        <p className="p-subtle">
          {tn('finance.account.count', summary.transactionCount)}
          {summary.firstDate &&
            summary.lastDate &&
            ` ${t('finance.import.period', { from: shortDate(summary.firstDate), to: shortDate(summary.lastDate) })}`}
        </p>
        {account.balance_cents !== null ? (
          <p className="p-meta">
            <span>
              {t(account.balance_source === 'file' ? 'finance.balance.fromFile' : 'finance.balance.manual', {
                date: shortDate(account.balance_date!),
              })}
            </span>
            <Money cents={account.balance_cents} currency={account.currency} strong />
          </p>
        ) : (
          <p className="p-caption">{t('finance.balance.unknownLong')}</p>
        )}
        <div>
          <PButtonLink to={transactionsPath(account.id)} variant="secondary">
            {t('finance.account.transactions')}
          </PButtonLink>
        </div>
      </PCard>

      <PCard title={t('finance.account.settings')}>
        <PField id="acc-name" label={t('finance.account.name')} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        <PSelect
          id="acc-institution"
          label={t('finance.account.institution')}
          value={institution}
          options={INSTITUTIONS.map((i) => ({ value: i.id, label: i.name || t('finance.institution.other') }))}
          onChange={(e) => setInstitution(e.target.value as InstitutionId)}
        />
        <PSelect
          id="acc-kind"
          label={t('finance.account.kind')}
          value={kind}
          options={ACCOUNT_KINDS.map((k) => ({ value: k, label: t(`finance.kind.${k}`) }))}
          onChange={(e) => setKind(e.target.value as AccountKind)}
        />
        <PField
          id="acc-balance"
          label={t('finance.account.balance')}
          hint={t('finance.account.balance.hint')}
          inputMode="decimal"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
        />
        {message && <PMessage tone={message.tone}>{message.text}</PMessage>}
        <div className="p-actions">
          <PButton onClick={() => void save()}>{t('common.save')}</PButton>
        </div>
      </PCard>

      <PCard title={t('finance.account.delete')}>
        <p className="p-subtle">{tn('finance.account.delete.body', summary.transactionCount)}</p>
        {confirmDelete ? (
          <div className="p-actions">
            <PButton
              variant="danger"
              onClick={() =>
                void deleteAccount(db, account.id).then(() => {
                  reload();
                  navigate(ROUTES.finance, { replace: true });
                })
              }
            >
              {t('finance.account.delete.confirm')}
            </PButton>
            <PButton variant="ghost" onClick={() => setConfirmDelete(false)}>
              {t('common.cancel')}
            </PButton>
          </div>
        ) : (
          <div>
            <PButton variant="secondary" onClick={() => setConfirmDelete(true)}>
              {t('finance.account.delete')}
            </PButton>
          </div>
        )}
      </PCard>
    </>
  );
}
