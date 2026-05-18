export type Screen = 'start' | 'playing' | 'end';

export interface FoodKind {
  id: string;
  label: string;
  /** Visible food length in design-units (1080-wide reference canvas) */
  length: number;
  /** Visible food thickness in design-units */
  thickness: number;
  body: string;
  accent: string;
  crust: string;
}

export interface Cut {
  x: number;       // device-px, in screen space
  born: number;    // performance.now() at creation
  combo: number;   // combo when this cut was made (drives color)
}

export interface ActiveFood {
  kind: FoodKind;
  /** Current world-x of the food's left edge (animated during arriving/leaving) */
  leftX: number;
  centerY: number;
  cuts: Cut[];
  phase: 'arriving' | 'active' | 'leaving';
  /** Seconds remaining in the active phase */
  remaining: number;
  /** Original active duration for this food */
  activeS: number;
  seed: number;
}

export interface Impact {
  uid: number;
  x: number;
  y: number;
  text: string;
  color: string;
  born: number;
}

export interface Stats {
  finalScore: number;
  totalCuts: number;
  maxCombo: number;
  foodsCleared: number;
  isNewBest: boolean;
}
