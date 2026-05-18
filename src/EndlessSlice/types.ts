export type Screen = 'start' | 'playing' | 'end';

export type FlyKind =
  | 'tralalero'
  | 'tung'
  | 'lirili'
  | 'patapim'
  | 'cappuccino'   // golden
  | 'bombardiro';  // bomb

export interface FlyerVisual {
  /** Display radius in design-units (1080-wide reference canvas) */
  radius: number;
  /** Sprite path (relative to module). Loaded as Image at game start. */
  sprite: string;
  /** Color used for the cut-face strip + juice particles */
  flesh: string;
  /** Color used for impact flash */
  flash: string;
}

export interface Flyer {
  uid: number;
  kind: FlyKind;
  visual: FlyerVisual;
  x: number; y: number;
  vx: number; vy: number;
  rot: number;
  vrot: number;
  sliced: boolean;
  missed: boolean;
}

export interface Half {
  uid: number;
  visual: FlyerVisual;
  kind: FlyKind;
  x: number; y: number;
  vx: number; vy: number;
  rot: number;
  vrot: number;
  /** Cut angle in the flyer's LOCAL frame at slice moment (rad).
   *  Stays constant; the cut visual rotates with the half via h.rot. */
  relCutAngle: number;
  side: 1 | -1;
  life: number;
}

export interface Particle {
  uid: number;
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  size: number;
  life: number;
  born: number;
}

export interface TrailPoint {
  x: number; y: number; t: number;
}

export interface Impact {
  uid: number;
  x: number; y: number;
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
