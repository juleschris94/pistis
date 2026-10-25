/**
 * Lecture des agendas au format iCalendar (.ics), exportés depuis Google Agenda, Outlook, Apple Calendrier…
 * Tout se passe dans l'appareil. Pris en charge : événements datés ou sur la journée, fuseaux horaires
 * (noms IANA et noms Windows d'Outlook), répétitions courantes (quotidienne, hebdomadaire, mensuelle,
 * annuelle, avec intervalle, nombre, date de fin, jours), dates exclues et occurrences modifiées.
 */

export interface ParsedEvent {
  uid: string;
  /** Occurrence modifiée d'un événement répété : instant de l'occurrence d'origine. */
  recurrenceId: number | null;
  title: string;
  location: string;
  allDay: boolean;
  /** Événement daté : instant UTC (ms). Journée entière : minuit UTC du jour (ms), fin exclusive. */
  start: number;
  end: number;
  rrule: string | null;
  exdates: number[];
}

export interface ParsedCalendar {
  name: string | null;
  events: ParsedEvent[];
  /** Événements ignorés (annulés ou illisibles). */
  ignored: number;
}

interface Prop {
  name: string;
  params: Record<string, string>;
  value: string;
}

/** Lignes « repliées » (suite commençant par un espace ou une tabulation) remises bout à bout. */
function unfold(text: string): string[] {
  return text
    .replace(/\r\n[ \t]/g, '')
    .replace(/\n[ \t]/g, '')
    .split(/\r?\n/);
}

function parseLine(line: string): Prop | null {
  // Le premier « : » hors guillemets sépare le nom et ses paramètres de la valeur.
  let quoted = false;
  let colon = -1;
  for (let i = 0; i < line.length; i += 1) {
    if (line[i] === '"') quoted = !quoted;
    else if (line[i] === ':' && !quoted) {
      colon = i;
      break;
    }
  }
  if (colon < 0) return null;
  const [name, ...rawParams] = line.slice(0, colon).split(';');
  const params: Record<string, string> = {};
  for (const p of rawParams) {
    const eq = p.indexOf('=');
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return { name: name.toUpperCase(), params, value: line.slice(colon + 1) };
}

function unescapeText(s: string): string {
  return s.replace(/\\([\\;,nN])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c));
}

/* ---- Fuseaux horaires ---------------------------------------------------------------- */

/** Noms Windows fréquents dans les exports Outlook. */
const WINDOWS_ZONES: Record<string, string> = {
  'Romance Standard Time': 'Europe/Paris',
  'W. Europe Standard Time': 'Europe/Berlin',
  'Central Europe Standard Time': 'Europe/Budapest',
  'Central European Standard Time': 'Europe/Warsaw',
  'GMT Standard Time': 'Europe/London',
  'Greenwich Standard Time': 'Atlantic/Reykjavik',
  UTC: 'UTC',
  'Eastern Standard Time': 'America/New_York',
  'Pacific Standard Time': 'America/Los_Angeles',
  'Morocco Standard Time': 'Africa/Casablanca',
  'W. Central Africa Standard Time': 'Africa/Lagos',
};

const formatters = new Map<string, Intl.DateTimeFormat | null>();
function formatterFor(zone: string): Intl.DateTimeFormat | null {
  if (!formatters.has(zone)) {
    try {
      formatters.set(
        zone,
        new Intl.DateTimeFormat('en-US', {
          timeZone: zone,
          hourCycle: 'h23',
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
        }),
      );
    } catch {
      formatters.set(zone, null);
    }
  }
  return formatters.get(zone) ?? null;
}

/** Décalage (ms) du fuseau `zone` à l'instant `utc`. */
function zoneOffset(utc: number, f: Intl.DateTimeFormat): number {
  const parts = Object.fromEntries(f.formatToParts(new Date(utc)).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
  return asUtc - Math.floor(utc / 1000) * 1000;
}

/** Heure « murale » d'un fuseau → instant UTC. Fuseau inconnu : heure locale de l'appareil. */
export function wallTimeToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, zone: string | null): number {
  const name = zone ? (WINDOWS_ZONES[zone] ?? zone) : null;
  const f = name ? formatterFor(name) : null;
  if (!f) return new Date(y, mo - 1, d, h, mi, s).getTime();
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  const first = guess - zoneOffset(guess, f);
  return guess - zoneOffset(first, f);
}

interface DateValue {
  allDay: boolean;
  ms: number;
}

