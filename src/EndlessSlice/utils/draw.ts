import type { Flyer, FlyKind, FlyerVisual, Half, Particle, TrailPoint } from '../types';

export interface DrawCtx {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  scale: number;
}

export function makeDrawCtx(ctx: CanvasRenderingContext2D, W: number, H: number): DrawCtx {
  return { ctx, W, H, scale: W / 1080 };
}

export function setSprites(_: unknown) { /* noop */ }

// ─── Background ─────────────────────────────────────────────────────────

export function drawBackground(d: DrawCtx, t: number) {
  const { ctx, W, H } = d;
  // Butcher-shop interior: deep crimson tiled wall + warm light source top
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#7a1818');
  grad.addColorStop(0.45, '#481010');
  grad.addColorStop(1, '#160606');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Tile grid (subtle)
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.20)';
  ctx.lineWidth = 1.2 * d.scale;
  const tile = 86 * d.scale;
  for (let x = 0; x < W; x += tile) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += tile) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  // Soft highlight on each tile (lighter top-left)
  ctx.strokeStyle = 'rgba(255, 220, 180, 0.04)';
  for (let x = 0; x < W; x += tile) {
    ctx.beginPath(); ctx.moveTo(x + 1, 0); ctx.lineTo(x + 1, H); ctx.stroke();
  }
  ctx.restore();

  // Warm overhead light vignette
  const lg = ctx.createRadialGradient(W * 0.5, -H * 0.1, 40 * d.scale, W * 0.5, H * 0.3, Math.max(W, H));
  lg.addColorStop(0, 'rgba(255, 200, 130, 0.20)');
  lg.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = lg;
  ctx.fillRect(0, 0, W, H);

  // Floating dust motes
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 18; i++) {
    const seed = i * 71.3;
    const px = ((Math.sin(seed) * 0.5 + 0.5) * W + t * 0.04 * (1 + (i % 3))) % W;
    const py = ((Math.cos(seed * 1.3) * 0.5 + 0.5) * H + t * 0.025 * ((i % 4) - 1)) % H;
    const r = (1 + (i % 4)) * 2 * d.scale;
    const a = 0.04 + 0.03 * Math.sin(t * 0.001 + seed);
    ctx.fillStyle = `rgba(255, 210, 160, ${a})`;
    ctx.beginPath();
    ctx.arc(((px % W) + W) % W, ((py % H) + H) % H, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ─── Whole flyer ─────────────────────────────────────────────────────────

export function drawFlyer(d: DrawCtx, f: Flyer) {
  const { ctx, scale } = d;
  const r = f.visual.radius * scale;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(f.rot);
  drawAnimal(ctx, f.kind, r, f.visual);
  ctx.restore();
}

function drawAnimal(ctx: CanvasRenderingContext2D, kind: FlyKind, r: number, v: FlyerVisual) {
  switch (kind) {
    case 'chicken':  drawChicken(ctx, r, v); break;
    case 'duck':     drawDuck(ctx, r, v); break;
    case 'pig':      drawPig(ctx, r, v); break;
    case 'sheep':    drawSheep(ctx, r, v); break;
    case 'cow':      drawCow(ctx, r, v); break;
    case 'wagyu':    drawWagyu(ctx, r, v); break;
    case 'puppy':    drawPuppy(ctx, r, v); break;
  }
}

// ─── Half (sliced piece) ─────────────────────────────────────────────────

export function drawHalf(d: DrawCtx, h: Half) {
  const { ctx, scale } = d;
  const r = h.visual.radius * scale;
  const alpha = Math.min(1, h.life / 600);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(h.x, h.y);
  ctx.rotate(h.rot);

  ctx.save();
  ctx.rotate(h.relCutAngle);
  ctx.beginPath();
  const big = r * 5;
  if (h.side === 1) ctx.rect(-big, -big, big * 2, big);
  else              ctx.rect(-big, 0, big * 2, big);
  ctx.clip();
  ctx.rotate(-h.relCutAngle);
  drawAnimal(ctx, h.kind, r, h.visual);
  ctx.restore();

  drawCutFace(ctx, r, scale, h);
  ctx.restore();
}

function drawCutFace(ctx: CanvasRenderingContext2D, r: number, scale: number, h: Half) {
  ctx.save();
  ctx.rotate(h.relCutAngle);
  const v = h.visual;
  const sign = h.side === 1 ? -1 : 1;
  const rx = r * 1.05;
  const ry = r * 0.38;

  // Outer fat/skin ring
  ctx.fillStyle = v.fat;
  ctx.beginPath();
  if (sign === -1) ctx.ellipse(0, 0, rx, ry, 0, Math.PI, Math.PI * 2);
  else             ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();

  // Inner flesh
  const fleshGrad = sign === -1
    ? ctx.createLinearGradient(0, -ry * 0.9, 0, 0)
    : ctx.createLinearGradient(0, 0, 0, ry * 0.9);
  fleshGrad.addColorStop(0, lighten(v.flesh, 0.18));
  fleshGrad.addColorStop(0.55, v.flesh);
  fleshGrad.addColorStop(1, darken(v.flesh, 0.18));
  ctx.fillStyle = fleshGrad;
  const fleshRx = rx * 0.86;
  const fleshRy = ry * 0.82;
  ctx.beginPath();
  if (sign === -1) ctx.ellipse(0, 0, fleshRx, fleshRy, 0, Math.PI, Math.PI * 2);
  else             ctx.ellipse(0, 0, fleshRx, fleshRy, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();

  // Marbling
  ctx.fillStyle = withAlpha(v.fat, 0.7);
  for (let i = 0; i < 5; i++) {
    const k = (i + 0.5) / 5;
    const mx = (k - 0.5) * fleshRx * 1.4;
    const my = sign * (fleshRy * 0.25 + Math.sin(i * 2.1) * fleshRy * 0.18);
    ctx.beginPath();
    ctx.ellipse(mx, my, fleshRx * 0.05, fleshRy * 0.12, Math.sin(i * 1.7), 0, Math.PI * 2);
    ctx.fill();
  }

  // Bone
  ctx.fillStyle = v.bone;
  ctx.strokeStyle = darken(v.flesh, 0.4);
  ctx.lineWidth = 1.4 * scale;
  ctx.beginPath();
  ctx.ellipse(0, sign * fleshRy * 0.5, fleshRx * 0.18, fleshRy * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Cut line
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 1.6 * scale;
  ctx.beginPath();
  ctx.moveTo(-rx, 0);
  ctx.lineTo( rx, 0);
  ctx.stroke();

  // Wet highlight
  ctx.strokeStyle = withAlpha(v.fat, 0.85);
  ctx.lineWidth = 1.2 * scale;
  ctx.beginPath();
  ctx.moveTo(-rx * 0.95, sign * 2 * scale);
  ctx.lineTo( rx * 0.95, sign * 2 * scale);
  ctx.stroke();
  ctx.restore();
}

// ─── Per-animal full-body drawing ────────────────────────────────────────
//
// All animals are drawn facing right (head at +x). Whole body sits inside
// the bounding box [-r..r] × [-r..r], with extents fudged outward for tail/feet.

function fillBody(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, rx: number, ry: number) {
  const grad = ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.4, ry * 0.1, x, y, Math.max(rx, ry));
  grad.addColorStop(0, lighten(color, 0.22));
  grad.addColorStop(1, color);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function outlineEllipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, color = 'rgba(0,0,0,0.35)', w = 0.04) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(rx, ry) * w;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawEye(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, white = false) {
  if (white) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.55, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(cx, cy, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx - size * 0.25, cy - size * 0.35, size * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHoof(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx - w, cy);
  ctx.lineTo(cx + w, cy);
  ctx.lineTo(cx + w * 0.7, cy + h);
  ctx.lineTo(cx - w * 0.7, cy + h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2a1a10';
  ctx.fillRect(cx - w * 0.7, cy + h * 0.85, w * 1.4, h * 0.18);
}

// ────────────── PIG (whole) ──────────────
function drawPig(ctx: CanvasRenderingContext2D, r: number, v: FlyerVisual) {
  const bx = 0, by = 0;
  // Tail (curly, behind body)
  ctx.strokeStyle = darken(v.body, 0.12);
  ctx.lineWidth = r * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx - r * 0.95, by - r * 0.1);
  ctx.bezierCurveTo(
    bx - r * 1.20, by - r * 0.30,
    bx - r * 1.15, by + r * 0.10,
    bx - r * 1.00, by - r * 0.20,
  );
  ctx.stroke();

  // Hind legs (behind body)
  drawHoof(ctx, bx - r * 0.55, by + r * 0.55, r * 0.10, r * 0.30, darken(v.body, 0.08));
  drawHoof(ctx, bx + r * 0.55, by + r * 0.55, r * 0.10, r * 0.30, darken(v.body, 0.08));

  // Body
  fillBody(ctx, v.body, bx, by, r * 0.95, r * 0.60);
  outlineEllipse(ctx, bx, by, r * 0.95, r * 0.60);

  // Front legs
  drawHoof(ctx, bx - r * 0.20, by + r * 0.55, r * 0.10, r * 0.30, v.body);
  drawHoof(ctx, bx + r * 0.20, by + r * 0.55, r * 0.10, r * 0.30, v.body);

  // Ears (on top of head)
  ctx.fillStyle = darken(v.body, 0.10);
  ctx.beginPath();
  ctx.ellipse(bx + r * 0.65, by - r * 0.45, r * 0.13, r * 0.18, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Head (front)
  const hx = bx + r * 0.78, hy = by - r * 0.15;
  fillBody(ctx, v.body, hx, hy, r * 0.40, r * 0.36);
  outlineEllipse(ctx, hx, hy, r * 0.40, r * 0.36);

  // Snout
  ctx.fillStyle = v.accent;
  ctx.beginPath();
  ctx.ellipse(hx + r * 0.22, hy + r * 0.08, r * 0.18, r * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  outlineEllipse(ctx, hx + r * 0.22, hy + r * 0.08, r * 0.18, r * 0.14, darken(v.accent, 0.3), 0.05);
  // Nostrils
  ctx.fillStyle = v.dark;
  ctx.beginPath();
  ctx.ellipse(hx + r * 0.20, hy + r * 0.08, r * 0.025, r * 0.05, 0, 0, Math.PI * 2);
  ctx.ellipse(hx + r * 0.27, hy + r * 0.08, r * 0.025, r * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  drawEye(ctx, hx + r * 0.10, hy - r * 0.10, r * 0.06);
}

// ────────────── COW (whole) ──────────────
function drawCow(ctx: CanvasRenderingContext2D, r: number, v: FlyerVisual) {
  const bx = 0, by = 0;
  // Tail (long with tuft)
  ctx.strokeStyle = darken(v.body, 0.5);
  ctx.lineWidth = r * 0.05;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx - r * 0.90, by - r * 0.05);
  ctx.bezierCurveTo(bx - r * 1.15, by + r * 0.10, bx - r * 1.10, by + r * 0.40, bx - r * 1.05, by + r * 0.55);
  ctx.stroke();
  // Tail tuft
  ctx.fillStyle = v.accent;
  ctx.beginPath();
  ctx.ellipse(bx - r * 1.04, by + r * 0.62, r * 0.08, r * 0.13, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Hind legs
  drawHoof(ctx, bx - r * 0.55, by + r * 0.55, r * 0.10, r * 0.32, '#f0d6c0');
  drawHoof(ctx, bx + r * 0.55, by + r * 0.55, r * 0.10, r * 0.32, '#f0d6c0');

  // Body
  fillBody(ctx, v.body, bx, by, r * 0.95, r * 0.60);
  // Spots
  ctx.fillStyle = v.accent;
  ctx.beginPath();
  ctx.ellipse(bx - r * 0.45, by - r * 0.20, r * 0.25, r * 0.18, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(bx + r * 0.30, by + r * 0.10, r * 0.22, r * 0.16, 0.3, 0, Math.PI * 2);
  ctx.fill();
  outlineEllipse(ctx, bx, by, r * 0.95, r * 0.60);

  // Udder
  ctx.fillStyle = '#f5c6c6';
  ctx.beginPath();
  ctx.ellipse(bx - r * 0.10, by + r * 0.62, r * 0.18, r * 0.10, 0, 0, Math.PI * 2);
  ctx.fill();
  // Teats
  ctx.fillStyle = darken('#f5c6c6', 0.2);
  for (const tx of [-0.18, -0.06, 0.06]) {
    ctx.beginPath();
    ctx.ellipse(bx + tx * r, by + r * 0.70, r * 0.025, r * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Front legs
  drawHoof(ctx, bx + r * 0.15, by + r * 0.55, r * 0.10, r * 0.32, '#f0d6c0');
  drawHoof(ctx, bx + r * 0.40, by + r * 0.55, r * 0.10, r * 0.32, '#f0d6c0');

  // Head (front-right)
  const hx = bx + r * 0.78, hy = by - r * 0.15;
  // Horns
  ctx.fillStyle = v.dark;
  ctx.beginPath();
  ctx.ellipse(hx - r * 0.10, hy - r * 0.30, r * 0.06, r * 0.14, -0.4, 0, Math.PI * 2);
  ctx.ellipse(hx + r * 0.18, hy - r * 0.30, r * 0.06, r * 0.14, 0.4, 0, Math.PI * 2);
  ctx.fill();
  // Ear
  ctx.fillStyle = darken(v.body, 0.18);
  ctx.beginPath();
  ctx.ellipse(hx - r * 0.20, hy - r * 0.18, r * 0.10, r * 0.16, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(hx + r * 0.28, hy - r * 0.18, r * 0.10, r * 0.16, 0.6, 0, Math.PI * 2);
  ctx.fill();

  fillBody(ctx, v.body, hx, hy, r * 0.38, r * 0.34);
  outlineEllipse(ctx, hx, hy, r * 0.38, r * 0.34);

  // Muzzle
  ctx.fillStyle = '#f5c6c6';
  ctx.beginPath();
  ctx.ellipse(hx + r * 0.20, hy + r * 0.10, r * 0.20, r * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  outlineEllipse(ctx, hx + r * 0.20, hy + r * 0.10, r * 0.20, r * 0.14, '#a07a7a', 0.04);
  // Nostrils
  ctx.fillStyle = v.dark;
  ctx.beginPath();
  ctx.ellipse(hx + r * 0.16, hy + r * 0.10, r * 0.025, r * 0.04, 0, 0, Math.PI * 2);
  ctx.ellipse(hx + r * 0.24, hy + r * 0.10, r * 0.025, r * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  drawEye(ctx, hx + r * 0.10, hy - r * 0.10, r * 0.07);
}

// ────────────── CHICKEN (whole) ──────────────
function drawChicken(ctx: CanvasRenderingContext2D, r: number, v: FlyerVisual) {
  const bx = 0, by = 0;
  // Tail feathers (back)
  ctx.fillStyle = darken(v.body, 0.18);
  ctx.beginPath();
  ctx.moveTo(bx - r * 0.55, by - r * 0.05);
  ctx.quadraticCurveTo(bx - r * 1.10, by - r * 0.45, bx - r * 0.95, by - r * 0.05);
  ctx.quadraticCurveTo(bx - r * 1.05, by + r * 0.15, bx - r * 0.55, by + r * 0.15);
  ctx.closePath();
  ctx.fill();

  // Legs (behind body)
  ctx.strokeStyle = v.dark;
  ctx.lineWidth = r * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx - r * 0.12, by + r * 0.42);
  ctx.lineTo(bx - r * 0.18, by + r * 0.80);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx + r * 0.18, by + r * 0.42);
  ctx.lineTo(bx + r * 0.12, by + r * 0.80);
  ctx.stroke();
  // Feet
  ctx.fillStyle = v.dark;
  for (const ft of [-0.18, 0.12]) {
    ctx.beginPath();
    ctx.moveTo(bx + ft * r - r * 0.08, by + r * 0.82);
    ctx.lineTo(bx + ft * r + r * 0.08, by + r * 0.82);
    ctx.lineTo(bx + ft * r, by + r * 0.92);
    ctx.closePath();
    ctx.fill();
  }

  // Body (plump oval)
  fillBody(ctx, v.body, bx, by, r * 0.65, r * 0.62);
  outlineEllipse(ctx, bx, by, r * 0.65, r * 0.62);

  // Head (atop body)
  const hx = bx + r * 0.20, hy = by - r * 0.55;
  // Comb (red crest)
  ctx.fillStyle = v.accent;
  for (let i = 0; i < 3; i++) {
    const cx = hx - r * 0.10 + i * r * 0.15;
    ctx.beginPath();
    ctx.arc(cx, hy - r * 0.30, r * 0.13, Math.PI, Math.PI * 2);
    ctx.fill();
  }
  fillBody(ctx, v.body, hx, hy, r * 0.28, r * 0.28);
  outlineEllipse(ctx, hx, hy, r * 0.28, r * 0.28);

  // Beak
  ctx.fillStyle = v.dark;
  ctx.beginPath();
  ctx.moveTo(hx + r * 0.20, hy - r * 0.02);
  ctx.lineTo(hx + r * 0.42, hy + r * 0.04);
  ctx.lineTo(hx + r * 0.20, hy + r * 0.10);
  ctx.closePath();
  ctx.fill();
  // Wattle
  ctx.fillStyle = v.accent;
  ctx.beginPath();
  ctx.ellipse(hx + r * 0.18, hy + r * 0.16, r * 0.06, r * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  drawEye(ctx, hx + r * 0.12, hy - r * 0.06, r * 0.06);
}

// ────────────── DUCK (whole) ──────────────
function drawDuck(ctx: CanvasRenderingContext2D, r: number, v: FlyerVisual) {
  const bx = 0, by = 0;
  // Tail (small triangle up at back)
  ctx.fillStyle = darken(v.body, 0.1);
  ctx.beginPath();
  ctx.moveTo(bx - r * 0.85, by);
  ctx.lineTo(bx - r * 1.05, by - r * 0.25);
  ctx.lineTo(bx - r * 0.70, by - r * 0.10);
  ctx.closePath();
  ctx.fill();

  // Webbed feet
  ctx.fillStyle = v.accent;
  for (const fx of [-0.20, 0.10]) {
    ctx.beginPath();
    ctx.moveTo(bx + fx * r - r * 0.10, by + r * 0.55);
    ctx.lineTo(bx + fx * r + r * 0.10, by + r * 0.55);
    ctx.lineTo(bx + fx * r, by + r * 0.70);
    ctx.closePath();
    ctx.fill();
  }

  // Body (horizontal teardrop)
  fillBody(ctx, v.body, bx, by, r * 0.92, r * 0.50);
  outlineEllipse(ctx, bx, by, r * 0.92, r * 0.50);

  // Head
  const hx = bx + r * 0.62, hy = by - r * 0.42;
  fillBody(ctx, v.body, hx, hy, r * 0.34, r * 0.32);
  outlineEllipse(ctx, hx, hy, r * 0.34, r * 0.32);

  // Bill (flat orange oval)
  ctx.fillStyle = v.accent;
  ctx.beginPath();
  ctx.ellipse(hx + r * 0.28, hy + r * 0.08, r * 0.25, r * 0.10, 0, 0, Math.PI * 2);
  ctx.fill();
  outlineEllipse(ctx, hx + r * 0.28, hy + r * 0.08, r * 0.25, r * 0.10, v.dark, 0.05);

  // Eye
  drawEye(ctx, hx + r * 0.10, hy - r * 0.05, r * 0.06);

  // Wing
  ctx.fillStyle = darken(v.body, 0.12);
  ctx.beginPath();
  ctx.ellipse(bx + r * 0.05, by - r * 0.05, r * 0.40, r * 0.25, 0.05, 0, Math.PI * 2);
  ctx.fill();
}

// ────────────── SHEEP (whole) ──────────────
function drawSheep(ctx: CanvasRenderingContext2D, r: number, v: FlyerVisual) {
  const bx = 0, by = 0;

  // Legs
  ctx.strokeStyle = v.accent;
  ctx.lineWidth = r * 0.08;
  ctx.lineCap = 'round';
  for (const lx of [-0.50, -0.20, 0.20, 0.50]) {
    ctx.beginPath();
    ctx.moveTo(bx + lx * r, by + r * 0.32);
    ctx.lineTo(bx + lx * r, by + r * 0.70);
    ctx.stroke();
  }

  // Fluffy body — multiple overlapping puffs
  ctx.fillStyle = v.body;
  const puffs = [
    [-0.62, -0.08, 0.34],
    [-0.32, -0.32, 0.36],
    [ 0.00, -0.36, 0.34],
    [ 0.32, -0.32, 0.34],
    [ 0.62, -0.08, 0.34],
    [-0.45,  0.10, 0.30],
    [-0.10,  0.16, 0.30],
    [ 0.30,  0.10, 0.30],
  ];
  for (const [px, py, pr] of puffs) {
    ctx.beginPath();
    ctx.arc(bx + px * r, by + py * r, pr * r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Main body lump
  ctx.beginPath();
  ctx.ellipse(bx, by - r * 0.08, r * 0.75, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  // Inner shadow
  ctx.fillStyle = withAlpha(v.dark, 0.10);
  ctx.beginPath();
  ctx.ellipse(bx, by + r * 0.15, r * 0.55, r * 0.20, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head (front)
  const hx = bx + r * 0.78, hy = by - r * 0.18;
  // Ear (left, behind)
  ctx.fillStyle = v.accent;
  ctx.beginPath();
  ctx.ellipse(hx - r * 0.12, hy + r * 0.04, r * 0.10, r * 0.16, -0.6, 0, Math.PI * 2);
  ctx.fill();
  // Face (dark)
  ctx.fillStyle = v.accent;
  ctx.beginPath();
  ctx.ellipse(hx, hy, r * 0.22, r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  // Right ear
  ctx.beginPath();
  ctx.ellipse(hx + r * 0.18, hy + r * 0.04, r * 0.10, r * 0.16, 0.6, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (white dots on dark face)
  drawEye(ctx, hx - r * 0.06, hy - r * 0.04, r * 0.045, true);
  drawEye(ctx, hx + r * 0.08, hy - r * 0.04, r * 0.045, true);

  // Nose
  ctx.fillStyle = darken(v.flesh, 0.2);
  ctx.beginPath();
  ctx.ellipse(hx + r * 0.02, hy + r * 0.12, r * 0.06, r * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ────────────── WAGYU (golden bonus) ──────────────
function drawWagyu(ctx: CanvasRenderingContext2D, r: number, v: FlyerVisual) {
  const s = r * 0.95;
  // Beef cube body
  const grad = ctx.createLinearGradient(-s, -s, s, s);
  grad.addColorStop(0, lighten(v.body, 0.2));
  grad.addColorStop(1, darken(v.body, 0.15));
  ctx.fillStyle = grad;
  ctx.fillRect(-s, -s * 0.85, s * 2, s * 1.7);
  // Marbling
  ctx.strokeStyle = withAlpha(v.dark, 0.9);
  ctx.lineWidth = r * 0.07;
  ctx.lineCap = 'round';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(-s * 0.85, i * s * 0.32);
    ctx.bezierCurveTo(-s * 0.3, i * s * 0.32 + s * 0.10,
                       s * 0.3, i * s * 0.32 - s * 0.10,
                       s * 0.85, i * s * 0.32);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = r * 0.04;
  ctx.strokeRect(-s, -s * 0.85, s * 2, s * 1.7);
  // Gold A5 stamp
  ctx.save();
  ctx.translate(r * 0.42, -r * 0.45);
  ctx.rotate(-0.2);
  ctx.fillStyle = v.accent;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = darken(v.accent, 0.4);
  ctx.lineWidth = r * 0.03;
  ctx.stroke();
  ctx.fillStyle = '#3a1a08';
  ctx.font = `bold ${r * 0.34}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A5', 0, r * 0.02);
  ctx.restore();
  // Sparkle
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const sx = Math.cos(a) * r * 1.1;
    const sy = Math.sin(a) * r * 1.1;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.10);
    ctx.lineTo(r * 0.025, 0);
    ctx.lineTo(0, r * 0.10);
    ctx.lineTo(-r * 0.025, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// ────────────── PUPPY (bomb) ──────────────
// A golden retriever puppy with a bright blue collar + tongue out.
// Slicing a pet = ironic instant game-over.
function drawPuppy(ctx: CanvasRenderingContext2D, r: number, v: FlyerVisual) {
  const bx = 0, by = 0;
  // Tail (wagging)
  ctx.fillStyle = v.body;
  ctx.beginPath();
  ctx.ellipse(bx - r * 0.90, by - r * 0.15, r * 0.08, r * 0.22, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // Hind legs
  ctx.fillStyle = darken(v.body, 0.06);
  ctx.beginPath();
  ctx.ellipse(bx - r * 0.45, by + r * 0.50, r * 0.13, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(bx + r * 0.50, by + r * 0.50, r * 0.13, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  fillBody(ctx, v.body, bx, by, r * 0.85, r * 0.55);
  outlineEllipse(ctx, bx, by, r * 0.85, r * 0.55);

  // Front legs
  ctx.fillStyle = v.body;
  ctx.beginPath();
  ctx.ellipse(bx + r * 0.20, by + r * 0.50, r * 0.13, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(bx + r * 0.45, by + r * 0.50, r * 0.13, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  // Paws
  ctx.fillStyle = darken(v.body, 0.2);
  ctx.beginPath();
  ctx.ellipse(bx + r * 0.20, by + r * 0.68, r * 0.13, r * 0.05, 0, 0, Math.PI * 2);
  ctx.ellipse(bx + r * 0.45, by + r * 0.68, r * 0.13, r * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  const hx = bx + r * 0.80, hy = by - r * 0.20;
  fillBody(ctx, v.body, hx, hy, r * 0.42, r * 0.40);
  outlineEllipse(ctx, hx, hy, r * 0.42, r * 0.40);

  // Floppy ears (darker accent)
  ctx.fillStyle = v.accent;
  ctx.beginPath();
  ctx.ellipse(hx - r * 0.28, hy - r * 0.05, r * 0.18, r * 0.30, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(hx + r * 0.32, hy - r * 0.05, r * 0.18, r * 0.30,  0.35, 0, Math.PI * 2);
  ctx.fill();

  // Muzzle (lighter patch)
  ctx.fillStyle = lighten(v.body, 0.18);
  ctx.beginPath();
  ctx.ellipse(hx + r * 0.10, hy + r * 0.10, r * 0.22, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tongue
  ctx.fillStyle = '#ff6b8e';
  ctx.beginPath();
  ctx.ellipse(hx + r * 0.18, hy + r * 0.24, r * 0.10, r * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d94070';
  ctx.fillRect(hx + r * 0.17, hy + r * 0.20, r * 0.005, r * 0.16);

  // Nose
  ctx.fillStyle = v.dark;
  ctx.beginPath();
  ctx.ellipse(hx + r * 0.22, hy + r * 0.05, r * 0.07, r * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (big sweet)
  drawEye(ctx, hx - r * 0.05, hy - r * 0.05, r * 0.07);
  drawEye(ctx, hx + r * 0.18, hy - r * 0.05, r * 0.07);

  // 🪀 Bright blue collar with bone tag — this is the "I am a PET" signifier
  ctx.fillStyle = '#3aa0ff';
  ctx.beginPath();
  ctx.ellipse(hx - r * 0.20, hy + r * 0.32, r * 0.18, r * 0.06, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Studs
  ctx.fillStyle = '#1670d0';
  for (let i = 0; i < 4; i++) {
    const sx = hx - r * 0.30 + i * r * 0.07;
    ctx.beginPath();
    ctx.arc(sx, hy + r * 0.34 + i * 0.005 * r, r * 0.022, 0, Math.PI * 2);
    ctx.fill();
  }
  // Bone-shaped name tag
  ctx.fillStyle = '#ffd24a';
  ctx.beginPath();
  const tagX = hx - r * 0.22, tagY = hy + r * 0.46;
  ctx.arc(tagX - r * 0.05, tagY - r * 0.04, r * 0.04, 0, Math.PI * 2);
  ctx.arc(tagX + r * 0.05, tagY - r * 0.04, r * 0.04, 0, Math.PI * 2);
  ctx.arc(tagX - r * 0.05, tagY + r * 0.04, r * 0.04, 0, Math.PI * 2);
  ctx.arc(tagX + r * 0.05, tagY + r * 0.04, r * 0.04, 0, Math.PI * 2);
  ctx.fillRect(tagX - r * 0.07, tagY - r * 0.04, r * 0.14, r * 0.08);
  ctx.fill();
  ctx.strokeStyle = '#a86a10';
  ctx.lineWidth = r * 0.012;
  ctx.stroke();

  // Subtle "halo" of innocence (very faint warm glow ring)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const rr = r * (1.10 + i * 0.02);
    ctx.strokeStyle = `rgba(255, 240, 180, ${0.05 - i * 0.008})`;
    ctx.lineWidth = r * 0.04;
    ctx.beginPath();
    ctx.arc(hx, hy, rr, 0, Math.PI * 2);
    ctx.stroke();
  }
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
    ctx.strokeStyle = `rgba(255, 90, 80, ${0.22 * k})`;
    ctx.lineWidth = width * 1.8;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * k})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

// ─── Color helpers ───────────────────────────────────────────────────────

function rgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return [255, 255, 255];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
function toHex(r: number, g: number, b: number): string {
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
function lighten(hex: string, amount: number): string {
  const [r, g, b] = rgb(hex);
  return toHex(
    Math.min(255, r + Math.round((255 - r) * amount)),
    Math.min(255, g + Math.round((255 - g) * amount)),
    Math.min(255, b + Math.round((255 - b) * amount)),
  );
}
function darken(hex: string, amount: number): string {
  const [r, g, b] = rgb(hex);
  return toHex(
    Math.max(0, Math.round(r * (1 - amount))),
    Math.max(0, Math.round(g * (1 - amount))),
    Math.max(0, Math.round(b * (1 - amount))),
  );
}
function withAlpha(hex: string, a: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
