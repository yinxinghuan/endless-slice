import { t } from '../i18n';
import type { Stats } from '../types';

interface Props {
  stats: Stats;
  best: number;
  onAgain: () => void;
  onOpenLeaderboard: () => void;
}

export function EndScreen({ stats, best, onAgain, onOpenLeaderboard }: Props) {
  return (
    <div className="es-overlay es-overlay--end">
      <div className="es-overlay__inner">
        <div className="es-stamp-bar">
          <span>RECEIPT</span>
          <span>NO. {Math.floor(stats.finalScore / 7) || 1}</span>
          <span>PAID IN FULL</span>
        </div>
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
