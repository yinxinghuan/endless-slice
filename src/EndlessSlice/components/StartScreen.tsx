import { TouchAppIcon } from './TouchAppIcon';
import { t } from '../i18n';
import tralaleroUrl from '../img/sprites/tralalero.png';
import bombardiroUrl from '../img/sprites/bombardiro.png';

interface Props {
  best: number;
  onStart: () => void;
  onOpenLeaderboard: () => void;
}

// Mini demo: a tralalero arcs up while a swipe sweeps; halves fling apart.
function MiniDemo() {
  return (
    <div className="es-demo" aria-hidden>
      {/* Bombardiro corner decoy */}
      <img className="es-demo__bombardiro" src={bombardiroUrl} alt="" />
      {/* Whole tralalero arcs up, then vanishes at the swipe moment */}
      <img className="es-demo__char" src={tralaleroUrl} alt="" />
      {/* Two halves that pop in at the swipe moment and fly apart (visual fake — same sprite, offset) */}
      <img className="es-demo__half es-demo__half--l" src={tralaleroUrl} alt="" />
      <img className="es-demo__half es-demo__half--r" src={tralaleroUrl} alt="" />
      {/* Swipe trail */}
      <svg className="es-demo__trail-svg" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid meet">
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
