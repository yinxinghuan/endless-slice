import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActiveFood, Impact, Rating, Screen, Stats } from '../types';
import { pickFood, speedForLevel, targetsForLevel } from '../utils/food';
import { drawBackground, drawBoard, drawFood, drawLeavingFood, drawScanLine, makeDrawCtx } from '../utils/draw';
import {
  sfxFoodCleared, sfxGameOver, sfxGood, sfxMiss, sfxOk, sfxPerfect,
  startAmbient, stopAmbient, unlockAudio,
} from '../utils/audio';

const BEST_KEY = 'endless-slice:best';

// Rating thresholds, in design units (1080-wide canvas).
const TH_PERFECT_DU = 16;
const TH_GOOD_DU = 38;
const TH_OK_DU = 70;

const SCORES: Record<Rating, number> = {
  perfect: 100,
  good: 50,
  ok: 20,
  miss: 0,
};

const ARRIVE_S = 0.55;
const LEAVE_S = 0.55;

export function useEndlessSlice() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  // Refs (mutable game state, do not trigger re-render)
  const screenRef = useRef<Screen>('start');
  const foodRef = useRef<ActiveFood | null>(null);
  const phaseTimerRef = useRef<number>(0); // seconds spent in current phase
  const scanXRef = useRef<number>(0);       // device-px (board-relative)
  const levelRef = useRef<number>(0);        // # foods elapsed
  const scoreRef = useRef<number>(0);
  const comboRef = useRef<number>(0);
  const maxComboRef = useRef<number>(0);
  const perfectCountRef = useRef<number>(0);
  const foodsSlicedRef = useRef<number>(0);
  const impactsRef = useRef<Impact[]>([]);
  const sizeRef = useRef<{ W: number; H: number; dpr: number }>({ W: 0, H: 0, dpr: 1 });

  // React state (HUD-driving)
  const [screen, setScreen] = useState<Screen>('start');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState<number>(() => {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem(BEST_KEY) : null;
    return v ? Number(v) || 0 : 0;
  });
  const [stats, setStats] = useState<Stats>({
    finalScore: 0, maxCombo: 0, foodsSliced: 0, perfectCount: 0, isNewBest: false,
  });
  const [lastRating, setLastRating] = useState<{ rating: Rating; t: number } | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  // === Sizing / DPR ===
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    sizeRef.current = { W: canvas.width, H: canvas.height, dpr };
  }, []);

  useEffect(() => {
    resize();
    const onResize = () => resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [resize]);

  // === Spawn next food ===
  const spawnFood = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { W, H } = sizeRef.current;
    const ctx = canvas.getContext('2d')!;
    const d = makeDrawCtx(ctx, W, H);
    const level = levelRef.current;
    const kind = pickFood(level);
    const scaledLen = kind.length * d.scale;
    const targetCount = targetsForLevel(kind, level);
    // Distribute targets evenly inside the food, with small jitter.
    const padding = scaledLen * 0.08;
    const usable = scaledLen - padding * 2;
    const marks: ActiveFood['marks'] = [];
    for (let i = 1; i <= targetCount; i++) {
      const frac = i / (targetCount + 1);
      const jitter = ((Math.sin(level * 3.1 + i * 1.7) + 1) * 0.5 - 0.5) * (usable / (targetCount + 1) * 0.18);
      const x = padding + usable * frac + jitter;
      marks.push({ x, cut: false });
    }
    foodRef.current = {
      kind,
      // Will get repositioned each frame during 'arriving' (lerp from off-screen-right → board).
      leftX: d.boardRight,
      centerY: d.centerY,
      marks: marks.map((m) => ({ x: d.boardRight + m.x, cut: false, rating: undefined })),
      cuts: [],
      phase: 'arriving',
      age: 0,
      seed: (level * 9973 + 17) & 0xffff,
    };
    phaseTimerRef.current = 0;
    scanXRef.current = 0;
  }, []);

  // === Begin game ===
  const start = useCallback(() => {
    levelRef.current = 0;
    scoreRef.current = 0;
    comboRef.current = 0;
    maxComboRef.current = 0;
    perfectCountRef.current = 0;
    foodsSlicedRef.current = 0;
    impactsRef.current = [];
    setScore(0);
    setCombo(0);
    setLastRating(null);
    setScreen('playing');
    screenRef.current = 'playing';
    spawnFood();
    setHasInteracted(true);
    unlockAudio();
    startAmbient();
  }, [spawnFood]);

  const home = useCallback(() => {
    setScreen('start');
    screenRef.current = 'start';
    foodRef.current = null;
    stopAmbient();
  }, []);

  // === End game ===
  const gameOver = useCallback(() => {
    stopAmbient();
    sfxGameOver();
    const finalScore = scoreRef.current;
    const isNewBest = finalScore > best;
    if (isNewBest) {
      try { localStorage.setItem(BEST_KEY, String(finalScore)); } catch { /* ignore */ }
      setBest(finalScore);
    }
    setStats({
      finalScore,
      maxCombo: maxComboRef.current,
      foodsSliced: foodsSlicedRef.current,
      perfectCount: perfectCountRef.current,
      isNewBest,
    });
    setScreen('end');
    screenRef.current = 'end';
  }, [best]);

  // === Tap to cut ===
  const handleTap = useCallback(() => {
    unlockAudio();
    if (screenRef.current !== 'playing') return;
    const food = foodRef.current;
    if (!food || food.phase !== 'active') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { W } = sizeRef.current;
    const scale = W / 1080;
    const scanX = food.leftX + scanXRef.current;
    // Find nearest uncut mark
    let nearest = -1;
    let nearestDist = Infinity;
    for (let i = 0; i < food.marks.length; i++) {
      const m = food.marks[i];
      if (m.cut) continue;
      const d = Math.abs(m.x - scanX);
      if (d < nearestDist) { nearestDist = d; nearest = i; }
    }
    let rating: Rating;
    const distDu = nearestDist / scale;
    if (nearest >= 0 && distDu < TH_PERFECT_DU) rating = 'perfect';
    else if (nearest >= 0 && distDu < TH_GOOD_DU) rating = 'good';
    else if (nearest >= 0 && distDu < TH_OK_DU) rating = 'ok';
    else rating = 'miss';

    if (rating !== 'miss' && nearest >= 0) {
      food.marks[nearest].cut = true;
      food.marks[nearest].rating = rating;
      // Snap the cut to the scanX (where the knife actually fell) so the visual lines up.
      food.cuts.push({ x: scanX, rating });
      const gained = SCORES[rating] * Math.max(1, comboRef.current + 1);
      scoreRef.current += gained;
      comboRef.current += 1;
      if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current;
      if (rating === 'perfect') perfectCountRef.current += 1;
      setScore(scoreRef.current);
      setCombo(comboRef.current);
      impactsRef.current.push({
        uid: Date.now() + Math.random(),
        x: scanX,
        y: food.centerY - food.kind.thickness * scale / 2 - 30 * scale,
        rating,
        bonus: gained,
        born: performance.now(),
      });
      if (rating === 'perfect') sfxPerfect();
      else if (rating === 'good') sfxGood();
      else sfxOk();
      setLastRating({ rating, t: performance.now() });
    } else {
      // Wasted slash on bare board
      food.cuts.push({ x: scanX, rating: 'miss' });
      comboRef.current = 0;
      setCombo(0);
      sfxMiss();
      impactsRef.current.push({
        uid: Date.now() + Math.random(),
        x: scanX,
        y: food.centerY - food.kind.thickness * scale / 2 - 30 * scale,
        rating: 'miss',
        bonus: 0,
        born: performance.now(),
      });
      setLastRating({ rating: 'miss', t: performance.now() });
    }
  }, []);

  // === Render loop ===
  useEffect(() => {
    const tick = (t: number) => {
      const canvas = canvasRef.current;
      if (!canvas) { rafRef.current = requestAnimationFrame(tick); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx) { rafRef.current = requestAnimationFrame(tick); return; }
      const { W, H } = sizeRef.current;
      if (W === 0 || H === 0) { rafRef.current = requestAnimationFrame(tick); return; }
      const last = lastTickRef.current || t;
      const dt = Math.min(0.05, (t - last) / 1000);
      lastTickRef.current = t;
      const d = makeDrawCtx(ctx, W, H);

      drawBackground(d, t);
      drawBoard(d);

      const food = foodRef.current;

      if (food && screenRef.current === 'playing') {
        const scale = W / 1080;
        const scaledLen = food.kind.length * scale;
        const targetLeftX = d.boardLeft + (d.boardRight - d.boardLeft - scaledLen) * 0.5;

        if (food.phase === 'arriving') {
          phaseTimerRef.current += dt;
          const k = Math.min(1, phaseTimerRef.current / ARRIVE_S);
          const ease = 1 - Math.pow(1 - k, 3);
          const fromX = d.boardRight + 80 * scale;
          food.leftX = fromX + (targetLeftX - fromX) * ease;
          // Recompute mark world-x relative to current leftX.
          // marks store world-x; need to shift them with the food while preserving relative spacing.
          // We embed the initial offsets in the seed: regenerate relative spacing each frame from the unchanged kind/marks index.
          const targetCount = food.marks.length;
          const padding = scaledLen * 0.08;
          const usable = scaledLen - padding * 2;
          for (let i = 0; i < targetCount; i++) {
            const frac = (i + 1) / (targetCount + 1);
            const jitter = ((Math.sin(levelRef.current * 3.1 + (i + 1) * 1.7) + 1) * 0.5 - 0.5) * (usable / (targetCount + 1) * 0.18);
            food.marks[i].x = food.leftX + padding + usable * frac + jitter;
          }
          if (k >= 1) {
            food.phase = 'active';
            phaseTimerRef.current = 0;
            scanXRef.current = 0;
            food.leftX = targetLeftX;
            // Final mark positions
            const padding2 = scaledLen * 0.08;
            const usable2 = scaledLen - padding2 * 2;
            for (let i = 0; i < targetCount; i++) {
              const frac = (i + 1) / (targetCount + 1);
              const jitter = ((Math.sin(levelRef.current * 3.1 + (i + 1) * 1.7) + 1) * 0.5 - 0.5) * (usable2 / (targetCount + 1) * 0.18);
              food.marks[i].x = food.leftX + padding2 + usable2 * frac + jitter;
            }
          }
          drawFood(d, food);
        } else if (food.phase === 'active') {
          phaseTimerRef.current += dt;
          food.age += dt;
          const speed = speedForLevel(levelRef.current, food.kind.scanSpeed) * scale;
          scanXRef.current += speed * dt;
          const scanX = food.leftX + scanXRef.current;
          drawFood(d, food);
          drawScanLine(d, scanX, food);
          if (scanXRef.current >= scaledLen) {
            // End of food
            const hitCount = food.marks.filter(m => m.cut).length;
            const targetCount = food.marks.length;
            const ratio = hitCount / targetCount;
            foodsSlicedRef.current += 1;
            if (ratio < 0.6) {
              gameOver();
            } else {
              sfxFoodCleared();
              food.phase = 'leaving';
              phaseTimerRef.current = 0;
            }
          }
        } else if (food.phase === 'leaving') {
          phaseTimerRef.current += dt;
          const k = Math.min(1, phaseTimerRef.current / LEAVE_S);
          drawLeavingFood(d, food, k);
          if (k >= 1) {
            levelRef.current += 1;
            spawnFood();
          }
        }
      }

      // Impacts (floating text)
      const now = performance.now();
      const lifetime = 700;
      impactsRef.current = impactsRef.current.filter(f => now - f.born < lifetime);
      impactsRef.current.forEach(f => {
        const k = (now - f.born) / lifetime;
        const alpha = 1 - k;
        const dy = -40 * d.scale * k;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `800 ${38 * d.scale}px 'Baloo 2', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const color = f.rating === 'perfect' ? '#ffd24a'
                    : f.rating === 'good' ? '#9be36b'
                    : f.rating === 'ok' ? '#7ad0ff'
                    : '#ff5a5a';
        ctx.fillStyle = color;
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 8;
        ctx.fillText(f.rating.toUpperCase(), f.x, f.y + dy);
        if (f.bonus > 0) {
          ctx.font = `700 ${22 * d.scale}px 'Baloo 2', sans-serif`;
          ctx.fillStyle = '#fff';
          ctx.fillText(`+${f.bonus}`, f.x, f.y + dy + 36 * d.scale);
        }
        ctx.restore();
      });

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [gameOver, spawnFood]);

  // Cleanup on unmount
  useEffect(() => () => { stopAmbient(); }, []);

  return {
    canvasRef,
    screen, score, combo, best, stats, lastRating, hasInteracted,
    start, home, handleTap,
  };
}
