import { TouchAppIcon } from './TouchAppIcon';
import { t } from '../i18n';

interface Props {
  best: number;
  onStart: () => void;
  onOpenLeaderboard: () => void;
}

// Mini animated demo: a baguette, 3 dashed target marks, a sweeping scan line,
// and a touch_app finger that pulses at each mark in sync. Loops forever.
function MiniDemo() {
  return (
    <div className="es-demo" aria-hidden>
      <svg className="es-demo__svg" viewBox="0 0 360 130" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="es-demo-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f4dca5"/>
            <stop offset="55%" stopColor="#e8c885"/>
            <stop offset="100%" stopColor="#a06f3a"/>
          </linearGradient>
        </defs>
        {/* Board */}
        <rect x="6" y="35" width="348" height="78" rx="10" fill="#7a5230"/>
        <rect x="6" y="35" width="348" height="78" rx="10" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="1.5"/>
        {/* Baguette */}
        <rect x="40" y="50" width="280" height="48" rx="24" fill="url(#es-demo-body)"/>
        {/* Target marks */}
        <line x1="110" y1="42" x2="110" y2="106" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeDasharray="4 3"/>
        <line x1="180" y1="42" x2="180" y2="106" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeDasharray="4 3"/>
        <line x1="250" y1="42" x2="250" y2="106" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeDasharray="4 3"/>
        {/* Scan line */}
        <line className="es-demo__scan" x1="0" y1="38" x2="0" y2="110" stroke="#ffd24a" strokeWidth="2.5"/>
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
