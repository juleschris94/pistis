import { Check, ChevronLeft, ChevronRight, X, type LucideIcon } from 'lucide-react';
import {
  Component,
  useEffect,
  useId,
  useMemo,
  useRef,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ErrorInfo,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router';

/**
 * Composants de base PISTIS. Les écrans les assemblent ; ils ne redéfinissent pas de styles.
 * Aucun texte n'est écrit ici : les libellés arrivent déjà traduits par les écrans.
 */

/* ---- Cartes ---------------------------------------------------------------- */

export function PCard({
  title,
  action,
  children,
  variant,
  id,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  variant?: 'accent' | 'vision';
  id?: string;
}) {
  const headingId = useId();
  return (
    <section className={variant ? `p-card p-card--${variant}` : 'p-card'} aria-labelledby={title ? headingId : undefined} id={id}>
      {(title || action) && (
        <div className="p-card__header">
          {title && <h2 id={headingId}>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/* ---- Boutons --------------------------------------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'light';
const buttonClass = (variant: ButtonVariant, block?: boolean) =>
  ['p-button', variant !== 'primary' && `p-button--${variant}`, block && 'p-button--block'].filter(Boolean).join(' ');

export function PButton({
  variant = 'primary',
  block,
  icon: Icon,
  iconAfter: IconAfter,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; block?: boolean; icon?: LucideIcon; iconAfter?: LucideIcon }) {
  return (
    <button type="button" className={buttonClass(variant, block)} {...props}>
      {Icon && <Icon aria-hidden="true" />}
      {children}
      {IconAfter && <IconAfter aria-hidden="true" />}
    </button>
  );
}

export function PButtonLink({
  to,
  variant = 'primary',
  block,
  children,
}: {
  to: string;
  variant?: ButtonVariant;
  block?: boolean;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={buttonClass(variant, block)}>
      {children}
    </Link>
  );
}

export function PIconButton({
  icon: Icon,
  label,
  to,
  onClick,
  dot,
  plain,
}: {
  icon: LucideIcon;
  label: string;
  to?: string;
  onClick?: () => void;
  dot?: boolean;
  plain?: boolean;
}) {
  const cls = plain ? 'p-icon-button p-icon-button--plain' : 'p-icon-button';
  const inner = (
    <>
      <Icon aria-hidden="true" />
      {dot && <span className="p-dot" aria-hidden="true" />}
    </>
  );
  return to ? (
    <Link to={to} className={cls} aria-label={label}>
      {inner}
    </Link>
  ) : (
    <button type="button" className={cls} aria-label={label} onClick={onClick}>
      {inner}
    </button>
  );
}

/* ---- En-tête d'écran ------------------------------------------------------- */

/** Titre d'écran, avec retour facultatif et actions à droite. */
export function PTopBar({
  title,
  subtitle,
  back,
  backLabel,
  actions,
  leading,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: string;
  backLabel?: string;
  actions?: ReactNode;
  leading?: ReactNode;
}) {
  return (
    <header className="p-topbar">
      {back && <PIconButton icon={ChevronLeft} label={backLabel ?? ''} to={back} plain />}
      {leading}
      <div className="p-topbar__title">
        <h1 className="p-title">{title}</h1>
        {subtitle && <p className="p-subtle">{subtitle}</p>}
      </div>
      {actions}
    </header>
  );
}

/* ---- Formulaires ----------------------------------------------------------- */

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string; id: string };

/** Champ avec libellé, aide et erreur reliés pour les lecteurs d'écran. */
export function PField({ label, hint, error, id, ...input }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="p-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className={error ? 'p-input p-input--invalid' : 'p-input'}
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
        {...input}
      />
      {error && (
        <span className="p-field__error" id={errorId}>
          {error}
        </span>
      )}
      {hint && (
        <span className="p-hint" id={hintId}>
          {hint}
        </span>
      )}
    </div>
  );
}

/**
 * Bouton de choix de fichier aux couleurs de PISTIS (le bouton natif change de langue et d'apparence
 * selon l'appareil). Le même fichier peut être choisi deux fois de suite.
 */
export function PFileButton({
  label,
  accept,
  onFile,
  variant = 'secondary',
  id,
  icon,
}: {
  label: string;
  accept: string;
  onFile: (file: File) => void;
  variant?: ButtonVariant;
  id?: string;
  icon?: LucideIcon;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <PButton variant={variant} onClick={() => input.current?.click()} id={id} icon={icon}>
        {label}
      </PButton>
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        data-testid={id ? `${id}-input` : undefined}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onFile(file);
        }}
      />
    </>
  );
}

/** Choix exclusif (Clair / Système / Sombre…), navigable au clavier comme des boutons radio. */
export function PSegmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="p-segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---- Avatar ---------------------------------------------------------------- */

export function PAvatar({
  image,
  mime = 'image/jpeg',
  name,
  large,
}: {
  image?: Uint8Array | null;
  mime?: string;
  name: string;
  large?: boolean;
}) {
  const url = useMemo(() => (image ? URL.createObjectURL(new Blob([image as BlobPart], { type: mime })) : null), [image, mime]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  const initials = [...name.trim()].slice(0, 2).join('').toUpperCase();
  return (
    <div className={large ? 'p-avatar p-avatar--large' : 'p-avatar'}>
      {url ? (
        <img src={url} alt="" />
      ) : initials ? (
        <span aria-hidden="true">{initials}</span>
      ) : (
        <svg viewBox="0 0 24 24" width="50%" height="50%" aria-hidden="true" fill="currentColor">
          <circle cx="12" cy="8" r="4.5" />
          <path d="M3.5 21c.9-4.4 4.3-7 8.5-7s7.6 2.6 8.5 7z" />
        </svg>
      )}
    </div>
  );
}

/* ---- Tuiles et icônes ------------------------------------------------------ */

/** Tuile colorée sélectionnable (catégories). `color` = une variable de couleur, ex. `var(--cat-finance)`. */
export function PTile({
  icon: Icon,
  label,
  color,
  selected,
  onToggle,
}: {
  icon: LucideIcon;
  label: string;
  color: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" className="p-tile" style={{ '--tile': color } as CSSProperties} aria-pressed={selected} onClick={onToggle}>
      {selected && (
        <span className="p-tile__check" aria-hidden="true">
          <Check strokeWidth={3} />
        </span>
      )}
      <Icon aria-hidden="true" strokeWidth={1.8} />
      <span>{label}</span>
    </button>
  );
}

export function PIconBox({ icon: Icon, color, soft }: { icon: LucideIcon; color?: string; soft?: boolean }) {
  return (
    <span
      className={soft ? 'p-icon-box p-icon-box--soft' : 'p-icon-box'}
      style={color ? ({ '--tile': color } as CSSProperties) : undefined}
      aria-hidden="true"
    >
      <Icon />
    </span>
  );
}

export function PBadge({ tone, children }: { tone?: 'brand' | 'positive' | 'attention' | 'vision'; children: ReactNode }) {
  return <span className={tone ? `p-badge p-badge--${tone}` : 'p-badge'}>{children}</span>;
}

/* ---- Listes ---------------------------------------------------------------- */

export function PList({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <ul className="p-list" aria-label={label}>
      {children}
    </ul>
  );
}

/** Ligne de liste : lien (`to`), bouton (`onClick`) ou simple information. */
export function PListRow({
  icon,
  color,
  title,
  subtitle,
  to,
  onClick,
  trailing,
}: {
  icon?: LucideIcon;
  color?: string;
  title: string;
  subtitle?: ReactNode;
  to?: string;
  onClick?: () => void;
  trailing?: ReactNode;
}) {
  const content = (
    <>
      {icon && <PIconBox icon={icon} color={color} soft />}
      <span className="p-list__text">
        <span className="p-list__title">{title}</span>
        {subtitle && <span className="p-list__subtitle">{subtitle}</span>}
      </span>
      {trailing}
      {(to || onClick) && <ChevronRight className="p-list__chevron" aria-hidden="true" />}
    </>
  );
  return (
    <li>
      {to ? (
        <Link to={to} className="p-list__row">
          {content}
        </Link>
      ) : onClick ? (
        <button type="button" className="p-list__row" onClick={onClick}>
          {content}
        </button>
      ) : (
        <div className="p-list__row" aria-disabled="true">
          {content}
        </div>
      )}
    </li>
  );
}

/* ---- Progression ----------------------------------------------------------- */

/** Anneau de progression (0 à 1). Le libellé lisible est fourni par l'écran. */
export function PRing({ value, size = 104, label, valueText }: { value: number; size?: number; label: string; valueText: string }) {
  const gradientId = useId();
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div className="p-ring" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2e8bff" />
            <stop offset="100%" stopColor="#00c7ff" />
          </linearGradient>
        </defs>
        <circle className="p-ring__track" cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          style={{ transition: 'stroke-dashoffset 600ms var(--ease)' }}
        />
      </svg>
      <span className="p-ring__label" aria-hidden="true">
        {valueText}
      </span>
    </div>
  );
}

export function PBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="p-bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <div className="p-bar__value" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Barre d'étapes en haut d'un parcours (ex. accueil en 3 étapes). */
export function PSteps({ current, total, label }: { current: number; total: number; label: string }) {
  return (
    <div className="p-steps" role="progressbar" aria-label={label} aria-valuemin={1} aria-valuemax={total} aria-valuenow={current}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} data-done={i < current} />
      ))}
    </div>
  );
}