/** DTSTART / DTEND / EXDATE / RECURRENCE-ID → instant. */
function parseDateValue(value: string, params: Record<string, string>): DateValue | null {
  const m = value.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  if (m[4] === undefined || params.VALUE === 'DATE') return { allDay: true, ms: Date.UTC(y, mo - 1, d) };
  const [h, mi, s] = [+m[4], +m[5], +(m[6] ?? 0)];
  if (m[7]) return { allDay: false, ms: Date.UTC(y, mo - 1, d, h, mi, s) };
  return { allDay: false, ms: wallTimeToUtc(y, mo, d, h, mi, s, params.TZID ?? null) };
}

/** « PT1H30M », « P1D », « -PT15M » → millisecondes. */
function parseDuration(value: string): number | null {
  const m = value.match(/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return null;
  const ms = ((+(m[2] ?? 0) * 7 + +(m[3] ?? 0)) * 24 * 3600 + +(m[4] ?? 0) * 3600 + +(m[5] ?? 0) * 60 + +(m[6] ?? 0)) * 1000;
  return m[1] === '-' ? -ms : ms;
}

/* ---- Lecture du fichier ------------------------------------------------------------- */

export function parseIcs(text: string): ParsedCalendar {
  const lines = unfold(text.replace(/^\ufeff/, ''));
  if (!lines.some((l) => /^BEGIN:VCALENDAR/i.test(l))) return { name: null, events: [], ignored: 0 };
  let name: string | null = null;
  const events: ParsedEvent[] = [];
  let ignored = 0;
  let current: Prop[] | null = null;
  let depth = 0; // VALARM et autres blocs imbriqués dans un VEVENT

  for (const line of lines) {
    const prop = parseLine(line);
    if (!prop) continue;
    if (prop.name === 'BEGIN' && prop.value.toUpperCase() === 'VEVENT') {
      current = [];
      depth = 0;
    } else if (current && prop.name === 'BEGIN') depth += 1;
    else if (current && prop.name === 'END' && prop.value.toUpperCase() !== 'VEVENT') depth -= 1;
    else if (current && prop.name === 'END') {
      const event = buildEvent(current);
      if (event) events.push(event);
      else ignored += 1;
      current = null;
    } else if (current && depth === 0) current.push(prop);
    else if (!current && prop.name === 'X-WR-CALNAME') name = unescapeText(prop.value).trim() || null;
  }
  return { name, events, ignored };
}

function buildEvent(props: Prop[]): ParsedEvent | null {
  const get = (n: string) => props.find((p) => p.name === n);
  if (get('STATUS')?.value.toUpperCase() === 'CANCELLED') return null;
  const startProp = get('DTSTART');
  const start = startProp ? parseDateValue(startProp.value, startProp.params) : null;
  if (!start) return null;
  const endProp = get('DTEND');
  let end = endProp ? parseDateValue(endProp.value, endProp.params)?.ms : undefined;
  const duration = get('DURATION');
  if (end === undefined && duration) {
    const ms = parseDuration(duration.value);
    if (ms !== null) end = start.ms + ms;
  }
  if (end === undefined || end <= start.ms) end = start.allDay ? start.ms + 86_400_000 : start.ms;
  const exdates = props
    .filter((p) => p.name === 'EXDATE')
    .flatMap((p) => p.value.split(',').map((v) => parseDateValue(v, p.params)?.ms))
    .filter((v): v is number => v !== undefined);
  const recurrence = get('RECURRENCE-ID');
  const title = unescapeText(get('SUMMARY')?.value ?? '').trim();
  return {
    uid: get('UID')?.value.trim() || `${start.ms}-${title}`,
    recurrenceId: recurrence ? (parseDateValue(recurrence.value, recurrence.params)?.ms ?? null) : null,
    title: title.slice(0, 200),
    location: unescapeText(get('LOCATION')?.value ?? '')
      .trim()
      .slice(0, 300),
    allDay: start.allDay,
    start: start.ms,
    end,
    rrule: get('RRULE')?.value.trim() || null,
    exdates,
  };
}

/* ---- Répétitions ----------------------------------------------------------------------- */

export interface Occurrence {
  start: number;
  end: number;
}

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const MAX_STEPS = 20_000;

interface Calendar {
  parts(ms: number): { y: number; m: number; d: number; wd: number };
  make(y: number, m: number, d: number, time: number): number;
  timeOfDay(ms: number): number;
}

/** Journées entières : calcul en UTC (pas de changement d'heure). Heures : calcul en heure locale. */
const UTC_CAL: Calendar = {
  parts: (ms) => {
    const t = new Date(ms);
    return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate(), wd: t.getUTCDay() };
  },
  make: (y, m, d, time) => Date.UTC(y, m, d) + time,
  timeOfDay: (ms) => ms - Date.UTC(new Date(ms).getUTCFullYear(), new Date(ms).getUTCMonth(), new Date(ms).getUTCDate()),
};
const LOCAL_CAL: Calendar = {
  parts: (ms) => {
    const t = new Date(ms);
    return { y: t.getFullYear(), m: t.getMonth(), d: t.getDate(), wd: t.getDay() };
  },
  make: (y, m, d, time) => {
    const h = Math.floor(time / 3_600_000);
    const mi = Math.floor((time % 3_600_000) / 60_000);
    const s = Math.floor((time % 60_000) / 1000);
    return new Date(y, m, d, h, mi, s).getTime();
  },
  timeOfDay: (ms) => {
    const t = new Date(ms);
    return ((t.getHours() * 60 + t.getMinutes()) * 60 + t.getSeconds()) * 1000;
  },
};

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

