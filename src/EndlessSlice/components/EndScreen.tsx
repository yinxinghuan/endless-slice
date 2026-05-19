import { t } from '../i18n';
import type { FlyKind, Stats } from '../types';

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

export function EndScreen({ stats, best, onAgain, onOpenLeaderboard }: Props) {
  const sliced = !!stats.killedPet;
  return (
    <div className="es-overlay es-overlay--end">
      <div className="es-overlay__inner">
        <div className="es-stamp-bar">
          {sliced ? (
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

        {sliced && (
          <div className="es-pet-rip">
            <div className="es-pet-rip__big">YOU SLICED</div>
            <div className="es-pet-rip__pet">THE {petLabel(stats.killedPet)}</div>
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
