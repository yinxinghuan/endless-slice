import { useEffect, useState } from 'react';
import { useEndlessSlice } from './hooks/useEndlessSlice';
import { EndScreen } from './components/EndScreen';
import { TutorialOverlay } from './components/TutorialOverlay';
import { CircusHeart } from './components/CircusHeart';
import { useGameScore, Leaderboard } from '@shared/leaderboard';
import { t } from './i18n';
import alteruUrl from './img/alteru.svg';
import './EndlessSlice.less';

export default function EndlessSlice() {
  const {
    canvasRef,
    screen, score, lives, comboInSwipe, tierLabel, missLabel, best, stats, hasInteracted,
    start,
    onPointerDown, onPointerMove, onPointerUp,
  } = useEndlessSlice();

  const { isInAigram, submitScore, fetchGlobalLeaderboard, fetchFriendsLeaderboard } =
    useGameScore('endless-slice');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  // Tutorial loops on every fresh round until the player makes their first
  // pointer-down. No localStorage gating — the demo should always be there
  // when the game is asking for input.
  const showTutorial = !hasInteracted;

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
      {/* Title is drawn directly onto the canvas as a debossed watermark. */}

      {screen === 'playing' && (
        <>
          <div className="es-hud es-hud--top">
            <div className="es-hud__cell">
              <div className="es-hud__label">{t('score')}</div>
              <div className="es-hud__value">{score}</div>
            </div>
            <div className="es-hud__cell es-hud__cell--right">
              <div className="es-lives-placard" aria-label={`Lives ${lives} of 3`}>
                <span className="es-lives-placard__notch es-lives-placard__notch--l" aria-hidden />
                <span className="es-lives-placard__notch es-lives-placard__notch--r" aria-hidden />
                <div className="es-lives-placard__label">LIVES</div>
                <div className="es-lives-placard__row">
                  {[0, 1, 2].map(i => (
                    <CircusHeart key={i} on={i < lives} index={i} />
                  ))}
                </div>
              </div>
              <div className="es-hud__label es-hud__label--right">{t('best')} · {best}</div>
            </div>
          </div>
          {comboInSwipe >= 2 && (
            <div className={`es-combo es-combo--${Math.min(comboInSwipe, 15)}`}>
              <span className="es-combo__x">×</span>
              <span className="es-combo__n">{comboInSwipe}</span>
            </div>
          )}
          {tierLabel && (
            <div key={tierLabel + score} className={`es-tier es-tier--${tierLabel.toLowerCase()}`}>
              {tierLabel}
            </div>
          )}
          {missLabel && (
            <div key={missLabel + lives} className="es-miss-banner">{missLabel}</div>
          )}
          {showTutorial && <TutorialOverlay />}
        </>
      )}

      {screen === 'end' && (
        <EndScreen
          stats={stats}
          best={best}
          onAgain={start}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
        />
      )}

      {showLeaderboard && (
        <Leaderboard
          gameName="Farm to Table"
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
