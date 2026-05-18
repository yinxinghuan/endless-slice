export type Screen = 'start' | 'playing' | 'end';

export type Rating = 'perfect' | 'good' | 'ok' | 'miss';

export interface FoodKind {
  id: string;
  label: string;
  /** Visible food length in px on a 1080-wide design canvas */
  length: number;
  /** Visible food thickness in px */
  thickness: number;
  /** Body fill / accent / crust colors */
  body: string;
  accent: string;
  crust: string;
  /** Number of target dashes (cuts). 1 dash = food split into 2 pieces. */
  targets: number;
  /** Pixels/second the scan line moves while this food is on board */
  scanSpeed: number;
}

export interface ActiveFood {
  kind: FoodKind;
  /** World-x (px) where the food's left edge sits */
  leftX: number;
  /** Centered Y on the board */
  centerY: number;
  /** Target marks (world-x positions, left-to-right) */
  marks: Array<{ x: number; cut: boolean; rating?: Rating }>;
  /** Cuts (player-made slashes): world-x position + rating */
  cuts: Array<{ x: number; rating: Rating }>;
  /** Phase: arriving | active | leaving */
  phase: 'arriving' | 'active' | 'leaving';
  /** seconds since this food entered active phase */
  age: number;
  /** seed for jitter / pieces flying */
  seed: number;
}

export interface Impact {
  uid: number;
  x: number;
  y: number;
  rating: Rating;
  bonus: number;
  born: number;
}

export interface Stats {
  finalScore: number;
  maxCombo: number;
  foodsSliced: number;
  perfectCount: number;
  isNewBest: boolean;
}
