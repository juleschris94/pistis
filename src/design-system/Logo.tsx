import { useId } from 'react';

/**
 * Marque PISTIS : monogramme « P » géométrique en dégradé vert forêt → vert sauge, avec un pli plus
 * profond qui donne du volume et une étoile dorée (charte : prompt de recréation, §5).
 * Couleurs du « P » : jetons --logo-* (vert sur fond clair, crème sur fond sombre).
 * Dessin original, utilisé aussi pour l'icône de l'application (public/icon.svg).
 */
export function LogoMark({ size = 48, className }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-a`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" style={{ stopColor: 'var(--logo-a1)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--logo-a2)' }} />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: 'var(--logo-b1)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--logo-b2)' }} />
        </linearGradient>
        <linearGradient id={`${id}-c`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0cb98" />
          <stop offset="100%" stopColor="#c9965a" />
        </linearGradient>
      </defs>
      <path
        fillRule="evenodd"
        fill={`url(#${id}-a)`}
        d="M12 10a4 4 0 0 1 4-4h18a19 19 0 0 1 0 38h-8v12a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4zM26 18v14h8a7 7 0 0 0 0-14z"
      />
      <path fill={`url(#${id}-b)`} opacity="0.85" d="M12 40l14-8v24a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4z" />
      <path fill={`url(#${id}-c)`} d="M48.5 6.5l2 4.5 4.5 2-4.5 2-2 4.5-2-4.5-4.5-2 4.5-2z" />
    </svg>
  );
}
