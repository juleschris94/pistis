import { ArrowRight, Camera, Check, Pin, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useApp } from '../../app/AppContext';
import { CATEGORY_VISUALS } from '../../app/categoryVisuals';
import { projectPath } from '../../app/paths';
import { useAsync } from '../../app/useAsync';
import { CATEGORY_IDS, type CategoryId } from '../../content/categories';
import { isVisionArtId, VISION_ARTS, type VisionArtId } from '../../content/visionArts';
import { daysBetween, parseLocalDate, toLocalDate } from '../../core/localDate';
import { PBadge, PBar, PChip, PFileButton, PSegmented } from '../../design-system/components';
import { VisionArt } from '../../design-system/VisionArt';
import type { GoalStatus, Priority, Task } from '../../domain/goals';
import { useI18n } from '../../i18n';
import { processImage, type ProcessedImage } from '../media/imagePipeline';
import { getMedia } from '../media/mediaRepository';
import type { GoalSummary } from './goalsRepository';

/* ---- Image d'un projet : photo personnelle ou illustration intégrée ----------- */

function useBlobUrl(bytes: Uint8Array | null | undefined, mime: string): string | null {
  const url = useMemo(() => (bytes ? URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime })) : null), [bytes, mime]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return url;
}

export function GoalArt({ mediaId, art, photo }: { mediaId: string | null; art: string | null; photo?: ProcessedImage | null }) {
  const { db } = useApp();
  const media = useAsync(async () => (mediaId && !photo ? getMedia(db, mediaId) : null), [db, mediaId, photo]);
  const url = useBlobUrl(photo?.data ?? media?.data ?? null, photo?.mime ?? media?.mime ?? 'image/jpeg');
  if (url) return <img src={url} alt="" />;
  return <VisionArt art={isVisionArtId(art) ? art : 'summit'} />;
}

/* ---- Libellés ---------------------------------------------------------------- */

