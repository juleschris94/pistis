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
              <stop offset="0" stopColor="#07121f" />
              <stop offset="0.55" stopColor="#1f4f9a" />
              <stop offset="1" stopColor="#ffb547" />
            </linearGradient>
          </defs>
          <rect width="400" height="220" fill={url('sky')} />
          <circle cx="292" cy="150" r="38" fill="#ffd08a" opacity="0.9" />
          <path d="M0 220V150l70-48 46 34 72-80 70 74 44-28 98 60v58z" fill="#16335a" />
          <path d="M188 56l12 14-8 4-10-8z" fill="#f7fafc" opacity="0.8" />
          <path d="M188 56v-26" stroke="#ffd08a" strokeWidth="2" />
          <path d="M188 30l16 6-16 6z" fill="#ffb547" />
          <path d="M0 220v-36l90-26 80 30 90-40 140 44v28z" fill="#0b1b2e" />
        </svg>
      );
    case 'city':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={g('sky')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0b1b2e" />
              <stop offset="0.6" stopColor="#3b2f7a" />
              <stop offset="1" stopColor="#ff8a5c" />
            </linearGradient>
          </defs>
          <rect width="400" height="220" fill={url('sky')} />
          <circle cx="320" cy="60" r="14" fill="#f7fafc" opacity="0.85" />
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
              <rect x={x} y={y} width={w} height={190 - y} fill="#10243b" />
              {Array.from({ length: Math.floor((180 - y) / 16) }, (_, row) =>
                [0, 1].map((col) => (
                  <rect
                    key={`${row}-${col}`}
                    x={x + 8 + col * (w / 2 - 4)}
                    y={y + 10 + row * 16}
                    width="5"
                    height="7"
                    fill={(row + col + x) % 3 === 0 ? '#ffd08a' : '#00c7ff'}
                    opacity={(row + x) % 4 === 0 ? 0.3 : 0.75}
                  />
                )),
              )}
            </g>
          ))}
          <rect y="190" width="400" height="30" fill="#07121f" />
          <path d="M40 202h60M150 208h90M280 200h70" stroke="#00c7ff" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'home':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={g('sky')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0b1b2e" />
              <stop offset="0.7" stopColor="#1f4f9a" />
              <stop offset="1" stopColor="#7cc4ff" />
            </linearGradient>
          </defs>
          <rect width="400" height="220" fill={url('sky')} />
          <circle cx="80" cy="48" r="16" fill="#ffd08a" opacity="0.9" />
          <path d="M0 220v-50c80-24 160-24 240-6s120 6 160-6v62z" fill="#0f3d36" />
          <path d="M150 170v-56l58-42 58 42v56z" fill="#10243b" />
          <path d="M140 118l68-52 68 52" fill="none" stroke="#ffb547" strokeWidth="6" strokeLinejoin="round" />
          <rect x="166" y="126" width="22" height="18" rx="2" fill="#ffd08a" />
          <rect x="228" y="126" width="22" height="18" rx="2" fill="#ffd08a" />
          <rect x="198" y="138" width="20" height="32" rx="2" fill="#2e8bff" />
          <path d="M208 170c-6 18-26 30-60 50h40c18-16 26-32 26-50z" fill="#16335a" />
          <circle cx="320" cy="140" r="26" fill="#0b7a69" />
          <rect x="317" y="150" width="6" height="22" fill="#0b1b2e" />
          <circle cx="96" cy="150" r="20" fill="#0b7a69" />
          <rect x="93" y="160" width="6" height="16" fill="#0b1b2e" />
        </svg>
      );
    case 'road':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id={g('sky')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#10243b" />
              <stop offset="0.6" stopColor="#865cff" />
              <stop offset="1" stopColor="#ffb547" />
            </linearGradient>
          </defs>
          <rect width="400" height="220" fill={url('sky')} />
          <circle cx="200" cy="112" r="34" fill="#ffd08a" opacity="0.85" />
          <path d="M0 220v-90l90-14 110 8 110-12 90 16v92z" fill="#16335a" />
          <path d="M184 122h32l110 98H74z" fill="#0b1b2e" />
          <path d="M200 128v12M200 152v16M200 182v22" stroke="#ffd08a" strokeWidth="3" strokeLinecap="round" />
          <path d="M0 220v-48l120 10-46 38zM400 220v-48l-120 10 46 38z" fill="#07121f" opacity="0.7" />
        </svg>
      );
    case 'library':
      return (
        <svg {...common}>
          <defs>
            <radialGradient id={g('lamp')} cx="0.7" cy="0.25" r="0.6">
              <stop offset="0" stopColor="#ffd08a" stopOpacity="0.55" />
              <stop offset="1" stopColor="#07121f" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="400" height="220" fill="#0b1b2e" />
          {[34, 98, 162].map((y) => (
            <g key={y}>
              <rect x="0" y={y + 44} width="400" height="6" fill="#28425e" />
              {Array.from({ length: 26 }, (_, i) => {
                const w = 9 + ((i * 7) % 6);
                const h = 30 + ((i * 11 + y) % 14);
                const x = 6 + i * 15.2;
                const colors = ['#1f6feb', '#0b7a69', '#865cff', '#a85a00', '#c42b3a', '#00799e', '#ffb547'];
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
              <stop offset="0" stopColor="#07121f" />
              <stop offset="0.55" stopColor="#1769e8" />
              <stop offset="1" stopColor="#00c7ff" />
            </linearGradient>
            <linearGradient id={g('sea')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#10bfa5" />
              <stop offset="1" stopColor="#07121f" />
            </linearGradient>
          </defs>
          <rect width="400" height="220" fill={url('sky')} />
          <circle cx="200" cy="130" r="46" fill="#ffd08a" />
          <rect y="128" width="400" height="92" fill={url('sea')} />
          <path d="M150 146h100M120 162h160M164 178h72" stroke="#ffd08a" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" />
          <path d="M300 150h36l-6 10h-24z" fill="#07121f" />
          <path d="M318 150v-30l14 26z" fill="#f7fafc" />
        </svg>
      );
  }
}
