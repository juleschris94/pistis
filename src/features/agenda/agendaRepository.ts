import { PistisError } from '../../core/errors';
import { newId, systemClock, type Clock } from '../../core/ids';
import type { Database, Statement } from '../../data/database';
import { occurrences, type ParsedCalendar } from './ical';

export interface CalendarSource {
  id: string;
  name: string;
  file_name: string;
  event_count: number;
  imported_at: number;
}

export interface AgendaItem {
  key: string;
  sourceId: string;
  sourceName: string;
  title: string;
  location: string;
  allDay: boolean;
  start: number;
  end: number;
}

/**
 * Enregistre un agenda importé. Réimporter un agenda du même nom le remplace entièrement
 * (l'export le plus récent fait foi), sans toucher aux autres agendas.
 */
export async function importCalendar(
  db: Database,
  calendar: ParsedCalendar,
  name: string,
  fileName: string,
  clock: Clock = systemClock,
): Promise<{ sourceId: string; count: number; replaced: boolean }> {
  const cleanName = name.trim().slice(0, 80);
  if (!cleanName) throw new PistisError('calendar.unreadable');
  if (!calendar.events.length) throw new PistisError('calendar.empty');
  const existing = (await db.all<{ id: string }>('SELECT id FROM calendar_source WHERE name = ?', [cleanName]))[0];
  const sourceId = existing?.id ?? newId();
  const now = clock.now();
  const statements: Statement[] = [];
  if (existing) {
    statements.push({ sql: 'DELETE FROM calendar_event WHERE source_id = ?', params: [sourceId] });
    statements.push({
      sql: 'UPDATE calendar_source SET file_name = ?, event_count = ?, imported_at = ? WHERE id = ?',
      params: [fileName.slice(0, 200), calendar.events.length, now, sourceId],
    });
  } else {
    statements.push({
      sql: 'INSERT INTO calendar_source (id, name, file_name, event_count, imported_at) VALUES (?, ?, ?, ?, ?)',
      params: [sourceId, cleanName, fileName.slice(0, 200), calendar.events.length, now],
    });
  }
  for (const e of calendar.events) {
    statements.push({
      sql: `INSERT INTO calendar_event (id, source_id, uid, recurrence_id, title, location, all_day, start_at, end_at, rrule, exdates)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        newId(),
        sourceId,
        e.uid,
        e.recurrenceId,
        e.title,
        e.location,
        e.allDay ? 1 : 0,
        e.start,
        e.end,
        e.rrule,
        JSON.stringify(e.exdates),
      ],
    });
  }
  await db.transaction(statements);
  return { sourceId, count: calendar.events.length, replaced: Boolean(existing) };
}

export async function listCalendars(db: Database): Promise<CalendarSource[]> {
  return db.all<CalendarSource & Record<string, never>>('SELECT * FROM calendar_source ORDER BY name');
}

export async function deleteCalendar(db: Database, id: string): Promise<void> {
  await db.run('DELETE FROM calendar_source WHERE id = ?', [id]);
}

interface EventRow {
  id: string;
  source_id: string;
  source_name: string;
  uid: string;
  recurrence_id: number | null;
  title: string;
  location: string;
  all_day: number;
  start_at: number;
  end_at: number;
  rrule: string | null;
  exdates: string;
}

/** Tout ce qui se passe entre `from` et `to` (instants), répétitions calculées, trié. */
export async function agendaBetween(db: Database, from: number, to: number): Promise<AgendaItem[]> {
  // Marge d'un jour : une journée entière est stockée en minuit UTC, qui peut tomber la veille en heure locale.
  const margin = 86_400_000;
  const rows = await db.all<EventRow & Record<string, never>>(
    `SELECT e.*, s.name AS source_name FROM calendar_event e JOIN calendar_source s ON s.id = e.source_id
     WHERE e.start_at < ? AND (e.rrule IS NOT NULL OR e.end_at > ?)`,
    [to + margin, from - margin],
  );
  // Occurrences modifiées : l'occurrence d'origine de l'événement répété ne doit pas apparaître en double.
  const overridden = new Map<string, Set<number>>();
  const overrides = await db.all<{ source_id: string; uid: string; recurrence_id: number }>(
    'SELECT source_id, uid, recurrence_id FROM calendar_event WHERE recurrence_id IS NOT NULL',
  );
  for (const o of overrides) {
    const k = `${o.source_id}|${o.uid}`;
    if (!overridden.has(k)) overridden.set(k, new Set());
    overridden.get(k)!.add(Number(o.recurrence_id));
  }
  const items: AgendaItem[] = [];
  for (const r of rows) {
    const allDay = r.all_day === 1;
    const skip = new Set<number>([
      ...(JSON.parse(r.exdates || '[]') as number[]),
      ...(r.recurrence_id === null ? (overridden.get(`${r.source_id}|${r.uid}`) ?? []) : []),
    ]);
    const occ = occurrences(
      { start: Number(r.start_at), end: Number(r.end_at), allDay, rrule: r.recurrence_id === null ? r.rrule : null },
      from - margin,
      to + margin,
      skip,
    );
    for (const o of occ) {
      items.push({
        key: `${r.id}:${o.start}`,
        sourceId: r.source_id,
        sourceName: r.source_name,
        title: r.title,
        location: r.location,
        allDay,
        start: o.start,
        end: o.end,
      });
    }
  }
  return items.sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start - b.start || a.title.localeCompare(b.title));
}

/** Une journée entière couvre-t-elle ce jour local (AAAA-MM-JJ) ? */
export function coversLocalDay(item: AgendaItem, localDay: string): boolean {
  if (item.allDay) {
    const from = new Date(item.start).toISOString().slice(0, 10);
    const to = new Date(item.end).toISOString().slice(0, 10);
    return localDay >= from && localDay < to;
  }
  const [y, m, d] = localDay.split('-').map(Number);
  const dayStart = new Date(y, m - 1, d).getTime();
  const dayEnd = new Date(y, m - 1, d + 1).getTime();
  return item.start < dayEnd && Math.max(item.end, item.start + 1) > dayStart;
}

/** Liens « Y aller » : ouvrent l'adresse dans l'application de cartes choisie, rien n'est envoyé par PISTIS. */
export function directionsLinks(address: string): { google: string; apple: string; waze: string } {
  const q = encodeURIComponent(address);
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
    apple: `https://maps.apple.com/?daddr=${q}`,
    waze: `https://waze.com/ul?q=${q}&navigate=yes`,
  };
}