export function useGoalLabels() {
  const { t, formatDate } = useI18n();
  return {
    status: (s: GoalStatus) => t(`goal.status.${s}`),
    priority: (p: Priority) => t(`goal.priority.${p}`),
    /** « 12 déc. » ou « 12 déc. 2027 » si ce n'est pas l'année en cours. */
    date: (d: string) => {
      const date = parseLocalDate(d);
      const sameYear = date.getFullYear() === new Date().getFullYear();
      return formatDate(date, sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' });
    },
    /** « dans 12 jours », « aujourd'hui », « il y a 3 jours ». */
    relative: (d: string) => {
      const days = daysBetween(toLocalDate(new Date()), d);
      if (days === 0) return t('date.today');
      if (days === 1) return t('date.tomorrow');
      if (days === -1) return t('date.yesterday');
      return days > 0 ? t('date.inDays', { days }) : t('date.daysAgo', { days: -days });
    },
  };
}

/* ---- Carte de projet ---------------------------------------------------------- */

export function ProjectCard({ summary }: { summary: GoalSummary }) {
  const { t } = useI18n();
  const labels = useGoalLabels();
  const { goal, progress, next } = summary;
  const pct = progress.ratio === null ? null : Math.round(progress.ratio * 100);
  return (
    <Link to={projectPath(goal.id)} className="p-project-card">
      <div className="p-project-card__art">
        <GoalArt mediaId={goal.vision_media_id} art={goal.vision_art} />
        <div className="p-project-card__badges">
          <span className="p-badge p-badge--on-art">{t(`category.${goal.category}`)}</span>
          {goal.status !== 'active' && <span className="p-badge p-badge--on-art">{labels.status(goal.status)}</span>}
        </div>
      </div>
      <div className="p-project-card__body">
        <div className="p-stack p-stack--tight">
          <h3 className="p-heading">{goal.title}</h3>
          {goal.why ? <p className="p-subtle p-clamp-2">« {goal.why} »</p> : <p className="p-subtle">{t('project.noWhyYet')}</p>}
        </div>
        {goal.status !== 'idea' && (
          <>
            {pct === null ? (
              <p className="p-caption">{t('project.noTasks')}</p>
            ) : (
              <>
                <PBar value={progress.ratio ?? 0} label={t('project.progressLabel', { title: goal.title, pct })} />
                <div className="p-meta">
                  <span>
                    <strong>{progress.done}</strong> / {progress.total} {t('project.tasksDone')}
                  </span>
                  <strong>{pct} %</strong>
                </div>
              </>
            )}
            {next && goal.status === 'active' && (
              <div className="p-next">
                <ArrowRight aria-hidden="true" />
                <span className="p-grow">
                  <span className="p-visually-hidden">{t('project.nextAction')} : </span>
                  {next.title}
                </span>
              </div>
            )}
          </>
        )}
        {goal.target_date && (
          <p className="p-caption">
            {t('project.targetDate')} : {labels.date(goal.target_date)} · {labels.relative(goal.target_date)}
          </p>
        )}
      </div>
    </Link>
  );
}

/* ---- Ligne de tâche ----------------------------------------------------------- */

export function TaskRow({
  task,
  onToggle,
  onPin,
  onDelete,
  context,
  showDue = true,
}: {
  task: Pick<Task, 'id' | 'title' | 'done_at' | 'due_date' | 'pinned_on'>;
  onToggle: (done: boolean) => void;
  onPin?: (pinned: boolean) => void;
  onDelete?: () => void;
  /** Texte d'appoint sous le titre (ex. nom du projet, raison de la priorité). */
  context?: string;
  /** Masque l'échéance quand le contexte la dit déjà (« Pour aujourd'hui », « En retard »). */
  showDue?: boolean;
}) {
  const { t } = useI18n();
  const labels = useGoalLabels();
  const today = toLocalDate(new Date());
  const done = task.done_at !== null;
  const pinned = task.pinned_on === today;
  const late = showDue && !done && task.due_date !== null && task.due_date < today;
  const meta = [context, showDue && task.due_date ? `${t('task.due')} ${labels.date(task.due_date)}` : null].filter(Boolean).join(' · ');
  return (
    <li className={done ? 'p-task p-task--done' : 'p-task'}>
      <button
        type="button"
        className="p-task__check"
        role="checkbox"
        aria-checked={done}
        aria-label={task.title}
        onClick={() => onToggle(!done)}
      >
        {done && <Check strokeWidth={3} aria-hidden="true" />}
      </button>
      <span className="p-task__text">
        <span className="p-task__title">{task.title}</span>
        {meta && (
          <span className={late ? 'p-task__meta p-task__meta--late' : 'p-task__meta'}>
            {late ? `${meta} · ${t('plan.reason.overdue')}` : meta}
          </span>
        )}
      </span>
      {onPin && !done && (
        <button
          type="button"
          className="p-icon-button p-icon-button--plain p-icon-button--small"
          aria-pressed={pinned}
          aria-label={pinned ? t('task.unpin', { title: task.title }) : t('task.pin', { title: task.title })}
          onClick={() => onPin(!pinned)}
        >
          <Pin aria-hidden="true" fill={pinned ? 'currentColor' : 'none'} />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          className="p-icon-button p-icon-button--plain p-icon-button--small"
          aria-label={t('task.delete', { title: task.title })}
          onClick={onDelete}
        >
          <Trash2 aria-hidden="true" />
        </button>
      )}
    </li>
  );
}

/* ---- Sélecteurs ---------------------------------------------------------------- */

export function CategoryPicker({ value, onChange }: { value: CategoryId; onChange: (c: CategoryId) => void }) {
  const { t } = useI18n();
  return (
    <div className="p-field">
      <span className="p-field__label" id="category-label">
        {t('goal.category')}
      </span>
      <div className="p-chips" role="group" aria-labelledby="category-label">
        {CATEGORY_IDS.map((id) => (
          <PChip key={id} icon={CATEGORY_VISUALS[id].icon} selected={value === id} onClick={() => onChange(id)}>
            {t(`category.${id}`)}
          </PChip>
        ))}
      </div>
    </div>
  );
}

export function PriorityPicker({ value, onChange }: { value: Priority; onChange: (p: Priority) => void }) {
  const { t } = useI18n();
  return (
    <div className="p-field">
      <span className="p-field__label">{t('goal.priority')}</span>
      <PSegmented
        label={t('goal.priority')}
        options={([1, 2, 3] as Priority[]).map((p) => ({ value: String(p), label: t(`goal.priority.${p}`) }))}
        value={String(value)}
        onChange={(v) => onChange(Number(v) as Priority)}
      />
    </div>
  );
}

/** Choix de l'image de la vision : illustration intégrée ou photo personnelle (sans métadonnées). */
export function ArtPicker({
  art,
  onArt,
  photo,
  onPhoto,
  existingMediaId,
  onRemoveExisting,
}: {
  art: string | null;
  onArt: (a: VisionArtId) => void;
  photo: ProcessedImage | null;
  onPhoto: (p: ProcessedImage | null) => void;
  existingMediaId?: string | null;
  onRemoveExisting?: () => void;
}) {
  const { t, formatError } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hasPhoto = Boolean(photo || existingMediaId);
  return (
    <div className="p-stack p-stack--tight">
      <span className="p-field__label">{t('vision.picture')}</span>
      <div className="p-art-grid" role="group" aria-label={t('vision.picture')}>
        {VISION_ARTS.map((id) => (
          <button
            key={id}
            type="button"
            className="p-art-option"
            aria-pressed={!hasPhoto && art === id}
            aria-label={t(`vision.art.${id}`)}
            onClick={() => {
              onArt(id);
              onPhoto(null);
              onRemoveExisting?.();
            }}
          >
            <VisionArt art={id} />
          </button>
        ))}
      </div>
      <div className="p-row">
        <PFileButton
          id="vision-photo"
          icon={Camera}
          label={busy ? t('profile.photo.processing') : hasPhoto ? t('vision.photo.change') : t('vision.photo.add')}
          accept="image/jpeg,image/png,image/webp"
          onFile={async (file) => {
            setError(null);
            setBusy(true);
            try {
              onPhoto(await processImage(file));
            } catch (e) {
              setError(formatError(e));
            } finally {
              setBusy(false);
            }
          }}
        />
        {hasPhoto && (
          <PChip
            icon={X}
            onClick={() => {
              onPhoto(null);
              onRemoveExisting?.();
            }}
          >
            {t('vision.photo.remove')}
          </PChip>
        )}
      </div>
      {error && <p className="p-field__error">{error}</p>}
    </div>
  );
}

export function StatusBadge({ status, onArt = false }: { status: GoalStatus; onArt?: boolean }) {
  const labels = useGoalLabels();
  if (onArt) return <span className="p-badge p-badge--on-art">{labels.status(status)}</span>;
  const tone = status === 'active' ? 'brand' : status === 'done' ? 'positive' : status === 'idea' ? 'vision' : undefined;
  return <PBadge tone={tone}>{labels.status(status)}</PBadge>;
}
