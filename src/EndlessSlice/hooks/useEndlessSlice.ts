import { useCallback, useEffect, useRef, useState } from 'react';
import type { Flyer, FlyKind, Half, Impact, Particle, Screen, Stats, TrailPoint } from '../types';
import { VISUALS, baseScoreFor, difficulty, isBomb, isGolden, pickRegular } from '../utils/food';
import {
  drawBackground, drawFlyer, drawHalf, drawParticle, drawTrail, makeDrawCtx,
} from '../utils/draw';
import {
  sfxBomb, sfxMiss, sfxRunEnd, sfxSlice, sfxSwipeStart,
  startAmbient, stopAmbient, unlockAudio,
} from '../utils/audio';

const BEST_KEY = 'endless-slice:best';
const LIVES = 3;
const COMBO_BONUS_PER_EXTRA = 10; // each extra slice in same swipe adds +10 × extra
const GOLDEN_POINTS = 100;
const TRAIL_LIFE_MS = 200;
const FLASH_LIFE_MS = 260;
const TIER_CALLOUT_LIFE_MS = 850;

function tierFor(combo: number): string {
  if (combo >= 15) return 'GODLIKE';
  if (combo >= 10) return 'MASSIVE';
  if (combo >= 6)  return 'MULTI';
  if (combo >= 3)  return 'SLICE';
  return '';
}

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
  const tierCalloutRef = useRef<{ label: string; born: number }>({ label: '', born: 0 });
  const sizeRef = useRef<{ W: number; H: number; dpr: number; cssW: number; cssH: number }>({
    W: 0, H: 0, dpr: 1, cssW: 0, cssH: 0,
  });
  const uidRef = useRef<number>(1);

  const [screen, setScreen] = useState<Screen>('start');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [comboInSwipe, setComboInSwipe] = useState(0);
  const [tierLabel, setTierLabel] = useState<string>('');
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
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    if (dx === 0 && dy === 0) return;
    // Velocity in px/sec, smoothed against last segment dt
    const dtMs = Math.max(1, now - prev.t);
    const vx = (dx / dtMs) * 1000;
    const vy = (dy / dtMs) * 1000;
    checkSegmentSlice(prev.x, prev.y, p.x, p.y, vx, vy);
    trail.push({ x: p.x, y: p.y, t: now });
    while (trail.length > 0 && now - trail[0].t > TRAIL_LIFE_MS + 100) trail.shift();
  }, [mapPointer]);

  const onPointerUp = useCallback(() => {
    swipingRef.current = false;
    sliceCountInSwipeRef.current = 0;
    setComboInSwipe(0);
  }, []);

  // ─── Slicing ────────────────────────────────────────────────────────

  const checkSegmentSlice = (
    ax: number, ay: number, bx: number, by: number,
    swipeVx: number, swipeVy: number,
  ) => {
    const flyers = flyersRef.current;
    for (let i = 0; i < flyers.length; i++) {
      const f = flyers[i];
      if (f.sliced) continue;
      const r = f.visual.radius * (sizeRef.current.W / 1080);
      if (segmentCircle(ax, ay, bx, by, f.x, f.y, r)) {
        sliceFlyer(f, bx - ax, by - ay, swipeVx, swipeVy);
      }
    }
  };

  const sliceFlyer = (
    f: Flyer, dirX: number, dirY: number,
    swipeVx: number, swipeVy: number,
  ) => {
    f.sliced = true;
    const scale = sizeRef.current.W / 1080;
    const r = f.visual.radius * scale;

    // Cut angle = direction of swipe (with small jitter for visual variety)
    const cutAngle = Math.atan2(dirY, dirX) + (Math.random() - 0.5) * 0.12;
    const perpX = Math.cos(cutAngle + Math.PI / 2);
    const perpY = Math.sin(cutAngle + Math.PI / 2);
    const tanX = Math.cos(cutAngle);
    const tanY = Math.sin(cutAngle);

    // Swipe speed in px/sec. Clamp to reasonable range so a single ultra-fast
    // pointermove doesn't launch halves into orbit.
    const swipeSpeed = Math.min(2400, Math.hypot(swipeVx, swipeVy));

    // Split velocity scales with swipe speed.
    // - Base perpendicular kick (240..520 px/s @ 1080-scale)
    // - Tangential boost = fraction of swipe velocity (halves drift along the slash)
    const splitPerp = (220 + swipeSpeed * 0.18) * scale;
    const tanBoost = swipeSpeed * 0.22 * scale;

    // Big fruits resist the kick (mass proxy)
    const massFactor = 1 - Math.min(0.45, (f.visual.radius - 60) * 0.005);
    const finalPerp = splitPerp * massFactor;
    const finalTan = tanBoost * massFactor;

    // Spin scales with swipe speed
    const spinKick = 5 + swipeSpeed * 0.004;

    // Cut angle in the flyer's local frame at slice moment.
    const relCutAngle = cutAngle - f.rot;
    const halfA: Half = {
      uid: uidRef.current++,
      visual: f.visual,
      kind: f.kind,
      x: f.x, y: f.y,
      vx: f.vx + perpX * finalPerp + tanX * finalTan,
      vy: f.vy + perpY * finalPerp + tanY * finalTan,
      rot: f.rot,
      vrot: f.vrot + spinKick,
      relCutAngle,
      side: 1,
      life: 1600,
    };
    const halfB: Half = {
      ...halfA,
      uid: uidRef.current++,
      vx: f.vx - perpX * finalPerp + tanX * finalTan,
      vy: f.vy - perpY * finalPerp + tanY * finalTan,
      vrot: f.vrot - spinKick,
      side: -1,
    };
    halvesRef.current.push(halfA, halfB);

    // Juice particles — count + speed scale with size and swipe speed
    const now = performance.now();
    const sizeBoost = Math.max(1, r / (80 * scale));
    const speedBoost = 1 + swipeSpeed * 0.0005;
    const particleCount = Math.round(10 * sizeBoost * speedBoost);
    for (let i = 0; i < particleCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (160 + swipeSpeed * 0.18) * scale * (0.4 + Math.random() * 0.9);
      particlesRef.current.push({
        uid: uidRef.current++,
        x: f.x, y: f.y,
        vx: Math.cos(a) * sp + tanX * tanBoost * 0.3,
        vy: Math.sin(a) * sp - 80 * scale + tanY * tanBoost * 0.3,
        color: f.visual.flesh,
        size: (3 + Math.random() * 5) * scale * sizeBoost * 0.8,
        life: 600 + Math.random() * 400,
        born: now,
      });
    }

    if (isBomb(f.kind)) {
      onBombHit(f);
      return;
    }

    slicedRef.current += 1;
    sliceCountInSwipeRef.current += 1;
    const c = sliceCountInSwipeRef.current;
    if (c > maxComboRef.current) maxComboRef.current = c;
    setComboInSwipe(c);

    const golden = isGolden(f.kind);
    const baseKind = baseScoreFor(f.kind);
    const gained = golden
      ? GOLDEN_POINTS
      : baseKind + COMBO_BONUS_PER_EXTRA * Math.max(0, c - 1);
    scoreRef.current += gained;
    setScore(scoreRef.current);

    impactsRef.current.push({
      uid: uidRef.current++,
      x: f.x, y: f.y - r * 1.2,
      text: golden ? `+${gained}` : `+${gained}`,
      color: golden ? '#ffd24a' : comboColor(c),
      born: now,
      scale: golden ? 1.6 : (1 + Math.min(0.5, c * 0.08)),
    });

    // Tier callout when combo crosses thresholds (only on the slice that crosses)
    const prevTier = Math.max(0, c - 1);
    const newTier = c;
    const tierLabel = tierFor(newTier);
    const wasTier = tierFor(prevTier);
    if (tierLabel && tierLabel !== wasTier) {
      tierCalloutRef.current = { label: tierLabel, born: now };
      setTierLabel(tierLabel);
    }

    flashRef.current = { at: now, color: golden ? '#ffd24a' : f.visual.flash };
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
      if (roll < bombRate) kind = 'no_butcher';
      else if (roll < bombRate + goldenRate) kind = 'wagyu';
      else kind = pickRegular(Math.random);
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
                if (!isBomb(f.kind) && !isGolden(f.kind)) {
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

  // Clear tier label after callout life
  useEffect(() => {
    if (!tierLabel) return;
    const id = setTimeout(() => setTierLabel(''), TIER_CALLOUT_LIFE_MS);
    return () => clearTimeout(id);
  }, [tierLabel]);

  return {
    canvasRef,
    screen, score, lives, comboInSwipe, tierLabel, best, stats,
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
