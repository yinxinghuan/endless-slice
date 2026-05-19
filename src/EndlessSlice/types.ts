export type Screen = 'start' | 'playing' | 'end';

export type FlyKind =
  | 'pig'
  | 'cow'
  | 'chicken'
  | 'sheep'
  | 'duck'
  | 'wagyu'      // golden bonus (luxury beef cube)
  | 'puppy'      // bomb — golden retriever
  | 'kitten'     // bomb — gray tabby cat
  | 'bunny'      // bomb — white rabbit
  | 'hamster';   // bomb — orange hamster

export interface FlyerVisual {
  /** Display radius in design-units (1080-wide reference canvas) */
  radius: number;
  /** Skin / primary body color */
  body: string;
  /** Secondary accent (spots, comb, ears, beak…) */
  accent: string;
  /** Dark shade for outlines / shadow / feature */
  dark: string;
  /** Meat cross-section base color */
  flesh: string;
  /** Marbling / fat color (lighter) */
  fat: string;
  /** Bone (small white ellipse in center) */
  bone: string;
  /** Impact flash + juice particle color */
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
  kind: FlyKind;
  visual: FlyerVisual;
  x: number; y: number;
  vx: number; vy: number;
  rot: number;
  vrot: number;
  /** Cut angle in the flyer's local frame at slice moment (rad).
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
