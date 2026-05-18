export type Screen = 'start' | 'playing' | 'end';

export type FlyKind =
  | 'tomato'
  | 'banana'
  | 'cucumber'
  | 'watermelon'
  | 'orange'
  | 'sushi'
  | 'bomb'
  | 'golden';

export interface FlyerVisual {
  /** Outer body color (skin) */
  body: string;
  /** Cut-face color (flesh) */
  flesh: string;
  /** Accent color (seeds, leaf, etc) */
  accent: string;
  /** Radius in design units */
  radius: number;
  /** Number of decorative dots (seeds) on the flesh face */
  seeds: number;
}

export interface Flyer {
  uid: number;
  kind: FlyKind;
  visual: FlyerVisual;
  /** Position in device-px */
  x: number;
  y: number;
  /** Velocity in device-px / second */
  vx: number;
  vy: number;
  /** Rotation in radians */
  rot: number;
  vrot: number;
  /** Has this flyer been sliced? Sliced flyers despawn after split */
  sliced: boolean;
  /** Has the player been credited for missing this (fell off bottom)? */
  missed: boolean;
}

export interface Half {
  uid: number;
  visual: FlyerVisual;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  /** Rotation of the cut line at the moment of slicing (radians, world-space) */
  cutAngle: number;
  /** Which side of the cut this half is on (+1 right, -1 left in cut-local frame) */
  side: 1 | -1;
  /** ms remaining before fadeout */
  life: number;
}

export interface Particle {
  uid: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  born: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  t: number; // performance.now()
}

export interface Impact {
  uid: number;
  x: number;
  y: number;
  text: string;
  color: string;
  born: number;
  scale: number;
}

export interface Stats {
  finalScore: number;
  sliced: number;
  maxCombo: number;
  isNewBest: boolean;
}
