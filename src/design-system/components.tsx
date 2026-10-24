import {
  Component,
  useEffect,
  useId,
  useMemo,
  useRef,
  type ButtonHTMLAttributes,
  type ErrorInfo,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';

/** Composants de base PISTIS. Les écrans les assemblent ; ils ne redéfinissent pas de styles. */

export function PCard({ title, children, warm, id }: { title?: string; children: ReactNode; warm?: boolean; id?: string }) {
  const headingId = useId();
  return (
    <section className={warm ? 'p-card p-card--warm' : 'p-card'} aria-labelledby={title ? headingId : undefined} id={id}>
      {title && <h2 id={headingId}>{title}</h2>}
      {children}
    </section>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export function PButton({ variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const cls = variant === 'primary' ? 'p-button' : `p-button p-button--${variant}`;
  return <button type="button" className={cls} {...props} />;
}

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
 * Bouton de choix de fichier aux couleurs de PISTIS (le bouton natif du navigateur change de langue
 * et d'apparence selon l'appareil). Le même fichier peut être choisi deux fois de suite.
 */
export function PFileButton({
  label,
  accept,
  onFile,
  variant = 'secondary',
  id,
}: {
  label: string;
  accept: string;
  onFile: (file: File) => void;
  variant?: ButtonVariant;
  id?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <PButton variant={variant} onClick={() => input.current?.click()} id={id}>
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

export type CheckState = 'ok' | 'warn' | 'wait';
export function PCheck({ state, title, detail }: { state: CheckState; title: string; detail: string }) {
  const symbol = state === 'ok' ? '✓' : state === 'warn' ? '!' : '…';
  const label = state === 'ok' ? 'Validé' : state === 'warn' ? 'À vérifier' : 'En attente';
  return (
    <li className="p-check">
      <span className={`p-check__dot p-check__dot--${state}`} aria-hidden="true">
        {symbol}
      </span>
      <div>
        <p className="p-check__title">
          {title}
          <span className="p-visually-hidden"> : {label}</span>
        </p>
        <p className="p-subtle">{detail}</p>
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

/** Écran plein, centré : chargement, problème bloquant, autre onglet. */
export function PScreen({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main className="p-welcome">
      <p className="p-logo">PISTIS</p>
      <h1 className="p-greeting">{title}</h1>
      {children}
    </main>
  );
}

/** Dernier filet de sécurité : une erreur imprévue affiche un écran clair au lieu d'une page blanche. */
export class PErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('PISTIS — erreur inattendue', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <PScreen title="Un problème inattendu est survenu">
        <p className="p-subtle">Tes données ne sont pas touchées : elles restent enregistrées sur cet appareil.</p>
        <PMessage tone="error">{this.state.error.message}</PMessage>
        <div>
          <PButton onClick={() => location.reload()}>Recharger PISTIS</PButton>
        </div>
      </PScreen>
    );
  }
}
