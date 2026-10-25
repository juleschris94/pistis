import { useId } from 'react';
import type { VisionArtId } from '../content/visionArts';

/**
 * Illustrations intégrées pour la Vision d'un projet : six scènes vectorielles originales,
 * légères (quelques Ko), nettes à toutes les tailles et disponibles hors ligne.
 * Elles évoquent un résultat souhaité ; elles ne représentent jamais un résultat garanti.
 */
export function VisionArt({ art, className, label }: { art: VisionArtId; className?: string; label?: string }) {
  const id = useId().replace(/:/g, '');
  const g = (name: string) => `${id}-${name}`;
  const url = (name: string) => `url(#${g(name)})`;
  const common = {
    className,
    viewBox: '0 0 400 220',
    preserveAspectRatio: 'xMidYMid slice' as const,
    role: label ? 'img' : undefined,
    'aria-label': label,
    'aria-hidden': label ? undefined : true,
  };

  switch (art) {
    case 'summit':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={g('sky')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0b2f2a" />
              <stop offset="0.55" stopColor="#2f6a5c" />
              <stop offset="1" stopColor="#f0c98f" />
            </linearGradient>
          </defs>
          <rect width="400" height="220" fill={url('sky')} />
          <circle cx="292" cy="150" r="38" fill="#f7dfb0" opacity="0.9" />
          <path d="M0 220V150l70-48 46 34 72-80 70 74 44-28 98 60v58z" fill="#1d4a40" />
          <path d="M188 56l12 14-8 4-10-8z" fill="#fdf9f3" opacity="0.8" />
          <path d="M188 56v-26" stroke="#f0c98f" strokeWidth="2" />
          <path d="M188 30l16 6-16 6z" fill="#e6a35e" />
          <path d="M0 220v-36l90-26 80 30 90-40 140 44v28z" fill="#0b2a25" />
        </svg>
      );
    case 'city':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={g('sky')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0d2e2a" />
              <stop offset="0.6" stopColor="#5a5470" />
              <stop offset="1" stopColor="#e9a679" />
            </linearGradient>
          </defs>
          <rect width="400" height="220" fill={url('sky')} />
          <circle cx="320" cy="60" r="14" fill="#fdf9f3" opacity="0.85" />
          {[
            [20, 110, 40],
            [66, 80, 34],
            [104, 124, 30],
            [140, 60, 44],
            [190, 96, 36],
            [232, 70, 40],
            [278, 116, 32],
            [316, 88, 46],
            [366, 128, 34],
          ].map(([x, y, w]) => (
            <g key={x}>
              <rect x={x} y={y} width={w} height={190 - y} fill="#12302b" />
              {Array.from({ length: Math.floor((180 - y) / 16) }, (_, row) =>
                [0, 1].map((col) => (
                  <rect
                    key={`${row}-${col}`}
                    x={x + 8 + col * (w / 2 - 4)}
                    y={y + 10 + row * 16}
                    width="5"
                    height="7"
                    fill={(row + col + x) % 3 === 0 ? '#f0c98f' : '#9fd6be'}
                    opacity={(row + x) % 4 === 0 ? 0.3 : 0.75}
                  />
                )),
              )}
            </g>
          ))}
          <rect y="190" width="400" height="30" fill="#081f1c" />
          <path d="M40 202h60M150 208h90M280 200h70" stroke="#f0c98f" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'home':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={g('sky')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0e3a34" />
              <stop offset="0.7" stopColor="#4f8a78" />
              <stop offset="1" stopColor="#f3d9a6" />
            </linearGradient>
          </defs>
          <rect width="400" height="220" fill={url('sky')} />
          <circle cx="80" cy="48" r="16" fill="#fff1cf" opacity="0.9" />
          <path d="M0 220v-50c80-24 160-24 240-6s120 6 160-6v62z" fill="#2a6a52" />
          <path d="M150 170v-56l58-42 58 42v56z" fill="#1a3f39" />
          <path d="M140 118l68-52 68 52" fill="none" stroke="#c9965a" strokeWidth="6" strokeLinejoin="round" />
          <rect x="166" y="126" width="22" height="18" rx="2" fill="#f0c98f" />
          <rect x="228" y="126" width="22" height="18" rx="2" fill="#f0c98f" />
          <rect x="198" y="138" width="20" height="32" rx="2" fill="#9a5f22" />
          <path d="M208 170c-6 18-26 30-60 50h40c18-16 26-32 26-50z" fill="#2a5148" />
          <circle cx="320" cy="140" r="26" fill="#1e6b4f" />
          <rect x="317" y="150" width="6" height="22" fill="#0b2a25" />
          <circle cx="96" cy="150" r="20" fill="#1e6b4f" />
          <rect x="93" y="160" width="6" height="16" fill="#0b2a25" />
        </svg>
      );
    case 'road':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={g('sky')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0f3732" />
              <stop offset="0.6" stopColor="#8f6a4a" />
              <stop offset="1" stopColor="#f0c98f" />
            </linearGradient>
          </defs>
          <rect width="400" height="220" fill={url('sky')} />
          <circle cx="200" cy="112" r="34" fill="#fdf0d0" opacity="0.85" />
          <path d="M0 220v-90l90-14 110 8 110-12 90 16v92z" fill="#1d4a40" />
          <path d="M184 122h32l110 98H74z" fill="#0b2a25" />
          <path d="M200 128v12M200 152v16M200 182v22" stroke="#f0c98f" strokeWidth="3" strokeLinecap="round" />
          <path d="M0 220v-48l120 10-46 38zM400 220v-48l-120 10 46 38z" fill="#081f1c" opacity="0.7" />
        </svg>
      );
    case 'library':
      return (
        <svg {...common}>
          <defs>
            <radialGradient id={g('lamp')} cx="0.7" cy="0.25" r="0.6">
              <stop offset="0" stopColor="#f0c98f" stopOpacity="0.55" />
              <stop offset="1" stopColor="#12302b" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="400" height="220" fill="#12302b" />
          {[34, 98, 162].map((y) => (
            <g key={y}>
              <rect x="0" y={y + 44} width="400" height="6" fill="#2a5148" />
              {Array.from({ length: 26 }, (_, i) => {
                const w = 9 + ((i * 7) % 6);
                const h = 30 + ((i * 11 + y) % 14);
                const x = 6 + i * 15.2;
                const colors = ['#9a5f22', '#0e6b55', '#b14d3a', '#6a5f9e', '#3f6f8f', '#557228', '#c9965a'];
                return (
                  <rect key={i} x={x} y={y + 44 - h} width={w} height={h} rx="1.5" fill={colors[(i + y) % colors.length]} opacity="0.9" />
                );
              })}
            </g>
          ))}
          <rect width="400" height="220" fill={url('lamp')} />
        </svg>
      );
    case 'horizon':
    default:
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={g('sky')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0b2f2a" />
              <stop offset="0.55" stopColor="#2f7d6a" />
              <stop offset="1" stopColor="#f0c98f" />
            </linearGradient>
            <linearGradient id={g('sea')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1e8a69" />
              <stop offset="1" stopColor="#072a27" />
            </linearGradient>
          </defs>
          <rect width="400" height="220" fill={url('sky')} />
          <circle cx="200" cy="130" r="46" fill="#f0c98f" />
          <rect y="128" width="400" height="92" fill={url('sea')} />
          <path d="M150 146h100M120 162h160M164 178h72" stroke="#f0c98f" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" />
          <path d="M300 150h36l-6 10h-24z" fill="#081f1c" />
          <path d="M318 150v-30l14 26z" fill="#fdf9f3" />
        </svg>
      );
  }
}
