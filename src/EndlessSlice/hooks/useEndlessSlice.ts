import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActiveFood, Impact, Screen, Stats } from '../types';
import { FOODS_PER_RUN, activeForLevel, pickFood } from '../utils/food';
import { comboColor, drawBackground, drawBoard, drawFood, drawLeavingFood, drawTimerBar, makeDrawCtx } from '../utils/draw';
import {
  sfxChop, sfxFoodCleared, sfxRunEnd,
  startAmbient, stopAmbient, unlockAudio,
} from '../utils/audio';

const BEST_KEY = 'endless-slice:best';
const COMBO_WINDOW_MS = 280;
const COMBO_MAX = 10;
const POINTS_PER_CUT = 10;
const ARRIVE_S = 0.45;
const LEAVE_S = 0.55;
const MIN_CUT_SPACING_DU = 14; // design units — prevents stacking taps in the same pixel

export function useEndlessSlice() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  const screenRef = useRef<Screen>('start');
  const foodRef = useRef<ActiveFood | null>(null);
  const phaseTimerRef = useRef<number>(0);
  const levelRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const comboRef = useRef<number>(0);
  const maxComboRef = useRef<number>(0);
  const lastTapMsRef = useRef<number>(0);
  const totalCutsRef = useRef<number>(0);
  const foodsClearedRef = useRef<number>(0);
  const impactsRef = useRef<Impact[]>([]);
  const flashRef = useRef<{ at: number; intensity: number }>({ at: 0, intensity: 0 });
  const sizeRef = useRef<{ W: number; H: number; dpr: number }>({ W: 0, H: 0, dpr: 1 });

  const [screen, setScreen] = useState<Screen>('start');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [foodIndex, setFoodIndex] = useState(0); // 0..FOODS_PER_RUN
  const [best, setBest] = useState<number>(() => {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem(BEST_KEY) : null;
    return v ? Number(v) || 0 : 0;
  });
  const [stats, setStats] = useState<Stats>({
    finalScore: 0, totalCuts: 0, maxCombo: 0, foodsCleared: 0, isNewBest: false,
  });

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

  const spawnFood = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { W, H } = sizeRef.current;
    const ctx = canvas.getContext('2d')!;
    const d = makeDrawCtx(ctx, W, H);
    const level = levelRef.current;
    const kind = pickFood(level);
    const activeS = activeForLevel(level);
    foodRef.current = {
      kind,
      leftX: d.boardRight + 80 * d.scale, // off-board right; eased into place during 'arriving'
      centerY: d.centerY,
      cuts: [],
      phase: 'arriving',
      remaining: activeS,
      activeS,
      seed: (level * 9973 + 17) & 0xffff,
    };
    phaseTimerRef.current = 0;
    setFoodIndex(level + 1);
  }, []);

  const start = useCallback(() => {
    levelRef.current = 0;
    scoreRef.current = 0;
    comboRef.current = 0;
    maxComboRef.current = 0;
    lastTapMsRef.current = 0;
    totalCutsRef.current = 0;
    foodsClearedRef.current = 0;
    impactsRef.current = [];
    setScore(0);
    setCombo(0);
    setFoodIndex(0);
    setScreen('playing');
    screenRef.current = 'playing';
    spawnFood();
    unlockAudio();
    startAmbient();
  }, [spawnFood]);

  const home = useCallback(() => {
    setScreen('start');
    screenRef.current = 'start';
    foodRef.current = null;
    stopAmbient();
  }, []);

  const endRun = useCallback(() => {
    stopAmbient();
    sfxRunEnd();
    const finalScore = scoreRef.current;
    const isNewBest = finalScore > best;
    if (isNewBest) {
      try { localStorage.setItem(BEST_KEY, String(finalScore)); } catch { /* ignore */ }
      setBest(finalScore);
    }
    setStats({
      finalScore,
      totalCuts: totalCutsRef.current,
      maxCombo: maxComboRef.current,
      foodsCleared: foodsClearedRef.current,
      isNewBest,
    });
    setScreen('end');
    screenRef.current = 'end';
  }, [best]);

  /** Pointer hits the canvas. We use the raw clientX in device-px space. */
  const handleTap = useCallback((clientX: number, clientY: number) => {
    unlockAudio();
    if (screenRef.current !== 'playing') return;
    const food = foodRef.current;
    if (!food || food.phase !== 'active') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { W } = sizeRef.current;
    const scale = W / 1080;
    // Map from CSS-px to device-px
    const dx = (clientX - rect.left) * (canvas.width / rect.width);
    const dy = (clientY - rect.top) * (canvas.height / rect.height);

    const len = food.kind.length * scale;
    const thick = food.kind.thickness * scale;
    // Tap area: anywhere on the board near the food row.
    // Cuts only land within food's horizontal span; vertical position doesn't matter much,
    // but we ignore taps far away from the food row to keep accidental UI taps from registering.
    const yMin = food.centerY - thick / 2 - 60 * scale;
    const yMax = food.centerY + thick / 2 + 60 * scale;
    if (dy < yMin || dy > yMax) return;

    // Clamp cut x to inside the food (with small inset so cuts don't land on the curved caps).
    const inset = thick * 0.18;
    const minX = food.leftX + inset;
    const maxX = food.leftX + len - inset;
    if (dx < minX || dx > maxX) return;
    const cutX = Math.max(minX, Math.min(maxX, dx));

    // Reject cuts too close to an existing cut (visually + scoring spam guard).
    const minSpacing = MIN_CUT_SPACING_DU * scale;
    if (food.cuts.some(c => Math.abs(c.x - cutX) < minSpacing)) return;

    const now = performance.now();
    const rapid = (now - lastTapMsRef.current) < COMBO_WINDOW_MS;
    comboRef.current = rapid ? Math.min(COMBO_MAX, comboRef.current + 1) : 1;
    if (comboRef.current > maxComboRef.current) maxComboRef.current = comboRef.current;
    lastTapMsRef.current = now;

    food.cuts.push({ x: cutX, born: now, combo: comboRef.current });
    totalCutsRef.current += 1;
    const gained = POINTS_PER_CUT * comboRef.current;
    scoreRef.current += gained;
    setScore(scoreRef.current);
    setCombo(comboRef.current);

    impactsRef.current.push({
      uid: now + Math.random(),
      x: cutX,
      y: food.centerY - thick / 2 - 24 * scale,
      text: `+${gained}`,
      color: comboColor(comboRef.current),
      born: now,
    });

    // Screen flash builds with combo
    flashRef.current = { at: now, intensity: Math.min(1, 0.18 + comboRef.current * 0.06) };

    sfxChop(comboRef.current);
  }, []);

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
        const scale = d.scale;
        const scaledLen = food.kind.length * scale;
        const targetLeftX = d.boardLeft + (d.boardRight - d.boardLeft - scaledLen) * 0.5;

        if (food.phase === 'arriving') {
          phaseTimerRef.current += dt;
          const k = Math.min(1, phaseTimerRef.current / ARRIVE_S);
          const ease = 1 - Math.pow(1 - k, 3);
          const fromX = d.boardRight + 80 * scale;
          food.leftX = fromX + (targetLeftX - fromX) * ease;
          drawFood(d, food);
          if (k >= 1) {
            food.phase = 'active';
            food.leftX = targetLeftX;
            phaseTimerRef.current = 0;
          }
        } else if (food.phase === 'active') {
          food.remaining -= dt;
          phaseTimerRef.current += dt;
          drawFood(d, food);
          drawTimerBar(d, food);
          if (food.remaining <= 0) {
            const pieces = food.cuts.length + 1;
            foodsClearedRef.current += 1;
            // Bonus: +5 per piece (rewards filling the food with cuts)
            const bonus = pieces * 5;
            if (bonus > 0) {
              scoreRef.current += bonus;
              setScore(scoreRef.current);
              impactsRef.current.push({
                uid: performance.now() + Math.random(),
                x: food.leftX + scaledLen / 2,
                y: food.centerY - food.kind.thickness * scale / 2 - 80 * scale,
                text: `${pieces} pieces +${bonus}`,
                color: '#fff',
                born: performance.now(),
              });
            }
            sfxFoodCleared(pieces);
            food.phase = 'leaving';
            phaseTimerRef.current = 0;
          }
        } else if (food.phase === 'leaving') {
          phaseTimerRef.current += dt;
          const k = Math.min(1, phaseTimerRef.current / LEAVE_S);
          drawLeavingFood(d, food, k);
          if (k >= 1) {
            levelRef.current += 1;
            // Reset combo between foods (small gap).
            comboRef.current = 0;
            setCombo(0);
            lastTapMsRef.current = 0;
            if (levelRef.current >= FOODS_PER_RUN) {
              endRun();
            } else {
              spawnFood();
            }
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
        const dy = -50 * d.scale * k;
        const scaleBump = 1 + (1 - k) * 0.4;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(f.x, f.y + dy);
        ctx.scale(scaleBump, scaleBump);
        ctx.font = `800 ${42 * d.scale}px 'Baloo 2', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = f.color;
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 10;
        ctx.fillText(f.text, 0, 0);
        ctx.restore();
      });

      // Screen flash (subtle)
      const f = flashRef.current;
      if (f.intensity > 0) {
        const age = now - f.at;
        const fade = Math.max(0, 1 - age / 220);
        if (fade > 0) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = `rgba(255, 220, 110, ${0.10 * f.intensity * fade})`;
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
        } else {
          flashRef.current = { at: 0, intensity: 0 };
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [endRun, spawnFood]);

  useEffect(() => () => { stopAmbient(); }, []);

  return {
    canvasRef,
    screen, score, combo, best, stats, foodIndex,
    start, home, handleTap,
  };
}