/**
 * Occurrences d'un événement qui touchent l'intervalle [from, to[.
 * `skip` : instants d'origine à ne pas produire (dates exclues, occurrences modifiées ailleurs).
 */
export function occurrences(
  event: Pick<ParsedEvent, 'start' | 'end' | 'allDay' | 'rrule'>,
  from: number,
  to: number,
  skip: Set<number> = new Set(),
): Occurrence[] {
  const length = event.end - event.start;
  const out: Occurrence[] = [];
  const push = (start: number) => {
    if (!skip.has(start) && start < to && start + Math.max(length, 1) > from) out.push({ start, end: start + length });
  };
  if (!event.rrule) {
    push(event.start);
    return out;
  }
  const rule = Object.fromEntries(
    event.rrule.split(';').map((part) => {
      const [k, v = ''] = part.split('=');
      return [k.toUpperCase(), v.toUpperCase()];
    }),
  );
  const cal = event.allDay ? UTC_CAL : LOCAL_CAL;
  const time = cal.timeOfDay(event.start);
  const interval = Math.max(1, Number(rule.INTERVAL) || 1);
  const count = rule.COUNT ? Number(rule.COUNT) : Infinity;
  const until = rule.UNTIL ? (parseDateValue(rule.UNTIL, {})?.ms ?? Infinity) : Infinity;
  const byDay = rule.BYDAY ? rule.BYDAY.split(',').filter(Boolean) : [];
  const byMonthDay = rule.BYMONTHDAY
    ? rule.BYMONTHDAY.split(',')
        .map(Number)
        .filter((n) => n !== 0 && Math.abs(n) <= 31)
    : [];
  const s = cal.parts(event.start);

  let produced = 0;
  // Renvoie false quand il faut s'arrêter.
  const emit = (candidate: number): boolean => {
    if (candidate < event.start) return true;
    if (candidate > until || produced >= count || candidate >= to) return false;
    produced += 1;
    push(candidate);
    return true;
  };

  for (let step = 0; step < MAX_STEPS; step += 1) {
    let candidates: number[];
    if (rule.FREQ === 'DAILY') {
      candidates = [cal.make(s.y, s.m, s.d + step * interval, time)];
    } else if (rule.FREQ === 'WEEKLY') {
      const mondayOffset = (s.wd + 6) % 7;
      const days = byDay.length ? byDay.map((c) => DAY_CODES.indexOf(c.slice(-2))).filter((i) => i >= 0) : [s.wd];
      candidates = days
        .map((wd) => (wd + 6) % 7)
        .sort((a, b) => a - b)
        .map((offset) => cal.make(s.y, s.m, s.d - mondayOffset + step * 7 * interval + offset, time));
    } else if (rule.FREQ === 'MONTHLY') {
      const y = s.y + Math.floor((s.m + step * interval) / 12);
      const m = (s.m + step * interval) % 12;
      const dim = daysInMonth(y, m);
      let days: number[] = [];
      if (byMonthDay.length) days = byMonthDay.map((n) => (n > 0 ? n : dim + n + 1));
      else if (byDay.length) {
        for (const code of byDay) {
          const wd = DAY_CODES.indexOf(code.slice(-2));
          const nth = Number(code.slice(0, -2)) || 0;
          const matching = Array.from({ length: dim }, (_, i) => i + 1).filter((d) => new Date(Date.UTC(y, m, d)).getUTCDay() === wd);
          if (nth > 0) days.push(matching[nth - 1]);
          else if (nth < 0) days.push(matching[matching.length + nth]);
          else days.push(...matching);
        }
      } else days = [s.d];
      candidates = days
        .filter((d) => d !== undefined && d >= 1 && d <= dim)
        .sort((a, b) => a - b)
        .map((d) => cal.make(y, m, d, time));
    } else if (rule.FREQ === 'YEARLY') {
      const y = s.y + step * interval;
      candidates = s.d <= daysInMonth(y, s.m) ? [cal.make(y, s.m, s.d, time)] : [];
    } else {
      // Fréquence non prise en charge : on garde au moins la première date.
      push(event.start);
      return out;
    }
    for (const c of candidates) if (!emit(c)) return out;
  }
  return out;
}
