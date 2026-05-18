import type { FoodKind } from '../types';

// Base design unit: assume 1080-wide design canvas (we scale at draw time).
// length/thickness are RELATIVE to a 1080-wide canvas and rescaled on the fly.

export const FOODS: FoodKind[] = [
  {
    id: 'baguette',
    label: 'Baguette',
    length: 820,
    thickness: 150,
    body: '#e8c885',
    accent: '#f4dca5',
    crust: '#7a4824',
    targets: 5,
    scanSpeed: 240,
  },
  {
    id: 'cucumber',
    label: 'Cucumber',
    length: 760,
    thickness: 110,
    body: '#3f8a4a',
    accent: '#7ec18a',
    crust: '#1f5b2a',
    targets: 8,
    scanSpeed: 260,
  },
  {
    id: 'sausage',
    label: 'Sausage',
    length: 720,
    thickness: 130,
    body: '#b34a3a',
    accent: '#d96c5a',
    crust: '#6c2418',
    targets: 7,
    scanSpeed: 250,
  },
  {
    id: 'sushi',
    label: 'Sushi Roll',
    length: 700,
    thickness: 170,
    body: '#1f1f1f',
    accent: '#f0ead1',
    crust: '#3a3a3a',
    targets: 4,
    scanSpeed: 230,
  },
  {
    id: 'cake',
    label: 'Roll Cake',
    length: 740,
    thickness: 180,
    body: '#f7d8d4',
    accent: '#ffe9e6',
    crust: '#b86a5a',
    targets: 4,
    scanSpeed: 220,
  },
  {
    id: 'croissant',
    label: 'Croissant',
    length: 700,
    thickness: 160,
    body: '#d99e54',
    accent: '#f0c177',
    crust: '#7d4a1f',
    targets: 5,
    scanSpeed: 245,
  },
];

export function pickFood(index: number): FoodKind {
  // Deterministic-ish rotation w/ light shuffle so the very first foods are easy.
  if (index === 0) return FOODS[0];
  if (index === 1) return FOODS[5]; // croissant
  return FOODS[(index * 7 + 3) % FOODS.length];
}

export function speedForLevel(level: number, base: number): number {
  // Geometric ramp: +6% every food, capped at 2.4x.
  const mult = Math.min(2.4, Math.pow(1.06, level));
  return base * mult;
}

export function targetsForLevel(kind: FoodKind, level: number): number {
  // Slight density ramp on top of the food's natural count.
  const bonus = Math.floor(level / 4);
  return Math.min(kind.targets + bonus, 12);
}
