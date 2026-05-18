import type { FoodKind } from '../types';

// Design-unit length/thickness relative to a 1080-wide reference canvas.
export const FOODS: FoodKind[] = [
  {
    id: 'baguette',
    label: 'Baguette',
    length: 820, thickness: 180,
    body: '#e8c885', accent: '#f4dca5', crust: '#7a4824',
  },
  {
    id: 'cucumber',
    label: 'Cucumber',
    length: 780, thickness: 140,
    body: '#3f8a4a', accent: '#7ec18a', crust: '#1f5b2a',
  },
  {
    id: 'sausage',
    label: 'Sausage',
    length: 740, thickness: 160,
    body: '#b34a3a', accent: '#d96c5a', crust: '#6c2418',
  },
  {
    id: 'sushi',
    label: 'Sushi Roll',
    length: 720, thickness: 200,
    body: '#1f1f1f', accent: '#f0ead1', crust: '#3a3a3a',
  },
  {
    id: 'cake',
    label: 'Roll Cake',
    length: 760, thickness: 210,
    body: '#f7d8d4', accent: '#ffe9e6', crust: '#b86a5a',
  },
  {
    id: 'croissant',
    label: 'Croissant',
    length: 720, thickness: 190,
    body: '#d99e54', accent: '#f0c177', crust: '#7d4a1f',
  },
];

export const FOODS_PER_RUN = 10;

export function pickFood(index: number): FoodKind {
  return FOODS[index % FOODS.length];
}

/** Active (tappable) duration in seconds for the Nth food. Gets shorter. */
export function activeForLevel(level: number): number {
  // 3.5s → 1.4s over the run (10 foods).
  const ramp = Math.min(level * 0.22, 2.1);
  return Math.max(1.4, 3.5 - ramp);
}
