import { beforeAll, describe, expect, it } from 'vitest';
import { occurrences, parseIcs, wallTimeToUtc } from './ical';

beforeAll(() => {
  process.env.TZ = 'Europe/Paris';
});

const wrap = (body: string, extra = '') => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${extra}${body}END:VCALENDAR\r\n`;
const iso = (ms: number) => new Date(ms).toISOString();

describe('lecture .ics', () => {
  it('nom de l’agenda, lignes repliées, texte échappé, alarmes ignorées', () => {
    const cal = parseIcs(
      wrap(
        'BEGIN:VEVENT\r\nUID:1\r\nDTSTART:20261026T080000Z\r\nDTEND:20261026T090000Z\r\nSUMMARY:Réunion d\\, équipe\r\n  projet\r\nLOCATION:12 rue de la Paix\\, Paris\r\nBEGIN:VALARM\r\nSUMMARY:Rappel\r\nEND:VALARM\r\nEND:VEVENT\r\n',
        'X-WR-CALNAME:Travail\r\n',
      ),
    );
    expect(cal.name).toBe('Travail');
    expect(cal.events[0]).toMatchObject({
      uid: '1',
      title: 'Réunion d, équipe projet',
      location: '12 rue de la Paix, Paris',
      allDay: false,
    });
    expect(iso(cal.events[0].start)).toBe('2026-10-26T08:00:00.000Z');
  });

  it('fuseau IANA et fuseau Windows d’Outlook, de part et d’autre du changement d’heure', () => {
    const cal = parseIcs(
      wrap(
        'BEGIN:VEVENT\r\nUID:a\r\nDTSTART;TZID=Europe/Paris:20261024T090000\r\nDURATION:PT1H30M\r\nSUMMARY:Été\r\nEND:VEVENT\r\n' +
          'BEGIN:VEVENT\r\nUID:b\r\nDTSTART;TZID=Romance Standard Time:20261026T090000\r\nDTEND;TZID=Romance Standard Time:20261026T100000\r\nSUMMARY:Hiver\r\nEND:VEVENT\r\n',
      ),
    );
    expect(iso(cal.events[0].start)).toBe('2026-10-24T07:00:00.000Z'); // UTC+2
    expect(cal.events[0].end - cal.events[0].start).toBe(90 * 60_000);
    expect(iso(cal.events[1].start)).toBe('2026-10-26T08:00:00.000Z'); // UTC+1
  });

  it('journée entière, événement annulé ignoré, ligne illisible ignorée', () => {
    const cal = parseIcs(
      wrap(
        'BEGIN:VEVENT\r\nUID:d\r\nDTSTART;VALUE=DATE:20261101\r\nSUMMARY:Toussaint\r\nEND:VEVENT\r\n' +
          'BEGIN:VEVENT\r\nUID:x\r\nSTATUS:CANCELLED\r\nDTSTART:20261101T100000Z\r\nEND:VEVENT\r\n' +
          'BEGIN:VEVENT\r\nUID:y\r\nDTSTART:pas-une-date\r\nEND:VEVENT\r\n',
      ),
    );
    expect(cal.events).toHaveLength(1);
    expect(cal.events[0]).toMatchObject({ allDay: true, start: Date.UTC(2026, 10, 1), end: Date.UTC(2026, 10, 2) });
    expect(cal.ignored).toBe(2);
  });

  it('un fichier qui n’est pas un agenda ne donne rien', () => {
    expect(parseIcs('Date;Libellé\n01/01/2026;x')).toEqual({ name: null, events: [], ignored: 0 });
  });

  it('heure murale → UTC', () => {
    expect(iso(wallTimeToUtc(2026, 3, 29, 12, 0, 0, 'Europe/Paris'))).toBe('2026-03-29T10:00:00.000Z');
    expect(iso(wallTimeToUtc(2026, 1, 15, 12, 0, 0, 'America/New_York'))).toBe('2026-01-15T17:00:00.000Z');
  });
});

describe('répétitions', () => {
  const week = (from: string, days = 7) => [Date.parse(from), Date.parse(from) + days * 86_400_000] as const;

  it('hebdomadaire mardi et jeudi : l’heure locale reste la même après le changement d’heure', () => {
    const start = wallTimeToUtc(2026, 10, 20, 18, 0, 0, 'Europe/Paris');
    const ev = { start, end: start + 3_600_000, allDay: false, rrule: 'FREQ=WEEKLY;BYDAY=TU,TH' };
    const [from, to] = week('2026-10-26T00:00:00+01:00');
    const occ = occurrences(ev, from, to).map((o) => iso(o.start));
    expect(occ).toEqual(['2026-10-27T17:00:00.000Z', '2026-10-29T17:00:00.000Z']); // 18 h à Paris (UTC+1)
  });

  it('COUNT, UNTIL, INTERVAL et dates exclues', () => {
    const start = Date.UTC(2026, 9, 1, 8);
    const daily = { start, end: start + 1, allDay: false, rrule: 'FREQ=DAILY;COUNT=3' };
    expect(occurrences(daily, start, start + 10 * 86_400_000)).toHaveLength(3);
    const until = { ...daily, rrule: 'FREQ=DAILY;INTERVAL=2;UNTIL=20261007T235959Z' };
    expect(occurrences(until, start, start + 30 * 86_400_000).map((o) => new Date(o.start).getUTCDate())).toEqual([1, 3, 5, 7]);
    const skip = new Set([start + 2 * 86_400_000]);
    expect(occurrences(daily, start, start + 10 * 86_400_000, skip)).toHaveLength(2);
  });

  it('mensuelle : le dernier vendredi, et le 31 sauté quand le mois est plus court', () => {
    const lastFriday = { start: Date.UTC(2026, 0, 30), end: Date.UTC(2026, 0, 31), allDay: true, rrule: 'FREQ=MONTHLY;BYDAY=-1FR' };
    const feb = occurrences(lastFriday, Date.UTC(2026, 1, 1), Date.UTC(2026, 2, 1));
    expect(feb.map((o) => new Date(o.start).getUTCDate())).toEqual([27]);
    const the31st = { start: Date.UTC(2026, 0, 31), end: Date.UTC(2026, 1, 1), allDay: true, rrule: 'FREQ=MONTHLY' };
    const months = occurrences(the31st, Date.UTC(2026, 0, 1), Date.UTC(2026, 5, 1)).map((o) => new Date(o.start).getUTCMonth());
    expect(months).toEqual([0, 2, 4]); // janvier, mars, mai
  });

  it('anniversaire annuel, depuis une date ancienne', () => {
    const birthday = { start: Date.UTC(1995, 2, 12), end: Date.UTC(1995, 2, 13), allDay: true, rrule: 'FREQ=YEARLY' };
    const occ = occurrences(birthday, Date.UTC(2027, 0, 1), Date.UTC(2028, 0, 1));
    expect(occ.map((o) => new Date(o.start).toISOString().slice(0, 10))).toEqual(['2027-03-12']);
  });
});
