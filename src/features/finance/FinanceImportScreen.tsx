import { CheckCircle2, FileUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../app/AppContext';
import { ROUTES } from '../../app/paths';
import { useAsync } from '../../app/useAsync';
import { ACCOUNT_KINDS, INSTITUTIONS, type AccountKind, type InstitutionId } from '../../content/institutions';
import { PistisError } from '../../core/errors';
import { PButton, PCard, PField, PFileButton, PMessage, PSelect, PTopBar } from '../../design-system/components';
import { useI18n } from '../../i18n';
import { createAccount, findAccountByRef, importStatement, listAccounts, type ImportResult } from './financeRepository';
import {
  applyCsvMapping,
  decodeStatement,
  detectCsvMapping,
  detectDelimiter,
  looksLikeOfx,
  maskAccountRef,
  parseOfx,
  splitCsv,
  statementPeriod,
  type CsvMapping,
  type DateOrder,
  type ParsedStatement,
} from './statementImport';
import { Money, useInstitutionName, useShortDate } from './ui';

const MAX_FILE = 10 * 1024 * 1024;
const NEW_ACCOUNT = '__new__';

interface Loaded {
  fileName: string;
  ofx: ParsedStatement | null;
  csvRows: string[][] | null;
}

/** Import d'un relevé : choix du fichier, vérification des colonnes, choix du compte, résultat. */
export function FinanceImportScreen() {
  const { t, tn, formatError } = useI18n();
  const { db, version, reload } = useApp();
  const navigate = useNavigate();
  const institutionName = useInstitutionName();
  const shortDate = useShortDate();
  const accounts = useAsync(() => listAccounts(db), [db, version]);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [mapping, setMapping] = useState<CsvMapping | null>(null);
  const [target, setTarget] = useState<string>(NEW_ACCOUNT);
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState<InstitutionId>('labanquepostale');
  const [kind, setKind] = useState<AccountKind>('checking');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const statement = useMemo<ParsedStatement | null>(() => {
    if (!loaded) return null;
    if (loaded.ofx) return loaded.ofx;
    return loaded.csvRows && mapping ? applyCsvMapping(loaded.csvRows, mapping) : null;
  }, [loaded, mapping]);
  const period = statement ? statementPeriod(statement.transactions) : null;

  async function onFile(file: File) {
    setError(null);
    setResult(null);
    try {
      if (file.size === 0) throw new PistisError('import.empty');
      if (file.size > MAX_FILE) throw new PistisError('import.unreadable');
      const text = decodeStatement(new Uint8Array(await file.arrayBuffer()));
      if (looksLikeOfx(text)) {
        const ofx = parseOfx(text);
        if (!ofx.transactions.length) throw new PistisError('import.empty');
        setLoaded({ fileName: file.name, ofx, csvRows: null });
        setMapping(null);
        const existing = await findAccountByRef(db, ofx.accountRef);
        setTarget(existing ?? (accounts?.length ? accounts[0].account.id : NEW_ACCOUNT));
        setName(
          maskAccountRef(ofx.accountRef)
            ? `${t('finance.account.defaultName')} ${maskAccountRef(ofx.accountRef)}`
            : t('finance.account.defaultName'),
        );
      } else {
        const rows = splitCsv(text, detectDelimiter(text));
        if (rows.length < 1) throw new PistisError('import.unreadable');
        setLoaded({ fileName: file.name, ofx: null, csvRows: rows });
        setMapping(detectCsvMapping(rows));
        setTarget(accounts?.length ? accounts[0].account.id : NEW_ACCOUNT);
        setName(t('finance.account.defaultName'));
      }
    } catch (e) {
      setLoaded(null);
      setError(formatError(e));
    }
  }

  async function onImport() {
    if (!statement || !loaded) return;
    setBusy(true);
    setError(null);
    try {
      const accountId =
        target === NEW_ACCOUNT
          ? await createAccount(db, {
              name: name.trim() || t('finance.account.defaultName'),
              institution,
              kind,
              currency: statement.currency ?? 'EUR',
            })
          : target;
      setResult(await importStatement(db, accountId, statement, loaded.fileName));
      reload();
    } catch (e) {
      setError(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <>
        <PTopBar title={t('finance.import.title')} back={ROUTES.finance} backLabel={t('common.back')} />
        <PCard>
          <div className="p-row">
            <CheckCircle2 aria-hidden="true" className="p-icon-ok" />
            <h2 className="p-heading">{tn('finance.import.added', result.added)}</h2>
          </div>
          {result.skipped > 0 && <p className="p-subtle">{tn('finance.import.skipped', result.skipped)}</p>}
          {result.balanceUpdated && <p className="p-subtle">{t('finance.import.balanceUpdated')}</p>}
          <div className="p-actions">
            <PButton onClick={() => navigate(ROUTES.finance)}>{t('finance.import.seeFinance')}</PButton>
            <PButton
              variant="secondary"
              onClick={() => {
                setResult(null);
                setLoaded(null);
              }}
            >
              {t('finance.import.another')}
            </PButton>
          </div>
        </PCard>
      </>
    );
  }

  const columns = loaded?.csvRows ? columnOptions(loaded.csvRows, mapping, t('finance.import.column')) : [];
  const setCol = (key: 'date' | 'label' | 'amount' | 'debit' | 'credit' | 'balance', value: string) =>
    setMapping((m) => (m ? { ...m, [key]: value === '' ? null : Number(value) } : m));

  return (
    <>
      <PTopBar
        title={t('finance.import.title')}
        subtitle={t('finance.import.subtitle')}
        back={ROUTES.finance}
        backLabel={t('common.back')}
      />

      <PCard title={t('finance.import.step1')}>
        <p className="p-subtle">{t('finance.import.howto')}</p>
        <ul className="p-bullets">
          <li>{t('finance.import.howto.ofx')}</li>
          <li>{t('finance.import.howto.csv')}</li>
          <li>{t('finance.import.howto.private')}</li>
        </ul>
        <div>
          <PFileButton
            id="statement"
            icon={FileUp}
            label={loaded ? t('finance.import.otherFile') : t('finance.import.choose')}
            accept=".ofx,.qfx,.csv,.txt,text/csv,application/x-ofx"
            variant={loaded ? 'secondary' : 'primary'}
            onFile={(f) => void onFile(f)}
          />
        </div>
        {loaded && <p className="p-caption">{loaded.fileName}</p>}
      </PCard>

      {error && <PMessage tone="error">{error}</PMessage>}

      {loaded && statement && (
        <>
          {mapping && (
            <PCard title={t('finance.import.columns')}>
              <p className="p-subtle">{t('finance.import.columns.body')}</p>
              <div className="p-form-grid">
                <PSelect
                  id="col-date"
                  label={t('finance.import.col.date')}
                  value={String(mapping.date)}
                  options={columns}
                  onChange={(e) => setCol('date', e.target.value)}
                />
                <PSelect
                  id="col-label"
                  label={t('finance.import.col.label')}
                  value={String(mapping.label)}
                  options={columns}
                  onChange={(e) => setCol('label', e.target.value)}
                />
                <PSelect
                  id="col-amount"
                  label={t('finance.import.col.amount')}
                  value={mapping.amount === null ? '' : String(mapping.amount)}
                  options={[{ value: '', label: t('finance.import.col.useDebitCredit') }, ...columns]}
                  onChange={(e) => setCol('amount', e.target.value)}
                />
                {mapping.amount === null && (
                  <>
                    <PSelect
                      id="col-debit"
                      label={t('finance.import.col.debit')}
                      value={mapping.debit === null ? '' : String(mapping.debit)}
                      options={[{ value: '', label: '—' }, ...columns]}
                      onChange={(e) => setCol('debit', e.target.value)}
                    />
                    <PSelect
                      id="col-credit"
                      label={t('finance.import.col.credit')}
                      value={mapping.credit === null ? '' : String(mapping.credit)}
                      options={[{ value: '', label: '—' }, ...columns]}
                      onChange={(e) => setCol('credit', e.target.value)}
                    />
                  </>
                )}
                <PSelect
                  id="col-balance"
                  label={t('finance.import.col.balance')}
                  value={mapping.balance === null ? '' : String(mapping.balance)}
                  options={[{ value: '', label: t('finance.import.col.none') }, ...columns]}
                  onChange={(e) => setCol('balance', e.target.value)}
                />
                <PSelect
                  id="col-order"
                  label={t('finance.import.col.dateOrder')}
                  value={mapping.dateOrder}
                  options={[
                    { value: 'dmy', label: t('finance.import.dateOrder.dmy') },
                    { value: 'mdy', label: t('finance.import.dateOrder.mdy') },
                  ]}
                  onChange={(e) => setMapping((m) => (m ? { ...m, dateOrder: e.target.value as DateOrder } : m))}
                />
              </div>
            </PCard>
          )}

          <PCard title={t('finance.import.preview')}>
            {statement.transactions.length === 0 ? (
              <PMessage tone="attention">{t('finance.import.nothing')}</PMessage>
            ) : (
              <>
                <p className="p-subtle">
                  {tn('finance.import.found', statement.transactions.length)}
                  {period && ` ${t('finance.import.period', { from: shortDate(period.from), to: shortDate(period.to) })}`}
                </p>
                <ul className="p-tx-list">
                  {statement.transactions.slice(0, 5).map((tx, i) => (
                    <li key={i} className="p-tx">
                      <span className="p-tx__text">
                        <span className="p-tx__label">{tx.label || t('finance.transactions.noLabel')}</span>
                        <span className="p-caption">{shortDate(tx.date)}</span>
                      </span>
                      <Money cents={tx.amountCents} currency={statement.currency ?? 'EUR'} signed />
                    </li>
                  ))}
                </ul>
                {statement.balance && (
                  <p className="p-caption">
                    {t('finance.import.fileBalance', { date: shortDate(statement.balance.date) })}{' '}
                    <Money cents={statement.balance.cents} currency={statement.currency ?? 'EUR'} />
                  </p>
                )}
              </>
            )}
            {statement.rejected.length > 0 && (
              <PMessage tone="attention">{tn('finance.import.rejected', statement.rejected.length)}</PMessage>
            )}
          </PCard>

          <PCard title={t('finance.import.account')}>
            <PSelect
              id="target-account"
              label={t('finance.import.account.label')}
              value={target}
              options={[
                ...(accounts ?? []).map(({ account }) => ({
                  value: account.id,
                  label: `${account.name} · ${institutionName(account.institution)}`,
                })),
                { value: NEW_ACCOUNT, label: t('finance.import.account.new') },
              ]}
              onChange={(e) => setTarget(e.target.value)}
            />
            {target === NEW_ACCOUNT && (
              <div className="p-form-grid">
                <PField
                  id="account-name"
                  label={t('finance.account.name')}
                  value={name}
                  maxLength={80}
                  onChange={(e) => setName(e.target.value)}
                />
                <PSelect
                  id="account-institution"
                  label={t('finance.account.institution')}
                  value={institution}
                  options={INSTITUTIONS.map((i) => ({ value: i.id, label: i.name || t('finance.institution.other') }))}
                  onChange={(e) => setInstitution(e.target.value as InstitutionId)}
                />
                <PSelect
                  id="account-kind"
                  label={t('finance.account.kind')}
                  value={kind}
                  options={ACCOUNT_KINDS.map((k) => ({ value: k, label: t(`finance.kind.${k}`) }))}
                  onChange={(e) => setKind(e.target.value as AccountKind)}
                />
              </div>
            )}
            <div>
              <PButton onClick={() => void onImport()} disabled={busy || statement.transactions.length === 0}>
                {busy ? t('common.saving') : tn('finance.import.confirm', statement.transactions.length)}
              </PButton>
            </div>
          </PCard>
        </>
      )}
    </>
  );
}

/** Options « Colonne 3 · Montant (ex. -12,30) » pour corriger le choix automatique. */
function columnOptions(rows: string[][], mapping: CsvMapping | null, columnWord: string) {
  const header = mapping?.header !== null && mapping?.header !== undefined ? rows[mapping.header] : null;
  const sample = rows[(mapping?.header ?? -1) + 1] ?? [];
  const width = Math.max(...rows.map((r) => r.length));
  return Array.from({ length: width }, (_, i) => {
    const title = header?.[i] || `${columnWord} ${i + 1}`;
    const example = sample[i] ? ` (${sample[i].slice(0, 24)})` : '';
    return { value: String(i), label: `${title}${example}` };
  });
}
