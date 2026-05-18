import type { FlyKind, FlyerVisual } from '../types';

export const VISUALS: Record<FlyKind, FlyerVisual> = {
  pig: {
    radius: 92,
    body:   '#ffc7c7',
    accent: '#ff9aa6',
    dark:   '#a06070',
    flesh:  '#e8506a',
    fat:    '#ffd8e0',
    bone:   '#fffaf2',
    flash:  '#ff7090',
  },
  cow: {
    radius: 100,
    body:   '#fafafa',
    accent: '#1d1d1f',
    dark:   '#a07a4a',   // horns
    flesh:  '#a02238',
    fat:    '#ffe5d6',
    bone:   '#fffaf2',
    flash:  '#ff6a6a',
  },
  chicken: {
    radius: 80,
    body:   '#ffe884',
    accent: '#ff3a1a',   // comb
    dark:   '#e0721a',   // beak
    flesh:  '#ffb494',
    fat:    '#fff0e0',
    bone:   '#fffaf2',
    flash:  '#ffe884',
  },
  sheep: {
    radius: 96,
    body:   '#fbf3df',   // fleece off-white
    accent: '#1a1a1a',   // face
    dark:   '#3a2a1a',
    flesh:  '#b32a48',
    fat:    '#ffe5d8',
    bone:   '#fffaf2',
    flash:  '#fff0e0',
  },
  duck: {
    radius: 84,
    body:   '#fff080',
    accent: '#ff8025',   // bill
    dark:   '#b85008',
    flesh:  '#a04030',
    fat:    '#ffe0c0',
    bone:   '#fffaf2',
    flash:  '#ffd24a',
  },
  wagyu: {
    radius: 76,
    body:   '#b8253a',
    accent: '#ffd24a',   // gold A5
    dark:   '#fff0f0',   // marbling
    flesh:  '#a02238',
    fat:    '#fff0d8',
    bone:   '#fffaf2',
    flash:  '#ffd24a',
  },
  no_butcher: {
    radius: 88,
    body:   '#ff3340',   // red sign body
    accent: '#ffffff',   // slash + icon
    dark:   '#a00010',
    flesh:  '#ff3340',
    fat:    '#fff',
    bone:   '#fff',
    flash:  '#ff5050',
  },
};

export const REGULAR_KINDS: FlyKind[] = ['pig', 'cow', 'chicken', 'sheep', 'duck'];

export function isBomb(kind: FlyKind): boolean { return kind === 'no_butcher'; }
export function isGolden(kind: FlyKind): boolean { return kind === 'wagyu'; }

export function baseScoreFor(kind: FlyKind): number {
  const r = VISUALS[kind].radius;
  if (r >= 96) return 15;   // big animals (cow / sheep)
  if (r <= 80) return 15;   // small (chicken)
  return 10;
}

export function pickRegular(rng: () => number): FlyKind {
  return REGULAR_KINDS[Math.floor(rng() * REGULAR_KINDS.length)];
}

export function difficulty(t: number) {
  const spawnInterval = Math.max(0.42, 1.05 - t * 0.008);
  const bombRate = Math.min(0.20, t * 0.0025);
  const goldenRate = Math.min(0.07, 0.02 + t * 0.0006);
  const waveMin = 1;
  const waveMax = Math.min(4, 1 + Math.floor(t / 16));
  return { spawnInterval, bombRate, goldenRate, waveMin, waveMax };
}
