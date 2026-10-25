import { unzipSync } from 'fflate';
import { CalendarPlus, ChevronLeft, ChevronRight, MapPin, Navigation, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../app/AppContext';
import { useAsync } from '../../app/useAsync';
import { toLocalDate } from '../../core/localDate';
import { isSameDay, weekDays } from '../../core/week';
import { PButton, PCard, PChip, PFileButton, PIconButton, PMessage, PSheet, PTopBar } from '../../design-system/components';
import { buildDailyPlan } from '../../domain/dailyPlan';
import { useI18n } from '../../i18n';
import { listPlanTasks, setTaskDone, setTaskPinned } from '../projects/goalsRepository';
import { TaskRow } from '../projects/ui';
import { decodeStatement } from '../finance/statementImport';
import {
  agendaBetween,
  coversLocalDay,
  deleteCalendar,
  directionsLinks,
  importCalendar,
  listCalendars,
  type AgendaItem,
} from './agendaRepository';
import { parseIcs } from './ical';

const MAX_FILE = 20 * 1024 * 1024;

/** Onglet Planning : la semaine, tes agendas importés et tes tâches datées, jour par jour. */
export function PlanningScreen() {
  const { t, tn, formatDate, formatError } = useI18n();
  const { db, version, reload } = useApp();
  const [selected, setSelected] = useState(() => new Date());
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [directions, setDirections] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const days = weekDays(selected);
  const today = new Date();
  const todayISO = toLocalDate(today);

  const data = useAsync(async () => {
    const from = days[0].getTime();
    const to = new Date(days[6].getFullYear(), days[6].getMonth(), days[6].getDate() + 1).getTime();
    return {
      items: await agendaBetween(db, from, to),
      tasks: await listPlanTasks(db),
      calendars: await listCalendars(db),
    };
  }, [db, version, days[0].getTime()]);

  const dayISO = toLocalDate(selected);
  const dayItems = (data?.items ?? []).filter((i) => coversLocalDay(i, dayISO));
  const plan = data ? buildDailyPlan(data.tasks, todayISO) : null;
  const allTasks = plan ? [...plan.priorities, ...plan.others] : [];
  const dayTasks = allTasks.filter(({ task }) => task.due_date === dayISO);
  const busyDays = new Set(
    days
      .map(toLocalDate)
      .filter((d) => (data?.items ?? []).some((i) => coversLocalDay(i, d)) || allTasks.some(({ task }) => task.due_date === d)),
  );

  const move = (deltaDays: number) => setSelected((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + deltaDays));

  async function onFile(file: File) {
    setMessage(null);
    try {
      if (file.size > MAX_FILE) throw new Error(t('agenda.import.tooLarge'));
      const bytes = new Uint8Array(await file.arrayBuffer());
      // Google Agenda exporte un .zip contenant un .ics par agenda : on les importe tous.
      const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b;
      const files = isZip
        ? Object.entries(unzipSync(bytes, { filter: (f) => /\.ics$/i.test(f.name) && f.originalSize < MAX_FILE })).map(([name, data]) => ({
            name,
            data,
          }))
        : [{ name: file.name, data: bytes }];
      const done: string[] = [];
      for (const f of files) {
        const parsed = parseIcs(decodeStatement(f.data));
        if (!parsed.events.length) continue;
        const name = parsed.name ?? f.name.replace(/^.*\//, '').replace(/\.ics$/i, '');
        const res = await importCalendar(db, parsed, name, f.name);
        done.push(tn(res.replaced ? 'agenda.import.replaced' : 'agenda.import.added', res.count, { name }));
      }
      if (!done.length) throw new Error(t('errors.calendar.empty'));
      setMessage({ tone: 'ok', text: done.join(' ') });
      reload();
    } catch (e) {
      setMessage({ tone: 'error', text: e instanceof Error && !('code' in e) ? e.message : formatError(e) });
    }
  }

  const time = (ms: number) => formatDate(ms, { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <PTopBar
        title={t('nav.planning')}
        subtitle={t('agenda.subtitle')}
        actions={
          <PFileButton
            id="agenda"
            icon={CalendarPlus}
            label={t('agenda.import')}
            accept=".ics,.zip,text/calendar"
            variant="primary"
            onFile={(f) => void onFile(f)}
          />
        }
      />
      {message && <PMessage tone={message.tone}>{message.text}</PMessage>}

      <PCard>
        <div className="p-month">
          <PIconButton icon={ChevronLeft} label={t('agenda.week.previous')} onClick={() => move(-7)} plain />
          <h2 className="p-heading p-month__label">{formatDate(selected, { month: 'long', year: 'numeric' })}</h2>
          <PIconButton icon={ChevronRight} label={t('agenda.week.next')} onClick={() => move(7)} plain />
        </div>
        <ol className="p-week" aria-label={t('home.week')}>
          {days.map((day) => (
            <li key={day.toISOString()} className="p-week__day" aria-current={isSameDay(day, today) ? 'date' : undefined}>
              <button
                type="button"
                className="p-week__button"
                aria-pressed={isSameDay(day, selected)}
                aria-label={formatDate(day, { weekday: 'long', day: 'numeric', month: 'long' })}
                onClick={() => setSelected(day)}
              >
                <span aria-hidden="true">{formatDate(day, { weekday: 'narrow' })}</span>
                <span className="p-week__num" aria-hidden="true">
                  {day.getDate()}
                </span>
                <span className={busyDays.has(toLocalDate(day)) ? 'p-week__dot' : 'p-week__dot p-week__dot--empty'} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
        {!isSameDay(selected, today) && (
          <div>
            <PChip onClick={() => setSelected(new Date())}>{t('agenda.today')}</PChip>
          </div>
        )}
      </PCard>

      <PCard title={formatDate(selected, { weekday: 'long', day: 'numeric', month: 'long' })}>
        {!data ? (
          <p className="p-subtle">{t('common.loading')}</p>
        ) : dayItems.length === 0 && dayTasks.length === 0 ? (
          <p className="p-subtle">{t('agenda.day.empty')}</p>
        ) : (
          <>
            {dayItems.length > 0 && (
              <ul className="p-agenda">
                {dayItems.map((item) => (
                  <AgendaRow key={item.key} item={item} time={time} onDirections={setDirections} />
                ))}
              </ul>
            )}
            {dayTasks.length > 0 && (
              <>
                <h3 className="p-section-title">{t('agenda.day.tasks')}</h3>
                <ul className="p-tasks">
                  {dayTasks.map(({ task }) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      context={task.goal_title ?? t('plan.quickTask')}
                      showDue={false}
                      onToggle={(done) => void setTaskDone(db, task.id, done).then(reload)}
                      onPin={(pin) =>
                        void setTaskPinned(db, task.id, pin ? todayISO : null).then(reload, (e) =>
                          setMessage({ tone: 'error', text: formatError(e) }),
                        )
                      }
                    />
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </PCard>

      <PCard title={t('agenda.calendars')}>
        {data && data.calendars.length === 0 ? (
          <>
            <p className="p-subtle">{t('agenda.calendars.empty')}</p>
            <ul className="p-bullets">
              <li>{t('agenda.howto.google')}</li>
              <li>{t('agenda.howto.outlook')}</li>
              <li>{t('agenda.howto.apple')}</li>
            </ul>
            <p className="p-caption">{t('agenda.howto.private')}</p>
          </>
        ) : (
          <ul className="p-tx-list">
            {(data?.calendars ?? []).map((c) => (
              <li key={c.id} className="p-tx">
                <span className="p-tx__text">
                  <span className="p-tx__label">{c.name}</span>
                  <span className="p-caption">
                    {tn('agenda.calendar.events', c.event_count)} ·{' '}
                    {t('agenda.calendar.importedOn', { date: formatDate(c.imported_at, { day: 'numeric', month: 'short' }) })}
                  </span>
                </span>
                {confirmDelete === c.id ? (
                  <span className="p-actions">
                    <PButton
                      variant="danger"
                      onClick={() =>
                        void deleteCalendar(db, c.id).then(() => {
                          setConfirmDelete(null);
                          reload();
                        })
                      }
                    >
                      {t('agenda.calendar.remove.confirm')}
                    </PButton>
                    <PButton variant="ghost" onClick={() => setConfirmDelete(null)}>
                      {t('common.cancel')}
                    </PButton>
                  </span>
                ) : (
                  <PIconButton
                    icon={Trash2}
                    label={t('agenda.calendar.remove', { name: c.name })}
                    onClick={() => setConfirmDelete(c.id)}
                    plain
                  />
                )}
              </li>
            ))}
          </ul>
        )}
        {data && data.calendars.length > 0 && <p className="p-caption">{t('agenda.calendars.refresh')}</p>}
      </PCard>

      {directions && <DirectionsSheet address={directions} onClose={() => setDirections(null)} />}
    </>
  );
}

function AgendaRow({
  item,
  time,
  onDirections,
}: {
  item: AgendaItem;
  time: (ms: number) => string;
  onDirections: (address: string) => void;
}) {
  const { t } = useI18n();
  return (
    <li className="p-agenda__item">
      <span className="p-agenda__time">
        {item.allDay ? t('agenda.allDay') : `${time(item.start)}${item.end > item.start ? `\n${time(item.end)}` : ''}`}
      </span>
      <span className="p-agenda__body">
        <span className="p-tx__label">{item.title || t('agenda.untitled')}</span>
        <span className="p-caption">{item.sourceName}</span>
        {item.location && (
          <span className="p-agenda__place">
            <MapPin aria-hidden="true" />
            <span className="p-grow">{item.location}</span>
            <PButton variant="secondary" icon={Navigation} onClick={() => onDirections(item.location)}>
              {t('agenda.directions')}
            </PButton>
          </span>
        )}
      </span>
    </li>
  );
}

/** « Y aller » : l'adresse s'ouvre dans l'application de cartes choisie. */
function DirectionsSheet({ address, onClose }: { address: string; onClose: () => void }) {
  const { t } = useI18n();
  const links = directionsLinks(address);
  return (
    <PSheet title={t('agenda.directions.title')} closeLabel={t('common.close')} onClose={onClose}>
      <p className="p-subtle">{address}</p>
      <div className="p-choice-grid">
        {(
          [
            ['google', 'Google Maps'],
            ['apple', t('agenda.directions.apple')],
            ['waze', 'Waze'],
          ] as const
        ).map(([key, label]) => (
          <a key={key} className="p-choice" href={links[key]} target="_blank" rel="noopener noreferrer" onClick={onClose}>
            <Navigation aria-hidden="true" />
            <span className="p-list__title">{label}</span>
          </a>
        ))}
      </div>
      <p className="p-caption">{t('agenda.directions.private')}</p>
    </PSheet>
  );
}
