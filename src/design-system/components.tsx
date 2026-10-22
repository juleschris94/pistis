import { useEffect, useMemo, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';

/** Composants de base PISTIS. Les écrans les assemblent ; ils ne redéfinissent pas de styles. */

export function PCard({ title, children, warm }: { title?: string; children: ReactNode; warm?: boolean }) {
  return (
    <section className={warm ? 'p-card p-card--warm' : 'p-card'}>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger';
export function PButton({ variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const cls = variant === 'primary' ? 'p-button' : `p-button p-button--${variant}`;
  return <button type="button" className={cls} {...props} />;
}

export function PField({ label, hint, id, ...input }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; id: string }) {
  return (
    <div className="p-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} className="p-input" {...input} />
      {hint && <span className="p-hint">{hint}</span>}
    </div>
  );
}

export function PAvatar({ image, name, large }: { image?: Uint8Array | null; name: string; large?: boolean }) {
  const url = useMemo(
    () => (image ? URL.createObjectURL(new Blob([image as BlobPart], { type: 'image/jpeg' })) : null),
    [image],
  );
  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
  const initials = name.trim().slice(0, 2).toUpperCase() || '?';
  return (
    <div className={large ? 'p-avatar p-avatar--large' : 'p-avatar'} aria-hidden={!url}>
      {url ? <img src={url} alt={`Photo de ${name}`} /> : initials}
    </div>
  );
}

export type CheckState = 'ok' | 'warn' | 'wait';
export function PCheck({ state, title, detail }: { state: CheckState; title: string; detail: string }) {
  const symbol = state === 'ok' ? '✓' : state === 'warn' ? '!' : '…';
  const label = state === 'ok' ? 'Validé' : state === 'warn' ? 'À vérifier' : 'En attente';
  return (
    <div className="p-check">
      <span className={`p-check__dot p-check__dot--${state}`} aria-label={label} role="img">
        {symbol}
      </span>
      <div>
        <p className="p-check__title">{title}</p>
        <p className="p-subtle">{detail}</p>
      </div>
    </div>
  );
}

export function PMessage({ tone, children }: { tone: 'ok' | 'error' | 'info'; children: ReactNode }) {
  return (
    <div className={`p-message p-message--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
