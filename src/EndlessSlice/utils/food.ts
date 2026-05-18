import type { FlyKind, FlyerVisual } from '../types';

// Sprite URLs resolved by Vite at build time.
import tralaleroUrl   from '../img/sprites/tralalero.png';
import tungUrl        from '../img/sprites/tung.png';
import liriliUrl      from '../img/sprites/lirili.png';
import patapimUrl     from '../img/sprites/patapim.png';
import cappuccinoUrl  from '../img/sprites/cappuccino.png';
import bombardiroUrl  from '../img/sprites/bombardiro.png';

export const VISUALS: Record<FlyKind, FlyerVisual> = {
  tralalero:  { radius: 96,  sprite: tralaleroUrl,  flesh: '#5ab1d0', flash: '#5ab1d0' },
  tung:       { radius: 82,  sprite: tungUrl,       flesh: '#caa874', flash: '#e3c87d' },
  lirili:     { radius: 102, sprite: liriliUrl,     flesh: '#8fc66a', flash: '#a8e07c' },
  patapim:    { radius: 92,  sprite: patapimUrl,    flesh: '#a06b2a', flash: '#c08a48' },
  cappuccino: { radius: 88,  sprite: cappuccinoUrl, flesh: '#f0e0c0', flash: '#ffd24a' },
  bombardiro: { radius: 88,  sprite: bombardiroUrl, flesh: '#3a3a30', flash: '#ff5a2c' },
};

export const REGULAR_KINDS: FlyKind[] = ['tralalero', 'tung', 'lirili', 'patapim'];

export function isBomb(kind: FlyKind): boolean { return kind === 'bombardiro'; }
export function isGolden(kind: FlyKind): boolean { return kind === 'cappuccino'; }

export function baseScoreFor(kind: FlyKind): number {
  const r = VISUALS[kind].radius;
  if (r >= 100) return 15;
  if (r <= 70)  return 15;
  return 10;
}

export function pickRegular(rng: () => number): FlyKind {
  return REGULAR_KINDS[Math.floor(rng() * REGULAR_KINDS.length)];
}

export function difficulty(t: number) {
  const spawnInterval = Math.max(0.42, 1.05 - t * 0.008);
  const bombRate = Math.min(0.20, t * 0.0025);
  const goldenRate = Math.min(0.07, 0.018 + t * 0.0006);
  const waveMin = 1;
  const waveMax = Math.min(4, 1 + Math.floor(t / 16));
  return { spawnInterval, bombRate, goldenRate, waveMin, waveMax };
}

/** Preload all sprites; resolves when every image is loaded (or errors). */
export function preloadSprites(): Promise<Record<FlyKind, HTMLImageElement>> {
  const entries = Object.entries(VISUALS) as Array<[FlyKind, FlyerVisual]>;
  return Promise.all(entries.map(([kind, v]) => {
    return new Promise<[FlyKind, HTMLImageElement]>((resolve) => {
      const img = new Image();
      img.onload = () => resolve([kind, img]);
      img.onerror = () => resolve([kind, img]); // resolve anyway; draw will fallback to a placeholder
      img.src = v.sprite;
    });
  })).then(pairs => {
    const out = {} as Record<FlyKind, HTMLImageElement>;
    for (const [k, img] of pairs) out[k] = img;
    return out;
  });
}
