import { CalendarDays, ExternalLink, LogIn, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '../../app/AppContext';
import { ROUTES } from '../../app/paths';
import { useAsync } from '../../app/useAsync';
import { isPistisError } from '../../core/errors';
import { PButton, PCard, PChip, PEmpty, PMessage, PTopBar } from '../../design-system/components';
import { useI18n } from '../../i18n';
import { currentGoogleToken, forgetGoogleToken, googleAvailable, startGoogleAuth, takeGoogleAuthResult } from './googleAuth';
import {
  disconnectGoogle,
  fetchGoogleCalendars,
  getGoogleSelection,
  saveGoogleSelection,
  syncGoogle,
  type GoogleCalendarInfo,
} from './googleCalendar';

type Message = { tone: 'ok' | 'error' | 'info'; text: string } | null;

/** Profil → Connecteurs → Google Agenda : connexion, choix des agendas, synchronisation. */
export function GoogleCalendarScreen() {
  const { t, tn, formatDate, formatError } = useI18n();
  const { db, version, reload } = useApp();
  const selection = useAsync(() => getGoogleSelection(db), [db, version]);
  const [token, setToken] = useState(() => currentGoogleToken());
  const [calendars, setCalendars] = useState<GoogleCalendarInfo[] | null>(null);
  const [chosen, setChosen] = useState<Set<string> | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(() => {
    const result = takeGoogleAuthResult();
    if (!result) return null;
    return result.ok
      ? { tone: 'ok', text: t('google.connected') }
      : { tone: 'error', text: t(result.error === 'access_denied' ? 'google.denied' : 'google.failed') };
  });

  // Liste des agendas du compte, dès qu'on a une autorisation valable.
  useEffect(() => {
    if (!token) return;
    let alive = true;
    fetchGoogleCalendars(token.accessToken).then(
      (list) => alive && setCalendars(list),
      (e: unknown) => {
        if (!alive) return;
        if (isPistisError(e) && e.code === 'google.expired') {
          forgetGoogleToken();
          setToken(null);
        } else setMessage({ tone: 'error', text: formatError(e) });
      },
    );
    return () => {
      alive = false;
    };
  }, [token, formatError]);

  // Par défaut : les agendas déjà choisis, sinon l'agenda principal du compte.
  const selected =
    chosen ??
    new Set(
      selection?.calendars.length ? selection.calendars.map((c) => c.id) : (calendars ?? []).filter((c) => c.primary).map((c) => c.id),
    );

  async function saveAndSync() {
    if (!token || !calendars) return;
    setBusy(true);
    setMessage(null);
    try {
      const primary = calendars.find((c) => c.primary);
      await saveGoogleSelection(
        db,
        primary?.id ?? null,
        calendars.filter((c) => selected.has(c.id)).map((c) => ({ id: c.id, name: c.name })),
      );
      const res = await syncGoogle(db, token.accessToken);
      setChosen(null);
      reload();
      setMessage({ tone: 'ok', text: tn('google.synced', res.events, { calendars: res.calendars }) });
    } catch (e) {
      if (isPistisError(e) && e.code === 'google.expired') {
        forgetGoogleToken();
        setToken(null);
      }
      setMessage({ tone: 'error', text: formatError(e) });
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    await disconnectGoogle(db);
    forgetGoogleToken();
    setToken(null);
    setCalendars(null);
    setChosen(null);
    reload();
    setMessage({ tone: 'info', text: t('google.disconnected') });
  }

  const header = <PTopBar title="Google Agenda" subtitle={t('google.subtitle')} back={ROUTES.connectors} backLabel={t('common.back')} />;

  if (!googleAvailable()) {
    return (
      <>
        {header}
        <PCard>
          <PEmpty icon={CalendarDays} title={t(import.meta.env.MODE === 'hosted' ? 'google.hosted.title' : 'google.notConfigured.title')}>
            <p className="p-subtle">{t(import.meta.env.MODE === 'hosted' ? 'google.hosted.body' : 'google.notConfigured.body')}</p>
          </PEmpty>
        </PCard>
      </>
    );
  }

  return (
    <>
      {header}
      {message && <PMessage tone={message.tone}>{message.text}</PMessage>}

      <PCard title={t('google.status')}>
        {selection?.account && <p className="p-subtle">{t('google.account', { account: selection.account })}</p>}
        {selection?.lastSync ? (
          <p className="p-caption">
            {t('google.lastSync', {
              date: formatDate(selection.lastSync, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
            })}
          </p>
        ) : (
          <p className="p-subtle">{t('google.intro')}</p>
        )}
        {!token && (
          <div className="p-actions">
            <PButton icon={LogIn} onClick={() => startGoogleAuth(false)}>
              {selection?.calendars.length ? t('google.reconnect') : t('google.connect')}
            </PButton>
          </div>
        )}
        <ul className="p-bullets">
          <li>{t('google.privacy.readonly')}</li>
          <li>{t('google.privacy.local')}</li>
          <li>{t('google.privacy.session')}</li>
        </ul>
      </PCard>

      {token && (
        <PCard title={t('google.calendars')}>
          {!calendars ? (
            <p className="p-subtle">{t('common.loading')}</p>
          ) : (
            <>
              <div className="p-chips" role="group" aria-label={t('google.calendars')}>
                {calendars.map((c) => (
                  <PChip
                    key={c.id}
                    icon={CalendarDays}
                    selected={selected.has(c.id)}
                    onClick={() => {
                      const next = new Set(selected);
                      if (next.has(c.id)) next.delete(c.id);
                      else next.add(c.id);
                      setChosen(next);
                    }}
                  >
                    {c.name}
                  </PChip>
                ))}
              </div>
              <p className="p-caption">{t('google.window')}</p>
              <div className="p-actions">
                <PButton icon={RefreshCw} onClick={() => void saveAndSync()} disabled={busy}>
                  {busy ? t('google.syncing') : t('google.syncNow')}
                </PButton>
              </div>
            </>
          )}
        </PCard>
      )}

      {(selection?.calendars.length || token) && (
        <PCard title={t('google.disconnect')}>
          <p className="p-subtle">{t('google.disconnect.body')}</p>
          <div className="p-actions">
            <PButton variant="secondary" onClick={() => void disconnect()}>
              {t('google.disconnect')}
            </PButton>
            <a className="p-link" href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">
              {t('google.revoke')} <ExternalLink aria-hidden="true" size={14} />
            </a>
          </div>
        </PCard>
      )}
    </>
  );
}
