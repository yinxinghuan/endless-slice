import { useCallback, useEffect, useRef, useState } from 'react';
import type { Flyer, FlyKind, Half, Impact, Particle, Screen, Stats, TrailPoint } from '../types';
import { VISUALS, difficulty, pickFood } from '../utils/food';
import {
  drawBackground, drawFlyer, drawHalf, drawParticle, drawTrail, makeDrawCtx,
} from '../utils/draw';
import {
  sfxBomb, sfxMiss, sfxRunEnd, sfxSlice, sfxSwipeStart,
  startAmbient, stopAmbient, unlockAudio,
} from '../utils/audio';

const BEST_KEY = 'endless-slice:best';
const LIVES = 3;
const POINTS_PER_SLICE = 10;
const COMBO_BONUS_PER_EXTRA = 10; // each extra slice in same swipe adds +10 × extra
const GOLDEN_POINTS = 100;
const TRAIL_LIFE_MS = 180;
const FLASH_LIFE_MS = 260;

export function useEndlessSlice() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const spawnCooldownRef = useRef<number>(0);

  const screenRef = useRef<Screen>('start');
  const flyersRef = useRef<Flyer[]>([]);
  const halvesRef = useRef<Half[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const impactsRef = useRef<Impact[]>([]);
  const trailRef = useRef<TrailPoint[]>([]);
  const swipingRef = useRef<boolean>(false);
  const sliceCountInSwipeRef = useRef<number>(0);
  const livesRef = useRef<number>(LIVES);
  const scoreRef = useRef<number>(0);
  const slicedRef = useRef<number>(0);
  const maxComboRef = useRef<number>(0);
  const flashRef = useRef<{ at: number; color: string }>({ at: 0, color: '' });
  const sizeRef = useRef<{ W: number; H: number; dpr: number; cssW: number; cssH: number }>({
    W: 0, H: 0, dpr: 1, cssW: 0, cssH: 0,
  });
  const uidRef = useRef<number>(1);

  const [screen, setScreen] = useState<Screen>('start');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [comboInSwipe, setComboInSwipe] = useState(0);
  const [best, setBest] = useState<number>(() => {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem(BEST_KEY) : null;
    return v ? Number(v) || 0 : 0;
  });
  const [stats, setStats] = useState<Stats>({
    finalScore: 0, sliced: 0, maxCombo: 0, isNewBest: false,
  });

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    sizeRef.current = { W: canvas.width, H: canvas.height, dpr, cssW, cssH };
  }, []);

  useEffect(() => {
    resize();
    const onResize = () => resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [resize]);

  const start = useCallback(() => {
    flyersRef.current = [];
    halvesRef.current = [];
    particlesRef.current = [];
    impactsRef.current = [];
    trailRef.current = [];
    swipingRef.current = false;
    sliceCountInSwipeRef.current = 0;
    elapsedRef.current = 0;
    spawnCooldownRef.current = 0.6;
    livesRef.current = LIVES;
    scoreRef.current = 0;
    slicedRef.current = 0;
    maxComboRef.current = 0;
    setScore(0);
    setLives(LIVES);
    setComboInSwipe(0);
    setScreen('playing');
    screenRef.current = 'playing';
    unlockAudio();
    startAmbient();
  }, []);

  const home = useCallback(() => {
    setScreen('start');
    screenRef.current = 'start';
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
      sliced: slicedRef.current,
      maxCombo: maxComboRef.current,
      isNewBest,
    });
    setScreen('end');
    screenRef.current = 'end';
  }, [best]);

  // ─── Pointer handlers (driven from EndlessSlice.tsx) ─────────────────

  const mapPointer = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const onPointerDown = useCallback((clientX: number, clientY: number) => {
    unlockAudio();
    if (screenRef.current !== 'playing') return;
    const p = mapPointer(clientX, clientY);
    if (!p) return;
    swipingRef.current = true;
    sliceCountInSwipeRef.current = 0;
    setComboInSwipe(0);
    trailRef.current = [{ x: p.x, y: p.y, t: performance.now() }];
    sfxSwipeStart();
  }, [mapPointer]);

  const onPointerMove = useCallback((clientX: number, clientY: number) => {
    if (!swipingRef.current) return;
    if (screenRef.current !== 'playing') return;
    const p = mapPointer(clientX, clientY);
    if (!p) return;
    const now = performance.now();
    const trail = trailRef.current;
    const prev = trail[trail.length - 1];
    if (!prev) return;
    // Skip degenerate (no movement)
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    if (dx === 0 && dy === 0) return;
    // Hit-test segment (prev → p) against living flyers
    checkSegmentSlice(prev.x, prev.y, p.x, p.y);
    trail.push({ x: p.x, y: p.y, t: now });
    // Drop ancient points
    while (trail.length > 0 && now - trail[0].t > TRAIL_LIFE_MS + 100) trail.shift();
  }, [mapPointer]);

  const onPointerUp = useCallback(() => {
    swipingRef.current = false;
    sliceCountInSwipeRef.current = 0;
    setComboInSwipe(0);
  }, []);

  // ─── Slicing ────────────────────────────────────────────────────────

  const checkSegmentSlice = (ax: number, ay: number, bx: number, by: number) => {
    const flyers = flyersRef.current;
    for (let i = 0; i < flyers.length; i++) {
      const f = flyers[i];
      if (f.sliced) continue;
      const r = f.visual.radius * (sizeRef.current.W / 1080);
      if (segmentCircle(ax, ay, bx, by, f.x, f.y, r)) {
        sliceFlyer(f, bx - ax, by - ay);
      }
    }
  };

  const sliceFlyer = (f: Flyer, dirX: number, dirY: number) => {
    f.sliced = true;
    const scale = sizeRef.current.W / 1080;
    const r = f.visual.radius * scale;
    // Cut angle = direction of swipe
    const cutAngle = Math.atan2(dirY, dirX);
    // Perpendicular split velocity (each half pushed opposite ways)
    const perpX = Math.cos(cutAngle + Math.PI / 2);
    const perpY = Math.sin(cutAngle + Math.PI / 2);
    const splitSpeed = 240 * scale;
    const halfA: Half = {
      uid: uidRef.current++,
      visual: f.visual,
      x: f.x, y: f.y,
      vx: f.vx + perpX * splitSpeed,
      vy: f.vy + perpY * splitSpeed,
      rot: f.rot,
      vrot: f.vrot + 4,
      cutAngle,
      side: 1,
      life: 1400,
    };
    const halfB: Half = {
      ...halfA,
      uid: uidRef.current++,
      vx: f.vx - perpX * splitSpeed,
      vy: f.vy - perpY * splitSpeed,
      vrot: f.vrot - 4,
      side: -1,
    };
    halvesRef.current.push(halfA, halfB);

    // Juice particles
    const now = performance.now();
    const particleCount = f.kind === 'watermelon' ? 14 : 10;
    for (let i = 0; i < particleCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 200 * scale * (0.5 + Math.random() * 0.8);
      particlesRef.current.push({
        uid: uidRef.current++,
        x: f.x, y: f.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 60 * scale,
        color: f.visual.flesh,
        size: (4 + Math.random() * 4) * scale,
        life: 600 + Math.random() * 300,
        born: now,
      });
    }

    if (f.kind === 'bomb') {
      onBombHit(f);
      return;
    }

    slicedRef.current += 1;
    sliceCountInSwipeRef.current += 1;
    const c = sliceCountInSwipeRef.current;
    if (c > maxComboRef.current) maxComboRef.current = c;
    setComboInSwipe(c);
    const isGolden = f.kind === 'golden';
    const gained = isGolden
      ? GOLDEN_POINTS
      : POINTS_PER_SLICE + COMBO_BONUS_PER_EXTRA * Math.max(0, c - 1);
    scoreRef.current += gained;
    setScore(scoreRef.current);

    impactsRef.current.push({
      uid: uidRef.current++,
      x: f.x, y: f.y - r * 1.2,
      text: isGolden ? `+${gained}` : (c >= 2 ? `×${c} +${gained}` : `+${gained}`),
      color: isGolden ? '#ffd24a' : comboColor(c),
      born: now,
      scale: 1 + Math.min(0.6, c * 0.1),
    });

    flashRef.current = { at: now, color: isGolden ? '#ffd24a' : f.visual.flesh };
    sfxSlice(c);
  };

  const onBombHit = (f: Flyer) => {
    flashRef.current = { at: performance.now(), color: '#ff4f3a' };
    sfxBomb();
    livesRef.current = 0;
    setLives(0);
    // Schedule game over after a beat
    setTimeout(() => {
      if (screenRef.current === 'playing') endRun();
    }, 600);
    // Big shockwave particles
    const now = performance.now();
    const scale = sizeRef.current.W / 1080;
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 360 * scale * (0.5 + Math.random() * 1.2);
      particlesRef.current.push({
        uid: uidRef.current++,
        x: f.x, y: f.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 100 * scale,
        color: i % 3 === 0 ? '#ffd24a' : '#ff5a2c',
        size: (5 + Math.random() * 6) * scale,
        life: 700 + Math.random() * 400,
        born: now,
      });
    }
  };

  // ─── Spawning ───────────────────────────────────────────────────────

  const spawnWave = () => {
    const { W, H } = sizeRef.current;
    const scale = W / 1080;
    const t = elapsedRef.current;
    const { bombRate, goldenRate, waveMin, waveMax } = difficulty(t);
    const count = waveMin + Math.floor(Math.random() * (waveMax - waveMin + 1));
    for (let i = 0; i < count; i++) {
      let kind: FlyKind;
      const roll = Math.random();
      if (roll < bombRate) kind = 'bomb';
      else if (roll < bombRate + goldenRate) kind = 'golden';
      else kind = pickFood(Math.random);
      const visual = VISUALS[kind];
      const x = (0.15 + Math.random() * 0.7) * W;
      const y = H + visual.radius * scale + 20;
      // Want apex around y = 0.18..0.35 * H. vy negative (upward), gravity positive.
      // h = vy^2 / (2g) ⇒ vy = sqrt(2g*h)
      const gravity = 1500 * scale;
      const apex = (0.55 + Math.random() * 0.18) * H;
      const vy = -Math.sqrt(2 * gravity * apex);
      const vxBase = (W * 0.5 - x) / 1.6; // tend to drift toward center
      const vx = vxBase + (Math.random() - 0.5) * 200 * scale;
      flyersRef.current.push({
        uid: uidRef.current++,
        kind,
        visual,
        x, y, vx, vy,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 3,
        sliced: false,
        missed: false,
      });
    }
  };

  // ─── RAF loop ───────────────────────────────────────────────────────

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
      const scale = d.scale;
      const gravity = 1500 * scale;
      const now = performance.now();

      drawBackground(d, t);

      if (screenRef.current === 'playing') {
        elapsedRef.current += dt;

        // Spawn
        spawnCooldownRef.current -= dt;
        if (spawnCooldownRef.current <= 0) {
          spawnWave();
          const { spawnInterval } = difficulty(elapsedRef.current);
          spawnCooldownRef.current = spawnInterval * (0.85 + Math.random() * 0.3);
        }

        // Update flyers
        const flyers = flyersRef.current;
        for (let i = flyers.length - 1; i >= 0; i--) {
          const f = flyers[i];
          if (!f.sliced) {
            f.vy += gravity * dt;
            f.x += f.vx * dt;
            f.y += f.vy * dt;
            f.rot += f.vrot * dt;
            // Off-screen bottom (missed)
            if (f.y - f.visual.radius * scale > H + 40 * scale) {
              if (!f.missed) {
                f.missed = true;
                if (f.kind !== 'bomb' && f.kind !== 'golden') {
                  livesRef.current -= 1;
                  setLives(livesRef.current);
                  sfxMiss();
                  flashRef.current = { at: now, color: '#ff4a4a' };
                  if (livesRef.current <= 0) {
                    endRun();
                  }
                }
              }
              flyers.splice(i, 1);
              continue;
            }
          } else {
            flyers.splice(i, 1);
          }
        }

        // Update halves
        const halves = halvesRef.current;
        for (let i = halves.length - 1; i >= 0; i--) {
          const h = halves[i];
          h.vy += gravity * dt;
          h.x += h.vx * dt;
          h.y += h.vy * dt;
          h.rot += h.vrot * dt;
          h.life -= dt * 1000;
          if (h.y - h.visual.radius * scale > H + 40 * scale || h.life <= 0) {
            halves.splice(i, 1);
          }
        }

        // Update particles
        const ps = particlesRef.current;
        for (let i = ps.length - 1; i >= 0; i--) {
          const p = ps[i];
          p.vy += gravity * 0.6 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (now - p.born > p.life) ps.splice(i, 1);
        }
      }

      // Draw flyers (only living, non-sliced)
      flyersRef.current.forEach(f => {
        if (!f.sliced) drawFlyer(d, f);
      });
      // Draw halves
      halvesRef.current.forEach(h => drawHalf(d, h));
      // Draw particles
      particlesRef.current.forEach(p => drawParticle(d, p, now));
      // Draw trail (drawn on top of everything)
      if (trailRef.current.length > 1) {
        // Prune old points just before drawing
        while (trailRef.current.length > 0 && now - trailRef.current[0].t > TRAIL_LIFE_MS) {
          trailRef.current.shift();
        }
        drawTrail(d, trailRef.current, now);
      }

      // Impacts
      const lifetime = 700;
      impactsRef.current = impactsRef.current.filter(f => now - f.born < lifetime);
      impactsRef.current.forEach(f => {
        const k = (now - f.born) / lifetime;
        const alpha = 1 - k;
        const dy = -60 * scale * k;
        const scaleBump = (1 + (1 - k) * 0.5) * f.scale;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(f.x, f.y + dy);
        ctx.scale(scaleBump, scaleBump);
        ctx.font = `800 ${40 * scale}px 'Baloo 2', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = f.color;
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 10;
        ctx.fillText(f.text, 0, 0);
        ctx.restore();
      });

      // Screen flash
      const fl = flashRef.current;
      if (fl.at > 0) {
        const age = now - fl.at;
        const k = 1 - age / FLASH_LIFE_MS;
        if (k > 0) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          // Convert color to rgba w/ alpha
          ctx.fillStyle = hexToRgba(fl.color, 0.18 * k);
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
        } else {
          flashRef.current = { at: 0, color: '' };
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [endRun]);

  useEffect(() => () => { stopAmbient(); }, []);

  return {
    canvasRef,
    screen, score, lives, comboInSwipe, best, stats,
    start, home,
    onPointerDown, onPointerMove, onPointerUp,
  };
}

// ─── helpers ─────────────────────────────────────────────────────────────

function comboColor(c: number): string {
  if (c >= 6) return '#ff4f5e';
  if (c >= 4) return '#ff7a3c';
  if (c >= 3) return '#ffae3e';
  if (c >= 2) return '#ffd24a';
  return '#fffacc';
}

/** Closest distance from segment AB to point C; returns true if ≤ r. */
function segmentCircle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, r: number): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  let tt = 0;
  if (lenSq > 0) {
    tt = ((cx - ax) * dx + (cy - ay) * dy) / lenSq;
    tt = Math.max(0, Math.min(1, tt));
  }
  const px = ax + dx * tt;
  const py = ay + dy * tt;
  const ddx = cx - px;
  const ddy = cy - py;
  return ddx * ddx + ddy * ddy <= r * r;
}

function hexToRgba(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(255,255,255,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}, ${a})`;
}
