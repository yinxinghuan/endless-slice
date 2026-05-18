import type { FlyKind, FlyerVisual } from '../types';

// Design-unit values, scaled to device-px at draw time.
export const VISUALS: Record<FlyKind, FlyerVisual> = {
  tomato: {
    body: '#e23b3b', flesh: '#ff9a8a', accent: '#3aa84a',
    radius: 70, seeds: 6,
  },
  banana: {
    body: '#f5c63a', flesh: '#fff4c6', accent: '#7a5a18',
    radius: 75, seeds: 0,
  },
  cucumber: {
    body: '#3f8a4a', flesh: '#dff5cf', accent: '#1f5b2a',
    radius: 72, seeds: 4,
  },
  watermelon: {
    body: '#2a8a36', flesh: '#ff5466', accent: '#0e1408',
    radius: 92, seeds: 7,
  },
  orange: {
    body: '#ff8a2c', flesh: '#ffd49a', accent: '#a04a10',
    radius: 70, seeds: 0,
  },
  sushi: {
    body: '#1a1a1a', flesh: '#f6f0d8', accent: '#e23b3b',
    radius: 66, seeds: 0,
  },
  golden: {
    body: '#ffd24a', flesh: '#fff4c6', accent: '#a86a10',
    radius: 64, seeds: 5,
  },
  bomb: {
    body: '#222226', flesh: '#3a3a3e', accent: '#ff5a2c',
    radius: 64, seeds: 0,
  },
};

export const ALL_FOODS: FlyKind[] = ['tomato', 'banana', 'cucumber', 'watermelon', 'orange', 'sushi'];

export function isBomb(kind: FlyKind): boolean { return kind === 'bomb'; }
export function isGolden(kind: FlyKind): boolean { return kind === 'golden'; }

/** Spawn budget over time: returns the spawn interval (s) and bomb-rate (0..1) at time t (s). */
export function difficulty(t: number) {
  // Spawn interval shrinks from 1.05s → 0.45s over ~75s
  const spawnInterval = Math.max(0.45, 1.05 - t * 0.008);
  // Bomb rate grows from 0% → 18% over ~90s
  const bombRate = Math.min(0.18, t * 0.002);
  // Golden bonus appears occasionally
  const goldenRate = Math.min(0.08, 0.02 + t * 0.0008);
  // Wave size: 1..3 flyers per spawn
  const waveMin = 1;
  const waveMax = Math.min(3, 1 + Math.floor(t / 18));
  return { spawnInterval, bombRate, goldenRate, waveMin, waveMax };
}

/** Pick a random foody kind (no bomb, no golden). */
export function pickFood(rng: () => number): FlyKind {
  return ALL_FOODS[Math.floor(rng() * ALL_FOODS.length)];
}
