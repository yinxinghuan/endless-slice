import { TouchAppIcon } from './TouchAppIcon';
import { t } from '../i18n';

interface Props {
  best: number;
  onStart: () => void;
  onOpenLeaderboard: () => void;
}

// Mini demo: a pig head arcs up while a swipe trail sweeps through it,
// then two halves with visible pink meat insides fall apart. Loops.
function MiniDemo() {
  return (
    <div className="es-demo" aria-hidden>
      <svg className="es-demo__svg" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="es-demo-pig" cx="0.36" cy="0.32">
            <stop offset="0%"  stopColor="#ffe2e8"/>
            <stop offset="100%" stopColor="#ffc7c7"/>
          </radialGradient>
        </defs>

        {/* "No-butcher" sign decoy bottom-right (bomb) */}
        <g className="es-demo__bomb-sign" transform="translate(295, 165)">
          <circle r="20" fill="#ff3340"/>
          <circle r="15" fill="none" stroke="#fff" strokeWidth="4"/>
          <rect x="-12" y="-5" width="24" height="10" fill="#fff" transform="rotate(45)"/>
        </g>

        {/* Whole pig head (arcing up) */}
        <g className="es-demo__char">
          {/* ears */}
          <ellipse cx="-16" cy="-19" rx="6" ry="9" fill="#e2a4a4" transform="rotate(-30 -16 -19)"/>
          <ellipse cx="16"  cy="-19" rx="6" ry="9" fill="#e2a4a4" transform="rotate(30 16 -19)"/>
          {/* head */}
          <circle r="28" fill="url(#es-demo-pig)" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5"/>
          {/* snout */}
          <ellipse cy="9" rx="14" ry="9" fill="#ff9aa6" stroke="rgba(170,80,90,0.5)" strokeWidth="1"/>
          <ellipse cx="-4" cy="9" rx="2" ry="3.5" fill="#a06070"/>
          <ellipse cx="4"  cy="9" rx="2" ry="3.5" fill="#a06070"/>
          {/* eyes */}
          <circle cx="-8" cy="-4" r="2.5" fill="#1a1a1a"/>
          <circle cx="8"  cy="-4" r="2.5" fill="#1a1a1a"/>
        </g>

        {/* Half pieces flying apart after slice */}
        <g className="es-demo__half es-demo__half--l">
          {/* clipped top half of pig + flesh strip */}
          <path d="M -28 0 A 28 28 0 0 1 28 0 Z" fill="url(#es-demo-pig)"/>
          <ellipse cy="0" rx="26" ry="10" fill="#ffd8e0"/>
          <ellipse cy="0" rx="22" ry="8"  fill="#e8506a"/>
          <ellipse cy="4" rx="4"  ry="2.5" fill="#fff"/>
          <line x1="-28" y1="0" x2="28" y2="0" stroke="rgba(0,0,0,0.6)" strokeWidth="1.5"/>
        </g>
        <g className="es-demo__half es-demo__half--r">
          <path d="M -28 0 A 28 28 0 0 0 28 0 Z" fill="url(#es-demo-pig)"/>
          <ellipse cy="0" rx="26" ry="10" fill="#ffd8e0"/>
          <ellipse cy="0" rx="22" ry="8"  fill="#e8506a"/>
          <ellipse cy="-4" rx="4" ry="2.5" fill="#fff"/>
          <line x1="-28" y1="0" x2="28" y2="0" stroke="rgba(0,0,0,0.6)" strokeWidth="1.5"/>
        </g>

        {/* Swipe trail */}
        <path className="es-demo__trail" d="M 30 60 Q 180 140 320 80" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round"/>
      </svg>
      <div className="es-demo__finger">
        <TouchAppIcon className="es-demo__finger-icon" />
      </div>
    </div>
  );
}

export function StartScreen({ best, onStart, onOpenLeaderboard }: Props) {
  return (
    <div className="es-overlay es-overlay--start" onPointerDown={onStart}>
      <div className="es-overlay__inner">
        <div className="es-title">{t('title')}</div>
        <div className="es-tagline">{t('tagline')}</div>
        <MiniDemo />
        <div className="es-cta">
          <TouchAppIcon className="es-cta__finger" />
          <span>{t('tap_to_start')}</span>
        </div>
        {best > 0 && <div className="es-best">{t('best')}: {best}</div>}
        <button
          className="es-link"
          onPointerDown={(e) => { e.stopPropagation(); onOpenLeaderboard(); }}
        >
          {t('leaderboard')}
        </button>
      </div>
    </div>
  );
}
