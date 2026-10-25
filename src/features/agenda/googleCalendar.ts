import { PistisError } from '../../core/errors';
import { systemClock, type Clock } from '../../core/ids';
import type { Database } from '../../data/database';
import { deleteCalendar, importCalendar, listCalendars } from './agendaRepository';
import type { ParsedEvent } from './ical';

/**
 * Lecture de Google Agenda (API Calendar v3, lecture seule) et copie dans la base locale.
 * Google calcule lui-même les répétitions (`singleEvents=true`) : on stocke des occurrences simples.
 */

const API = 'https://www.googleapis.com/calendar/v3';
/** Fenêtre copiée : 2 mois en arrière, 12 mois en avant. */
const PAST_DAYS = 60;
const FUTURE_DAYS = 365;
const MAX_PAGES = 20;
export const GOOGLE_SOURCE_PREFIX = 'google:';

export interface GoogleCalendarInfo {
  id: string;
  name: string;
  primary: boolean;
}

export interface GoogleSelection {
  account: string | null;
  calendars: { id: string; name: string }[];
  lastSync: number | null;
}

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

async function getJson<T>(fetcher: Fetch, token: string, url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetcher(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new PistisError('google.network');
  }
  if (res.status === 401) throw new PistisError('google.expired');
  if (res.status === 403) throw new PistisError('google.forbidden');
  if (!res.ok) throw new PistisError('google.network', { detail: String(res.status) });
  return (await res.json()) as T;
}

export async function fetchGoogleCalendars(token: string, fetcher: Fetch = fetch): Promise<GoogleCalendarInfo[]> {
  const data = await getJson<{ items?: { id: string; summary?: string; summaryOverride?: string; primary?: boolean }[] }>(
    fetcher,
    token,
    `${API}/users/me/calendarList?minAccessRole=reader&maxResults=250`,
  );
  return (data.items ?? [])
    .map((c) => ({ id: c.id, name: (c.summaryOverride || c.summary || c.id).slice(0, 60), primary: Boolean(c.primary) }))
    .sort((a, b) => Number(b.primary) - Number(a.primary) || a.name.localeCompare(b.name));
}

interface GoogleEvent {
  id: string;
  status?: string;
  summary?: string;
  location?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}

/** Événement Google → format interne. Journée entière : minuit UTC, fin exclusive (comme l'import .ics). */
export function mapGoogleEvent(e: GoogleEvent): ParsedEvent | null {
  if (e.status === 'cancelled' || !e.start) return null;
  const allDay = Boolean(e.start.date);
  const parse = (v?: { date?: string; dateTime?: string }) => {
    if (!v) return NaN;
    if (v.date) {
      const [y, m, d] = v.date.split('-').map(Number);
      return Date.UTC(y, m - 1, d);
    }
    return v.dateTime ? Date.parse(v.dateTime) : NaN;
  };
  const start = parse(e.start);
  if (Number.isNaN(start)) return null;
  let end = parse(e.end);
  if (Number.isNaN(end) || end < start) end = allDay ? start + 86_400_000 : start;
  return {
    uid: e.id,
    recurrenceId: null,
    title: (e.summary ?? '').trim().slice(0, 200),
    location: (e.location ?? '').trim().slice(0, 300),
    allDay,
    start,
    end,
    rrule: null,
    exdates: [],
  };
}

export async function fetchGoogleEvents(token: string, calendarId: string, now: number, fetcher: Fetch = fetch): Promise<ParsedEvent[]> {
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '2500',
    timeMin: new Date(now - PAST_DAYS * 86_400_000).toISOString(),
    timeMax: new Date(now + FUTURE_DAYS * 86_400_000).toISOString(),
  });
  const events: ParsedEvent[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    if (pageToken) params.set('pageToken', pageToken);
    const data = await getJson<{ items?: GoogleEvent[]; nextPageToken?: string }>(
      fetcher,
      token,
      `${API}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
    );
    for (const item of data.items ?? []) {
      const mapped = mapGoogleEvent(item);
      if (mapped) events.push(mapped);
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return events;
}

/* ---- Choix de l'utilisateur, dans les réglages (sauvegardés avec le reste) ------------------ */

export async function getGoogleSelection(db: Database): Promise<GoogleSelection> {
  const rows = await db.all<{ key: string; value: string }>("SELECT key, value FROM settings WHERE key LIKE 'google.%'");
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  let calendars: GoogleSelection['calendars'] = [];
  try {
    const parsed = JSON.parse(map['google.calendars'] ?? '[]') as unknown;
    if (Array.isArray(parsed))
      calendars = parsed.filter((c): c is { id: string; name: string } => typeof c?.id === 'string' && typeof c?.name === 'string');
  } catch {
    calendars = [];
  }
  return {
    account: map['google.account'] || null,
    calendars,
    lastSync: map['google.lastSync'] ? Number(map['google.lastSync']) : null,
  };
}

async function setSetting(db: Database, key: string, value: string) {
  await db.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
}

export async function saveGoogleSelection(db: Database, account: string | null, calendars: { id: string; name: string }[]): Promise<void> {
  await setSetting(db, 'google.account', account ?? '');
  await setSetting(db, 'google.calendars', JSON.stringify(calendars));
  // Agendas Google décochés : leur copie locale disparaît.
  const keep = new Set(calendars.map((c) => GOOGLE_SOURCE_PREFIX + c.id));
  for (const source of await listCalendars(db)) {
    if (source.file_name.startsWith(GOOGLE_SOURCE_PREFIX) && !keep.has(source.file_name)) await deleteCalendar(db, source.id);
  }
}

/** Oublie la connexion Google et supprime les copies locales de ses agendas. */
export async function disconnectGoogle(db: Database): Promise<void> {
  await saveGoogleSelection(db, null, []);
  await db.run("DELETE FROM settings WHERE key LIKE 'google.%'");
}

export function googleSourceName(name: string): string {
  return `Google · ${name}`.slice(0, 80);
}

/** Copie les agendas choisis dans la base locale. Chaque agenda remplace entièrement sa copie précédente. */
export async function syncGoogle(
  db: Database,
  token: string,
  fetcher: Fetch = fetch,
  clock: Clock = systemClock,
): Promise<{ events: number; calendars: number }> {
  const selection = await getGoogleSelection(db);
  const now = clock.now();
  let events = 0;
  for (const cal of selection.calendars) {
    const items = await fetchGoogleEvents(token, cal.id, now, fetcher);
    await importCalendar(
      db,
      { name: cal.name, events: items, ignored: 0 },
      googleSourceName(cal.name),
      GOOGLE_SOURCE_PREFIX + cal.id,
      clock,
      true,
    );
    events += items.length;
  }
  await setSetting(db, 'google.lastSync', String(now));
  return { events, calendars: selection.calendars.length };
}
