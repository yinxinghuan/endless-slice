import { TouchAppIcon } from './TouchAppIcon';
import { t } from '../i18n';

interface Props {
  best: number;
  onStart: () => void;
  onOpenLeaderboard: () => void;
}

// Mini demo: a tomato arcs up while a sweeping swipe-trail crosses it,
// splitting it into two halves. Loops.
function MiniDemo() {
  return (
    <div className="es-demo" aria-hidden>
      <svg className="es-demo__svg" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="es-demo-tomato" cx="0.4" cy="0.4">
            <stop offset="0%" stopColor="#ff7670"/>
            <stop offset="100%" stopColor="#e23b3b"/>
          </radialGradient>
        </defs>
        {/* Bomb decoy (won't be sliced in demo) */}
        <circle className="es-demo__bomb" cx="280" cy="160" r="18" fill="#2a2a2e"/>
        <line className="es-demo__fuse" x1="288" y1="146" x2="295" y2="132" stroke="#8a6b3a" strokeWidth="2.5" strokeLinecap="round"/>
        <circle className="es-demo__spark" cx="297" cy="130" r="3" fill="#ffd24a"/>

        {/* Tomato arcing up */}
        <g className="es-demo__tomato">
          <circle r="22" fill="url(#es-demo-tomato)"/>
          <ellipse cx="0" cy="-22" rx="8" ry="4" fill="#3aa84a"/>
        </g>

        {/* Half pieces flying away */}
        <g className="es-demo__half-l">
          <path d="M -22 0 A 22 22 0 0 1 22 0 Z" fill="#e23b3b"/>
          <ellipse cx="0" cy="0" rx="20" ry="6" fill="#ff9a8a"/>
        </g>
        <g className="es-demo__half-r">
          <path d="M -22 0 A 22 22 0 0 1 22 0 Z" fill="#e23b3b"/>
          <ellipse cx="0" cy="0" rx="20" ry="6" fill="#ff9a8a"/>
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
