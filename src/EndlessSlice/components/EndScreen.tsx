import { useEffect, useMemo, useRef } from 'react';
import { t } from '../i18n';
import type { FlyKind, Stats } from '../types';
import { VISUALS } from '../utils/food';
import { drawSlainPetScene } from '../utils/draw';

// Random flavor — re-rolled every time a fresh EndScreen mounts.
const KILLED_LEAD = ['OH NO',  'CRUELTY!', 'BUTCHER!', 'WOOF!',  'YOU MONSTER'];
const KILLED_TAIL = ['BAD KARMA', 'NO PETS!', 'BANNED', 'RSPCA INBOUND', 'OFF THE MENU'];
const CLEAN_LEAD  = ['RECEIPT', 'LEDGER',  'BUTCHER LOG', 'DAILY TALLY', 'STOCK SLIP'];
const CLEAN_TAIL  = ['PAID IN FULL', 'GRADE A WORK', 'WELL DONE', 'FRESH STOCK', 'CLEAN CUT'];
const KILLED_STAMPS = ['VOID', 'BANNED', 'CRUEL!', 'OUCH!', 'RIP', 'NOPE'];
const CLEAN_STAMPS  = ['PAID', 'A+',      'GRADE A', 'FRESH', 'TOP CUT', 'CHOICE'];

function pickOne<T>(xs: T[]): T { return xs[Math.floor(Math.random() * xs.length)]; }

/** Random signed angle whose magnitude is guaranteed to be at least `min`,
 *  up to `max`. Avoids the "almost 0°" range that reads as a rendering bug. */
function strongTilt(min: number, max: number): number {
  const sign = Math.random() < 0.5 ? -1 : 1;
  return sign * (min + Math.random() * (max - min));
}

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
  // Random flavor — rolled once per EndScreen mount so re-renders stay stable.
  const flavor = useMemo(() => {
    const isKilled = !!killed;
    return {
      lead: pickOne(isKilled ? KILLED_LEAD : CLEAN_LEAD),
      tail: pickOne(isKilled ? KILLED_TAIL : CLEAN_TAIL),
      stampWord: pickOne(isKilled ? KILLED_STAMPS : CLEAN_STAMPS),
      // Receipt always sits clearly off-axis — never near 0° (looks like a bug).
      tilt: strongTilt(4, 7).toFixed(2),
      // Stamp seal floats at a random corner-ish position with a strong tilt.
      stampX: 64 + Math.random() * 22,   // 64–86 %
      stampY: 56 + Math.random() * 22,   // 56–78 %
      stampAngle: strongTilt(12, 24).toFixed(1),
      // Receipt serial — non-sequential so it reads "ticket roll" rather than "score / 7"
      serial: String(1000 + Math.floor(Math.random() * 8999)).padStart(4, '0'),
    };
  }, [killed]);

  return (
    <div className="es-overlay es-overlay--end">
      <div
        className="es-overlay__inner"
        style={{ transform: `rotate(${flavor.tilt}deg)` }}
      >
        <span className="es-overlay__notch es-overlay__notch--tl" aria-hidden />
        <span className="es-overlay__notch es-overlay__notch--tr" aria-hidden />
        <span className="es-overlay__notch es-overlay__notch--bl" aria-hidden />
        <span className="es-overlay__notch es-overlay__notch--br" aria-hidden />
        <div className="es-stamp-bar">
          <span>{flavor.lead}</span>
          <span>NO. {flavor.serial}</span>
          <span>{flavor.tail}</span>
        </div>
        {/* Random ink stamp at a random corner */}
        <div
          className={`es-ink-stamp ${killed ? 'es-ink-stamp--bad' : 'es-ink-stamp--good'}`}
          style={{
            left: `${flavor.stampX}%`,
            top: `${flavor.stampY}%`,
            transform: `translate(-50%, -50%) rotate(${flavor.stampAngle}deg)`,
          }}
          aria-hidden
        >
          {flavor.stampWord}
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
