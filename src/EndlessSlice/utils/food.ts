import type { FlyKind, FlyerVisual } from '../types';

// `radius` here = effective bounding half-size for hit detection.
// Full-body animals have horizontal extents up to ~1.4×r in width and ~r in height.
export const VISUALS: Record<FlyKind, FlyerVisual> = {
  chicken: {
    radius: 76,
    body:   '#ffe884',
    accent: '#ff3a1a',
    dark:   '#e0721a',
    flesh:  '#ffb494',
    fat:    '#fff0e0',
    bone:   '#fffaf2',
    flash:  '#ffe884',
  },
  duck: {
    radius: 92,
    body:   '#fff080',
    accent: '#ff8025',
    dark:   '#b85008',
    flesh:  '#a04030',
    fat:    '#ffe0c0',
    bone:   '#fffaf2',
    flash:  '#ffd24a',
  },
  pig: {
    radius: 130,
    body:   '#ffc7c7',
    accent: '#ff9aa6',
    dark:   '#a06070',
    flesh:  '#e8506a',
    fat:    '#ffd8e0',
    bone:   '#fffaf2',
    flash:  '#ff7090',
  },
  sheep: {
    radius: 158,
    body:   '#fbf3df',
    accent: '#1a1a1a',
    dark:   '#3a2a1a',
    flesh:  '#b32a48',
    fat:    '#ffe5d8',
    bone:   '#fffaf2',
    flash:  '#fff0e0',
  },
  cow: {
    radius: 215,
    body:   '#fafafa',
    accent: '#1d1d1f',
    dark:   '#a07a4a',
    flesh:  '#a02238',
    fat:    '#ffe5d6',
    bone:   '#fffaf2',
    flash:  '#ff6a6a',
  },
  wagyu: {
    radius: 72,
    body:   '#b8253a',
    accent: '#ffd24a',
    dark:   '#fff0f0',
    flesh:  '#a02238',
    fat:    '#fff0d8',
    bone:   '#fffaf2',
    flash:  '#ffd24a',
  },
  puppy: {
    radius: 110,
    body:   '#f0c878',   // golden retriever tan
    accent: '#9c5418',   // dark muzzle / ear tips
    dark:   '#3a3a3a',
    flesh:  '#ff9090',
    fat:    '#fff0e0',
    bone:   '#fffaf2',
    flash:  '#ff5050',
  },
  kitten: {
    radius: 96,
    body:   '#b8b4ad',
    accent: '#5a564f',
    dark:   '#3a3a3a',
    flesh:  '#ff9090',
    fat:    '#fff0e0',
    bone:   '#fffaf2',
    flash:  '#ff5050',
  },
  bunny: {
    radius: 92,
    body:   '#fcfcfc',
    accent: '#ffd0e0',
    dark:   '#1a1a1a',
    flesh:  '#ff9090',
    fat:    '#fff0e0',
    bone:   '#fffaf2',
    flash:  '#ff5050',
  },
  hamster: {
    radius: 72,
    body:   '#e89e58',
    accent: '#fff4d8',
    dark:   '#3a2a18',
    flesh:  '#ff9090',
    fat:    '#fff0e0',
    bone:   '#fffaf2',
    flash:  '#ff5050',
  },
};

export const REGULAR_KINDS: FlyKind[] = ['chicken', 'duck', 'pig', 'sheep', 'cow'];
export const PET_KINDS: FlyKind[] = ['puppy', 'kitten', 'bunny', 'hamster'];

export function isBomb(kind: FlyKind): boolean { return PET_KINDS.includes(kind); }
export function isGolden(kind: FlyKind): boolean { return kind === 'wagyu'; }

export function pickPet(rng: () => number): FlyKind {
  return PET_KINDS[Math.floor(rng() * PET_KINDS.length)];
}

export function baseScoreFor(kind: FlyKind): number {
  const r = VISUALS[kind].radius;
  if (r >= 160) return 25;  // cow — biggest, highest base
  if (r >= 120) return 18;  // sheep
  if (r >= 100) return 14;  // pig
  if (r <= 70)  return 8;   // chicken / small
  return 11;                // duck
}

export function pickRegular(rng: () => number): FlyKind {
  // Weighted: smaller animals appear more often, cow rare → bigger reward
  const weights: Array<[FlyKind, number]> = [
    ['chicken', 10],
    ['duck',     9],
    ['pig',      8],
    ['sheep',    6],
    ['cow',      4],
  ];
  const total = weights.reduce((a, [, w]) => a + w, 0);
  let r = rng() * total;
  for (const [k, w] of weights) {
    r -= w;
    if (r <= 0) return k;
  }
  return weights[0][0];
}

export function difficulty(t: number) {
  const spawnInterval = Math.max(0.42, 1.05 - t * 0.008);
  // Bomb appears within first ~5s and settles to ~18% mid-game.
  const bombRate = Math.min(0.18, 0.07 + t * 0.003);
  const goldenRate = Math.min(0.07, 0.02 + t * 0.0006);
  const waveMin = 1;
  const waveMax = Math.min(4, 1 + Math.floor(t / 16));
  return { spawnInterval, bombRate, goldenRate, waveMin, waveMax };
}
