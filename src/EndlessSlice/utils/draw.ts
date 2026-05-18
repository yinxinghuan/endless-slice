import type { Flyer, FlyKind, Half, Particle, TrailPoint } from '../types';

export interface DrawCtx {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  scale: number;
}

export function makeDrawCtx(ctx: CanvasRenderingContext2D, W: number, H: number): DrawCtx {
  return { ctx, W, H, scale: W / 1080 };
}

export function drawBackground(d: DrawCtx, t: number) {
  const { ctx, W, H } = d;
  // Deep magenta-to-cyan AI-fever-dream gradient with a drifting hot core
  const breath = 0.5 + 0.5 * Math.sin(t * 0.0008);
  const cx = W * (0.45 + 0.08 * Math.sin(t * 0.00025));
  const cy = H * (0.42 + 0.06 * Math.cos(t * 0.00031));
  const grad = ctx.createRadialGradient(cx, cy, 80 * d.scale, W / 2, H / 2, Math.max(W, H) * 0.95);
  grad.addColorStop(0, `rgba(180, 70, 130, ${0.95 - breath * 0.04})`);
  grad.addColorStop(0.55, '#3a154e');
  grad.addColorStop(1, '#0c0b1c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle floating glow dots (atmosphere)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) {
    const seed = i * 71.3;
    const px = ((Math.sin(seed) * 0.5 + 0.5) * W + t * 0.04 * (1 + (i % 3))) % W;
    const py = ((Math.cos(seed * 1.3) * 0.5 + 0.5) * H + t * 0.025 * ((i % 4) - 1)) % H;
    const r = (1 + (i % 4)) * 2 * d.scale;
    const a = 0.05 + 0.04 * Math.sin(t * 0.001 + seed);
    ctx.fillStyle = `rgba(255, ${180 + (i % 60)}, ${200 - (i % 80)}, ${a})`;
    ctx.beginPath();
    ctx.arc(((px % W) + W) % W, ((py % H) + H) % H, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ─── Sprite cache (set by useEndlessSlice after preload) ─────────────────

let sprites: Record<FlyKind, HTMLImageElement> | null = null;
export function setSprites(s: Record<FlyKind, HTMLImageElement>) { sprites = s; }

function spriteOf(kind: FlyKind): HTMLImageElement | null {
  if (!sprites) return null;
  const img = sprites[kind];
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}

// ─── Whole flyer ─────────────────────────────────────────────────────────

export function drawFlyer(d: DrawCtx, f: Flyer) {
  const { ctx, scale } = d;
  const r = f.visual.radius * scale;
  const img = spriteOf(f.kind);
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(f.rot);

  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.18, r * 0.9, r * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  if (img) {
    const aspect = img.naturalWidth / img.naturalHeight;
    const w = r * 2;
    const h = w / aspect;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
  } else {
    // Fallback: colored circle if sprite missing
    ctx.fillStyle = f.visual.flash;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ─── Half (sliced piece) ─────────────────────────────────────────────────

export function drawHalf(d: DrawCtx, h: Half) {
  const { ctx, scale } = d;
  const r = h.visual.radius * scale;
  const img = spriteOf(h.kind);
  if (!img) return;

  const aspect = img.naturalWidth / img.naturalHeight;
  const w = r * 2;
  const sh = w / aspect;
  const alpha = Math.min(1, h.life / 600);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(h.x, h.y);
  ctx.rotate(h.rot);

  // Rotate into the cut frame so cut line aligns with x-axis
  ctx.save();
  ctx.rotate(h.relCutAngle);
  // Clip to one half-plane (above or below the cut line)
  ctx.beginPath();
  const big = Math.max(w, sh) * 1.2;
  if (h.side === 1) {
    ctx.rect(-big, -big, big * 2, big);     // y ≤ 0
  } else {
    ctx.rect(-big, 0, big * 2, big);        // y ≥ 0
  }
  ctx.clip();
  // Rotate back so sprite draws upright in the flyer's local frame
  ctx.rotate(-h.relCutAngle);
  ctx.drawImage(img, -w / 2, -sh / 2, w, sh);
  ctx.restore();

  // Cut-face strip drawn over the half along the cut line (in local frame)
  ctx.save();
  ctx.rotate(h.relCutAngle);
  // Flesh strip — pinkish/colored band just inside the cut edge
  const stripY = h.side === 1 ? -2 * scale : 2 * scale - 8 * scale;
  const stripH = 8 * scale;
  const grad = ctx.createLinearGradient(0, stripY, 0, stripY + stripH);
  grad.addColorStop(0, withAlpha(h.visual.flesh, 0));
  grad.addColorStop(0.4, withAlpha(h.visual.flesh, 0.55));
  grad.addColorStop(1, withAlpha(h.visual.flesh, 0));
  ctx.fillStyle = grad;
  ctx.fillRect(-r * 1.1, stripY, r * 2.2, stripH);
  // Crisp dark cut line
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 1.6 * scale;
  ctx.beginPath();
  ctx.moveTo(-r * 1.05, 0);
  ctx.lineTo( r * 1.05, 0);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

// ─── Particles ───────────────────────────────────────────────────────────

export function drawParticle(d: DrawCtx, p: Particle, now: number) {
  const { ctx } = d;
  const k = 1 - (now - p.born) / p.life;
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha = k;
  ctx.fillStyle = p.color;
  ctx.shadowColor = p.color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ─── Swipe trail ─────────────────────────────────────────────────────────

export function drawTrail(d: DrawCtx, points: TrailPoint[], now: number) {
  if (points.length < 2) return;
  const { ctx, scale } = d;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const age = now - b.t;
    const k = Math.max(0, 1 - age / 220);
    if (k <= 0) continue;
    const width = 22 * scale * k + 5 * scale;
    // Outer hot glow (magenta tint for brain-rot vibe)
    ctx.strokeStyle = `rgba(255, 80, 200, ${0.18 * k})`;
    ctx.lineWidth = width * 2.0;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    // Middle yellow
    ctx.strokeStyle = `rgba(255, 220, 120, ${0.35 * k})`;
    ctx.lineWidth = width * 1.3;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    // Bright core white
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * k})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

// ─── Misc ────────────────────────────────────────────────────────────────

function withAlpha(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(255,255,255,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}, ${a})`;
}
