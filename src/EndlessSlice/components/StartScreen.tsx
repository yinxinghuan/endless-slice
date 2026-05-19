import { TouchAppIcon } from './TouchAppIcon';
import { t } from '../i18n';

interface Props {
  best: number;
  onStart: () => void;
  onOpenLeaderboard: () => void;
}

// Mini demo: a chicken arcs up, swipe sweeps, halves with ham cross-section
// fall apart. A puppy decoy sits in the corner (don't slice the pet!).
function MiniDemo() {
  return (
    <div className="es-demo" aria-hidden>
      <svg className="es-demo__svg" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="es-demo-chick" cx="0.36" cy="0.32">
            <stop offset="0%"  stopColor="#fff4b8"/>
            <stop offset="100%" stopColor="#ffe884"/>
          </radialGradient>
          <radialGradient id="es-demo-pup" cx="0.36" cy="0.32">
            <stop offset="0%"  stopColor="#ffe2a8"/>
            <stop offset="100%" stopColor="#f0c878"/>
          </radialGradient>
        </defs>

        {/* PUPPY decoy bottom-right — DON'T slice */}
        <g className="es-demo__bomb-sign">
          {/* body */}
          <ellipse cx="0" cy="0" rx="22" ry="14" fill="url(#es-demo-pup)" stroke="rgba(0,0,0,0.4)" strokeWidth="1"/>
          {/* head */}
          <circle cx="18" cy="-9" r="13" fill="url(#es-demo-pup)" stroke="rgba(0,0,0,0.4)" strokeWidth="1"/>
          {/* ears */}
          <ellipse cx="11" cy="-12" rx="5" ry="9" fill="#9c5418" transform="rotate(-20 11 -12)"/>
          <ellipse cx="25" cy="-12" rx="5" ry="9" fill="#9c5418" transform="rotate(20 25 -12)"/>
          {/* nose + tongue */}
          <circle cx="26" cy="-7" r="2.4" fill="#1a1a1a"/>
          <ellipse cx="22" cy="-1" rx="3" ry="4" fill="#ff6b8e"/>
          {/* eyes */}
          <circle cx="14" cy="-11" r="1.8" fill="#1a1a1a"/>
          <circle cx="22" cy="-11" r="1.8" fill="#1a1a1a"/>
          {/* collar */}
          <ellipse cx="11" cy="0" rx="5" ry="2" fill="#3aa0ff" transform="rotate(10 11 0)"/>
        </g>

        {/* Chicken (whole, arcing up) */}
        <g className="es-demo__char">
          {/* tail feathers */}
          <path d="M -16 -2 Q -28 -14 -22 -2 Q -28 4 -16 4 Z" fill="#caa848"/>
          {/* body */}
          <ellipse cx="0" cy="0" rx="16" ry="15" fill="url(#es-demo-chick)" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5"/>
          {/* legs */}
          <line x1="-3" y1="11" x2="-5" y2="20" stroke="#e0721a" strokeWidth="2" strokeLinecap="round"/>
          <line x1="3"  y1="11" x2="4"  y2="20" stroke="#e0721a" strokeWidth="2" strokeLinecap="round"/>
          {/* head */}
          <circle cx="5" cy="-14" r="7" fill="url(#es-demo-chick)" stroke="rgba(0,0,0,0.4)" strokeWidth="1.5"/>
          {/* comb */}
          <path d="M 1 -22 a 3 3 0 0 1 6 0 a 3 3 0 0 1 6 0" fill="#ff3a1a"/>
          {/* beak */}
          <polygon points="11,-13 16,-12 11,-10" fill="#e0721a"/>
          {/* eye */}
          <circle cx="7" cy="-15" r="1.6" fill="#1a1a1a"/>
        </g>

        {/* Half pieces flying apart after slice */}
        <g className="es-demo__half es-demo__half--l">
          <path d="M -16 0 A 16 16 0 0 1 16 0 Z" fill="url(#es-demo-chick)"/>
          <ellipse cy="0" rx="15" ry="6" fill="#fff0e0"/>
          <ellipse cy="0" rx="13" ry="5" fill="#ffb494"/>
          <ellipse cy="2.5" rx="2" ry="1.5" fill="#fffaf2"/>
          <line x1="-16" y1="0" x2="16" y2="0" stroke="rgba(0,0,0,0.6)" strokeWidth="1.5"/>
        </g>
        <g className="es-demo__half es-demo__half--r">
          <path d="M -16 0 A 16 16 0 0 0 16 0 Z" fill="url(#es-demo-chick)"/>
          <ellipse cy="0" rx="15" ry="6" fill="#fff0e0"/>
          <ellipse cy="0" rx="13" ry="5" fill="#ffb494"/>
          <ellipse cy="-2.5" rx="2" ry="1.5" fill="#fffaf2"/>
          <line x1="-16" y1="0" x2="16" y2="0" stroke="rgba(0,0,0,0.6)" strokeWidth="1.5"/>
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
        <div className="es-stamp-bar">
          <span>GRADE A</span>
          <span>EST. 2026</span>
          <span>DAILY FRESH</span>
        </div>
        <div className="es-title">{t('title')}</div>
        <div className="es-tagline">{t('tagline')}</div>
        <MiniDemo />
        <div className="es-cta">
          <TouchAppIcon className="es-cta__finger" />
          <span>{t('tap_to_start')}</span>
        </div>
        {best > 0 && <div className="es-best">{t('best')} · {best}</div>}
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
