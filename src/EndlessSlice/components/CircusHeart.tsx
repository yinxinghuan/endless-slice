/**
 * A "circus tent" heart icon for the lives placard:
 *   - Body filled with red + cream vertical stripes (clipped to the heart)
 *   - Thick gold outline
 *   - Off-state: faded cream silhouette (no stripes), thinner cream outline
 *
 * Each instance needs a unique clipPath id, which the index prop provides.
 */
const HEART_PATH =
  'M12 21s-7.5-4.8-9.6-9.2C.7 7.4 4 3 8.2 3c2 0 3.4 1 3.8 2.2C12.4 4 13.8 3 15.8 3 20 3 23.3 7.4 21.6 11.8 19.5 16.2 12 21 12 21z';

export function CircusHeart({ on, index }: { on: boolean; index: number }) {
  const cid = `es-heart-clip-${index}`;
  return (
    <svg
      className={`es-heart ${on ? 'es-heart--on' : 'es-heart--off'}`}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <defs>
        <clipPath id={cid}>
          <path d={HEART_PATH} />
        </clipPath>
      </defs>
      {on && (
        <g clipPath={`url(#${cid})`}>
          {/* red ground */}
          <rect x="0" y="0" width="24" height="24" fill="#b81818" />
          {/* cream stripes (tent panels) */}
          <rect x="3"  y="0" width="3" height="24" fill="#f5e8c8" />
          <rect x="9"  y="0" width="3" height="24" fill="#f5e8c8" />
          <rect x="15" y="0" width="3" height="24" fill="#f5e8c8" />
        </g>
      )}
      {/* Outline (gold on-state, ghost cream off-state) */}
      <path
        d={HEART_PATH}
        fill={on ? 'none' : 'rgba(245, 232, 200, 0.18)'}
        stroke={on ? '#ffd24a' : 'rgba(245, 232, 200, 0.35)'}
        strokeWidth={on ? 1.8 : 1.2}
        strokeLinejoin="round"
      />
    </svg>
  );
}
