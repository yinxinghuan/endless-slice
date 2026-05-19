import { TouchAppIcon } from './TouchAppIcon';
import { t } from '../i18n';

/**
 * Looping demo of the swipe-slice gesture, shown over the live game until the
 * user makes their first pointer-down. Pointer-events disabled so it never
 * blocks a real swipe.
 *
 * Per memory: instant-play tutorials must LOOP (Aigram preloads tiles, a
 * single-shot demo would already be over by the time the user lands on the
 * tile and they'd only see the parked end frame).
 */
export function TutorialOverlay() {
  return (
    <div className="es-tutorial" aria-hidden>
      <svg className="es-tutorial__svg" viewBox="0 0 360 600" preserveAspectRatio="xMidYMid meet">
        <path
          className="es-tutorial__trail"
          d="M 60 380 Q 180 280 300 380"
          fill="none"
          stroke="#fff"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </svg>
      <div className="es-tutorial__finger">
        <TouchAppIcon className="es-tutorial__finger-icon" />
      </div>
      <div className="es-tutorial__label">
        <span className="es-tutorial__label-line">{t('tut_line1')}</span>
        <span className="es-tutorial__label-line es-tutorial__label-line--small">{t('tut_line2')}</span>
      </div>
    </div>
  );
}
