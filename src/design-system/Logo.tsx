import { useId } from 'react';

/**
 * Marque PISTIS : un « P » en dégradé cyan → bleu, avec un pli plus sombre qui donne du relief.
 * Dessin original, utilisé aussi pour l'icône de l'application (public/icon.svg).
 */
export function LogoMark({ size = 48, className }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-a`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#00d1ff" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e3a8a" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <path
        fillRule="evenodd"
        fill={`url(#${id}-a)`}
        d="M12 10a4 4 0 0 1 4-4h18a19 19 0 0 1 0 38h-8v12a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4zM26 18v14h8a7 7 0 0 0 0-14z"
      />
      <path fill={`url(#${id}-b)`} opacity="0.85" d="M12 40l14-8v24a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4z" />
    </svg>
  );
}
