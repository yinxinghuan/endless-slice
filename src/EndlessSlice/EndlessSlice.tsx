import { useEffect, useState } from 'react';
import { useEndlessSlice } from './hooks/useEndlessSlice';
import { StartScreen } from './components/StartScreen';
import { EndScreen } from './components/EndScreen';
import { useGameScore, Leaderboard } from '@shared/leaderboard';
import { t } from './i18n';
import alteruUrl from './img/alteru.svg';
import './EndlessSlice.less';

export default function EndlessSlice() {
  const {
    canvasRef,
    screen, score, combo, best, stats,
    start, home, handleTap,
  } = useEndlessSlice();

  const { isInAigram, submitScore, fetchGlobalLeaderboard, fetchFriendsLeaderboard } =
    useGameScore('endless-slice');
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  useEffect(() => {
    if (screen === 'end' && stats.finalScore > 0) {
      submitScore(stats.finalScore);
    }
  }, [screen, stats.finalScore, submitScore]);

  return (
    <div
      className="es-root"
      onPointerDown={(e) => {
        // Only register a slice when the pointer hits the canvas/play area.
        // Overlays handle their own clicks.
        if (screen === 'playing') {
          handleTap();
          e.preventDefault();
        }
      }}
    >
      <canvas ref={canvasRef} className="es-canvas" />

      {screen === 'playing' && (
        <>
          <div className="es-hud es-hud--top">
            <div className="es-hud__cell">
              <div className="es-hud__label">{t('score')}</div>
              <div className="es-hud__value">{score}</div>
            </div>
            <div className="es-hud__cell es-hud__cell--right">
              <div className="es-hud__label">{t('best')}</div>
              <div className="es-hud__value">{best}</div>
            </div>
          </div>
          {combo >= 2 && (
            <div className={`es-combo es-combo--${Math.min(combo, 12)}`}>
              {t('combo', { n: combo })}
            </div>
          )}
        </>
      )}

      {screen === 'start' && (
        <StartScreen
          best={best}
          onStart={start}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
        />
      )}
      {screen === 'end' && (
        <EndScreen
          stats={stats}
          best={best}
          onAgain={start}
          onHome={home}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
        />
      )}

      {showLeaderboard && (
        <Leaderboard
          gameName="Endless Slice"
          onClose={() => setShowLeaderboard(false)}
          fetchGlobal={fetchGlobalLeaderboard}
          fetchFriends={fetchFriendsLeaderboard}
          isInAigram={isInAigram}
        />
      )}

      <img className="es-watermark" src={alteruUrl} alt="" />
    </div>
  );
}
