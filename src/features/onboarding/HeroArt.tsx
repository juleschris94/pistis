/**
 * Illustration de l'écran de bienvenue : un lever de soleil sur des montagnes et un lac.
 * Dessin vectoriel original (aucune photo) : léger, net sur tous les écrans, fonctionne hors ligne.
 */
export function HeroArt() {
  return (
    <svg className="p-hero__art" viewBox="0 0 400 860" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#03201e" />
          <stop offset="34%" stopColor="#0d3e3c" />
          <stop offset="52%" stopColor="#2f5f52" />
          <stop offset="62%" stopColor="#c9a46a" />
          <stop offset="66%" stopColor="#f0d3a0" />
        </linearGradient>
        <radialGradient id="hero-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fff6e2" />
          <stop offset="35%" stopColor="#f0c98f" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#d9a466" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hero-lake" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e6bb84" stopOpacity="0.55" />
          <stop offset="30%" stopColor="#1c4a43" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#072a27" />
        </linearGradient>
        <linearGradient id="hero-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#072a27" stopOpacity="0" />
          <stop offset="55%" stopColor="#072a27" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#072a27" stopOpacity="0.96" />
        </linearGradient>
      </defs>

      <rect width="400" height="860" fill="url(#hero-sky)" />
      {/* Étoiles discrètes */}
      <g fill="#fdf9f3" opacity="0.7">
        <circle cx="48" cy="70" r="1.2" />
        <circle cx="120" cy="40" r="0.9" />
        <circle cx="210" cy="88" r="1.1" />
        <circle cx="300" cy="52" r="0.8" />
        <circle cx="352" cy="120" r="1.2" />
        <circle cx="86" cy="150" r="0.8" />
        <circle cx="260" cy="170" r="0.9" />
      </g>
      <circle cx="200" cy="540" r="120" fill="url(#hero-sun)" />

      {/* Montagnes lointaines */}
      <path d="M0 520 L60 470 L110 500 L170 430 L230 490 L290 440 L350 485 L400 455 L400 570 L0 570Z" fill="#2c5a4f" opacity="0.85" />
      {/* Montagnes proches */}
      <path d="M0 560 L40 520 L85 545 L150 470 L205 535 L250 500 L320 548 L370 510 L400 530 L400 575 L0 575Z" fill="#183f38" />
      <path d="M0 575 L0 548 L55 560 L120 535 L180 565 L240 552 L310 570 L360 556 L400 566 L400 575Z" fill="#0e2f2a" />

      {/* Lac et reflets */}
      <rect y="575" width="400" height="285" fill="url(#hero-lake)" />
      <g stroke="#f0d3a0" strokeLinecap="round" opacity="0.55">
        <path d="M170 600 H230" strokeWidth="3" />
        <path d="M150 620 H250" strokeWidth="2" opacity="0.7" />
        <path d="M182 642 H218" strokeWidth="2" opacity="0.6" />
        <path d="M120 668 H180 M220 668 H280" strokeWidth="1.5" opacity="0.4" />
      </g>

      {/* Sapins sur les rives */}
      <g fill="#061f1c">
        <path d="M0 590 L14 540 L28 590Z M18 595 L34 530 L50 595Z M40 598 L52 556 L64 598Z" />
        <path d="M400 590 L386 538 L372 590Z M382 596 L366 528 L350 596Z M360 598 L348 560 L336 598Z" />
      </g>

      <rect width="400" height="860" fill="url(#hero-fade)" />
    </svg>
  );
}