/* ---- Contrôles, messages, états -------------------------------------------- */

export type CheckState = 'ok' | 'warn' | 'wait';
export function PCheck({
  state,
  title,
  detail,
  stateLabel,
  action,
}: {
  state: CheckState;
  title: string;
  detail: ReactNode;
  stateLabel: string;
  /** Bouton ou lien facultatif sous le texte (ex. « Sauvegarder maintenant »). */
  action?: ReactNode;
}) {
  const symbol = state === 'ok' ? <Check strokeWidth={3} /> : state === 'warn' ? '!' : '…';
  return (
    <li className="p-check">
      <span className={`p-check__dot p-check__dot--${state}`} aria-hidden="true">
        {symbol}
      </span>
      <div>
        <p className="p-check__title">
          {title}
          <span className="p-visually-hidden"> : {stateLabel}</span>
        </p>
        <p className="p-subtle">{detail}</p>
        {action && <div className="p-check__action">{action}</div>}
      </div>
    </li>
  );
}

export function PMessage({ tone, children }: { tone: 'ok' | 'error' | 'info' | 'attention'; children: ReactNode }) {
  return (
    <div className={`p-message p-message--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

export function PEmpty({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="p-empty">
      <span className="p-empty__icon" aria-hidden="true">
        <Icon />
      </span>
      <h2 className="p-heading">{title}</h2>
      {children}
    </div>
  );
}

/** Écran plein, centré : chargement, problème bloquant, autre onglet. */
export function PScreen({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main className="p-screen-center">
      <p className="p-logo">PISTIS</p>
      <h1 className="p-title">{title}</h1>
      {children}
    </main>
  );
}

/**
 * Dernier filet de sécurité : une erreur imprévue affiche un écran clair au lieu d'une page blanche.
 * Les textes sont fournis par l'appelant (ce composant ne peut pas utiliser les traductions par hook).
 */
export class PErrorBoundary extends Component<
  { children: ReactNode; texts: { title: string; body: string; reload: string } },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('PISTIS — erreur inattendue', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const { texts } = this.props;
    return (
      <PScreen title={texts.title}>
        <p className="p-subtle">{texts.body}</p>
        <PMessage tone="error">{this.state.error.message}</PMessage>
        <div>
          <PButton onClick={() => location.reload()}>{texts.reload}</PButton>
        </div>
      </PScreen>
    );
  }
}

/* ---- Saisie longue, listes déroulantes, puces --------------------------------- */

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; error?: string; id: string };

export function PTextArea({ label, hint, error, id, ...area }: TextAreaProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="p-field">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        className={error ? 'p-input p-input--invalid' : 'p-input'}
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
        {...area}
      />
      {error && (
        <span className="p-field__error" id={errorId}>
          {error}
        </span>
      )}
      {hint && (
        <span className="p-hint" id={hintId}>
          {hint}
        </span>
      )}
    </div>
  );
}

export function PSelect({
  label,
  id,
  options,
  ...select
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; id: string; options: { value: string; label: string }[] }) {
  return (
    <div className="p-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} className="p-input" {...select}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function PChip({
  selected,
  icon: Icon,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean; icon?: LucideIcon }) {
  return (
    <button type="button" className="p-chip" aria-pressed={selected === undefined ? undefined : selected} {...props}>
      {Icon && <Icon aria-hidden="true" />}
      {children}
    </button>
  );
}

/* ---- Feuille modale ----------------------------------------------------------- */

/**
 * Feuille qui monte du bas (téléphone) ou fenêtre centrée (ordinateur).
 * Accessible : rôle dialog, focus placé dans la feuille puis rendu à l'élément d'origine, Échap ferme.
 */
export function PSheet({
  title,
  closeLabel,
  onClose,
  children,
}: {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input, textarea, select, button:not(.p-sheet__close), a[href]')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, []);
  return createPortal(
    <div
      className="p-sheet-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close.current();
      }}
    >
      <div className="p-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
        <span className="p-sheet__handle" aria-hidden="true" />
        <div className="p-section-title">
          <h2 className="p-heading" id={titleId}>
            {title}
          </h2>
          <button
            type="button"
            className="p-icon-button p-icon-button--plain p-sheet__close"
            aria-label={closeLabel}
            onClick={() => close.current()}
          >
            <X aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
