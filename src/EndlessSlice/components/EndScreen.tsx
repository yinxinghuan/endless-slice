import { useEffect, useRef } from 'react';
import { t } from '../i18n';
import type { FlyKind, Stats } from '../types';
import { VISUALS } from '../utils/food';
import { drawSlainPetScene } from '../utils/draw';

interface Props {
  stats: Stats;
  best: number;
  onAgain: () => void;
  onOpenLeaderboard: () => void;
}

const PET_NAME: Record<string, string> = {
  puppy:   'PUPPY',
  kitten:  'KITTEN',
  bunny:   'BUNNY',
  hamster: 'HAMSTER',
};

function petLabel(k: FlyKind | null): string {
  return k ? (PET_NAME[k] || 'PET') : 'PET';
}

/** A small canvas that paints a memorial scene of the slain pet. */
function SlainPetCanvas({ kind }: { kind: FlyKind }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    drawSlainPetScene(ctx, kind, VISUALS[kind], cssW, cssH);
  }, [kind]);
  return <canvas ref={ref} className="es-pet-canvas" />;
}

export function EndScreen({ stats, best, onAgain, onOpenLeaderboard }: Props) {
  const killed = stats.killedPet;
  return (
    <div className="es-overlay es-overlay--end">
      <div className="es-overlay__inner">
        <span className="es-overlay__notch es-overlay__notch--tl" aria-hidden />
        <span className="es-overlay__notch es-overlay__notch--tr" aria-hidden />
        <span className="es-overlay__notch es-overlay__notch--bl" aria-hidden />
        <span className="es-overlay__notch es-overlay__notch--br" aria-hidden />
        <div className="es-stamp-bar">
          {killed ? (
            <>
              <span>OH NO</span>
              <span>·</span>
              <span>BAD KARMA</span>
            </>
          ) : (
            <>
              <span>RECEIPT</span>
              <span>NO. {Math.floor(stats.finalScore / 7) || 1}</span>
              <span>PAID IN FULL</span>
            </>
          )}
        </div>

        {killed && (
          <div className="es-pet-rip">
            <div className="es-pet-rip__big">YOU SLICED</div>
            <SlainPetCanvas kind={killed} />
            <div className="es-pet-rip__pet">THE {petLabel(killed)}</div>
            <div className="es-pet-rip__small">— pets are not on the menu —</div>
          </div>
        )}

        {stats.isNewBest && <div className="es-new-best">{t('new_best')}</div>}
        <div className="es-final">
          <div className="es-final__label">{t('final_score')}</div>
          <div className="es-final__value">{stats.finalScore}</div>
        </div>
        <div className="es-stats es-stats--3">
          <div className="es-stats__cell">
            <div className="es-stats__label">{t('best')}</div>
            <div className="es-stats__value">{best}</div>
          </div>
          <div className="es-stats__cell">
            <div className="es-stats__label">{t('sliced')}</div>
            <div className="es-stats__value">{stats.sliced}</div>
          </div>
          <div className="es-stats__cell">
            <div className="es-stats__label">{t('max_combo')}</div>
            <div className="es-stats__value">×{stats.maxCombo}</div>
          </div>
        </div>
        <div className="es-buttons">
          <button className="es-btn es-btn--primary" onPointerDown={onAgain}>{t('again')}</button>
          <button className="es-btn es-btn--ghost" onPointerDown={onOpenLeaderboard}>{t('leaderboard')}</button>
        </div>
      </div>
    </div>
  );
}
