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
    screen, score, lives, comboInSwipe, best, stats,
    start, home,
    onPointerDown, onPointerMove, onPointerUp,
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
        if (screen === 'playing') {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          onPointerDown(e.clientX, e.clientY);
          e.preventDefault();
        }
      }}
      onPointerMove={(e) => {
        if (screen === 'playing') onPointerMove(e.clientX, e.clientY);
      }}
      onPointerUp={() => {
        if (screen === 'playing') onPointerUp();
      }}
      onPointerCancel={() => {
        if (screen === 'playing') onPointerUp();
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
              <div className="es-hud__lives">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className={`es-heart ${i < lives ? 'es-heart--on' : 'es-heart--off'}`}
                    aria-hidden
                  >
                    <svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.8-9.6-9.2C.7 7.4 4 3 8.2 3c2 0 3.4 1 3.8 2.2C12.4 4 13.8 3 15.8 3 20 3 23.3 7.4 21.6 11.8 19.5 16.2 12 21 12 21z"/></svg>
                  </span>
                ))}
              </div>
              <div className="es-hud__label es-hud__label--right">{t('best')}: {best}</div>
            </div>
          </div>
          {comboInSwipe >= 2 && (
            <div className={`es-combo es-combo--${Math.min(comboInSwipe, 10)}`}>
              ×{comboInSwipe}
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
