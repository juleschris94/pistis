import { beforeAll, describe, expect, it } from 'vitest';
import { createMemoryDatabase } from '../../data/memoryDatabase';
import { migrate } from '../../data/migrations';
import { agendaBetween, coversLocalDay, deleteCalendar, directionsLinks, importCalendar, listCalendars } from './agendaRepository';
import { parseIcs } from './ical';

beforeAll(() => {
  process.env.TZ = 'Europe/Paris';
});

const clock = { now: () => Date.UTC(2026, 9, 25, 9) };
const ICS = `BEGIN:VCALENDAR
X-WR-CALNAME:Perso
BEGIN:VEVENT
UID:sport
DTSTART;TZID=Europe/Paris:20261020T180000
DTEND;TZID=Europe/Paris:20261020T190000
RRULE:FREQ=WEEKLY;BYDAY=TU
SUMMARY:Sport
LOCATION:Salle Basic-Fit\\, Lyon
END:VEVENT
BEGIN:VEVENT
UID:sport
RECURRENCE-ID;TZID=Europe/Paris:20261027T180000
DTSTART;TZID=Europe/Paris:20261027T200000
DTEND;TZID=Europe/Paris:20261027T210000
SUMMARY:Sport (décalé)
END:VEVENT
BEGIN:VEVENT
UID:conge
DTSTART;VALUE=DATE:20261028
DTEND;VALUE=DATE:20261030
SUMMARY:Congés
END:VEVENT
END:VCALENDAR`;

async function setup() {
  const db = await createMemoryDatabase();
  await migrate(db);
  return db;
}

describe('agenda importé', () => {
  it('occurrence modifiée remplace l’occurrence d’origine ; journée entière sur deux jours', async () => {
    const db = await setup();
    await importCalendar(db, parseIcs(ICS), 'Perso', 'perso.ics', clock);
    const from = new Date(2026, 9, 26).getTime();
    const to = new Date(2026, 10, 2).getTime();
    const items = await agendaBetween(db, from, to);
    const sport = items.filter((i) => i.title.startsWith('Sport') && coversLocalDay(i, '2026-10-27'));
    expect(sport.map((i) => i.title)).toEqual(['Sport (décalé)']);
    const conge = items.find((i) => i.title === 'Congés')!;
    expect(['2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30'].map((d) => coversLocalDay(conge, d))).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });

  it('réimporter un agenda du même nom le remplace ; supprimer l’agenda supprime ses événements', async () => {
    const db = await setup();
    await importCalendar(db, parseIcs(ICS), 'Perso', 'perso.ics', clock);
    const again = await importCalendar(db, parseIcs(ICS), 'Perso', 'perso.ics', clock);
    expect(again.replaced).toBe(true);
    expect(await listCalendars(db)).toHaveLength(1);
    expect(Number((await db.all('SELECT COUNT(*) AS n FROM calendar_event'))[0].n)).toBe(3);
    await deleteCalendar(db, again.sourceId);
    expect(Number((await db.all('SELECT COUNT(*) AS n FROM calendar_event'))[0].n)).toBe(0);
  });

  it('refuse un fichier sans événement', async () => {
    const db = await setup();
    await expect(importCalendar(db, parseIcs('BEGIN:VCALENDAR\nEND:VCALENDAR'), 'Vide', 'v.ics', clock)).rejects.toMatchObject({
      code: 'calendar.empty',
    });
  });

  it('liens d’itinéraire encodés', () => {
    expect(directionsLinks('12 rue de la Paix, Paris').google).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=12%20rue%20de%20la%20Paix%2C%20Paris',
    );
  });
});
