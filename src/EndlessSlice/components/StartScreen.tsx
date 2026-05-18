import { TouchAppIcon } from './TouchAppIcon';
import { t } from '../i18n';

interface Props {
  best: number;
  onStart: () => void;
  onOpenLeaderboard: () => void;
}

// Mini demo: a baguette with 6 slash marks appearing rapid-fire, with a finger
// pulsing at each. Loops forever until first tap.
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
        {/* Slash marks appearing in sequence */}
        {[80, 120, 160, 200, 240, 280].map((x, i) => (
          <line
            key={x}
            className={`es-demo__slash es-demo__slash--${i}`}
            x1={x} y1="42" x2={x} y2="106"
            stroke="#ffd24a" strokeWidth="3"
          />
        ))}
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
