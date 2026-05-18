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

// Required by useEndlessSlice — kept as no-op since v5 is procedural.
export function setSprites(_: unknown) { /* noop */ }

export function drawBackground(d: DrawCtx, t: number) {
  const { ctx, W, H } = d;
  // Warm sunset over a wooden butcher block
  const breath = 0.5 + 0.5 * Math.sin(t * 0.0008);
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, `rgba(255, 140, 70, ${0.92 - breath * 0.04})`);
  grad.addColorStop(0.4, '#9a3a2a');
  grad.addColorStop(1, '#1a1008');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Soft floating dust motes
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 22; i++) {
    const seed = i * 71.3;
    const px = ((Math.sin(seed) * 0.5 + 0.5) * W + t * 0.04 * (1 + (i % 3))) % W;
    const py = ((Math.cos(seed * 1.3) * 0.5 + 0.5) * H + t * 0.025 * ((i % 4) - 1)) % H;
    const r = (1 + (i % 4)) * 2 * d.scale;
    const a = 0.04 + 0.03 * Math.sin(t * 0.001 + seed);
    ctx.fillStyle = `rgba(255, ${210 + (i % 30)}, ${140 + (i % 60)}, ${a})`;
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

  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.18, r * 0.95, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  drawHead(ctx, f.kind, r, f.visual);

  ctx.restore();
}

function drawHead(ctx: CanvasRenderingContext2D, kind: FlyKind, r: number, v: FlyerVisual) {
  switch (kind) {
    case 'pig':         drawPig(ctx, r, v); break;
    case 'cow':         drawCow(ctx, r, v); break;
    case 'chicken':     drawChicken(ctx, r, v); break;
    case 'sheep':       drawSheep(ctx, r, v); break;
    case 'duck':        drawDuck(ctx, r, v); break;
    case 'wagyu':       drawWagyu(ctx, r, v); break;
    case 'no_butcher':  drawNoButcher(ctx, r, v); break;
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

  // ── 1. Body half: clip to one side of cut line, then draw normal head
  ctx.save();
  ctx.rotate(h.relCutAngle);
  ctx.beginPath();
  const big = r * 4;
  if (h.side === 1) ctx.rect(-big, -big, big * 2, big);   // y ≤ 0
  else              ctx.rect(-big, 0, big * 2, big);      // y ≥ 0
  ctx.clip();
  ctx.rotate(-h.relCutAngle);
  drawHead(ctx, h.kind, r, h.visual);
  ctx.restore();

  // ── 2. Cut face: thick meat cross-section ellipse on the cut edge
  drawCutFace(ctx, r, scale, h);

  ctx.restore();
}

function drawCutFace(ctx: CanvasRenderingContext2D, r: number, scale: number, h: Half) {
  ctx.save();
  ctx.rotate(h.relCutAngle);
  const v = h.visual;
  // Cut surface ellipse extends INTO the body (negative y for side=1, positive for side=-1)
  const sign = h.side === 1 ? -1 : 1;
  const rx = r * 0.92;
  const ry = r * 0.38;
  const cy = sign * 0; // anchored at cut line

  // Outer skin/fat ring (thin)
  ctx.fillStyle = v.fat;
  ctx.beginPath();
  if (sign === -1) ctx.ellipse(0, cy, rx, ry, 0, Math.PI, Math.PI * 2);
  else             ctx.ellipse(0, cy, rx, ry, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();

  // Inner flesh (most of the cross-section)
  const fleshGrad = sign === -1
    ? ctx.createLinearGradient(0, cy - ry * 0.9, 0, cy)
    : ctx.createLinearGradient(0, cy, 0, cy + ry * 0.9);
  fleshGrad.addColorStop(0, lighten(v.flesh, 0.18));
  fleshGrad.addColorStop(0.55, v.flesh);
  fleshGrad.addColorStop(1, darken(v.flesh, 0.18));
  ctx.fillStyle = fleshGrad;
  const fleshRx = rx * 0.86;
  const fleshRy = ry * 0.82;
  ctx.beginPath();
  if (sign === -1) ctx.ellipse(0, cy, fleshRx, fleshRy, 0, Math.PI, Math.PI * 2);
  else             ctx.ellipse(0, cy, fleshRx, fleshRy, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();

  // Marbling — small lighter streaks
  ctx.fillStyle = withAlpha(v.fat, 0.7);
  for (let i = 0; i < 5; i++) {
    const k = (i + 0.5) / 5;
    const mx = (k - 0.5) * fleshRx * 1.4;
    const my = cy + sign * (fleshRy * 0.25 + Math.sin(i * 2.1) * fleshRy * 0.18);
    ctx.beginPath();
    ctx.ellipse(mx, my, fleshRx * 0.05, fleshRy * 0.12, Math.sin(i * 1.7), 0, Math.PI * 2);
    ctx.fill();
  }

  // Bone — small white ellipse near center
  ctx.fillStyle = v.bone;
  ctx.strokeStyle = darken(v.flesh, 0.4);
  ctx.lineWidth = 1.4 * scale;
  ctx.beginPath();
  ctx.ellipse(0, cy + sign * fleshRy * 0.5, fleshRx * 0.18, fleshRy * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Sharp cut-line at the surface
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 1.6 * scale;
  ctx.beginPath();
  ctx.moveTo(-rx, cy);
  ctx.lineTo(rx, cy);
  ctx.stroke();

  // Subtle inner highlight just under the cut line (suggests volume / wetness)
  ctx.strokeStyle = withAlpha(v.fat, 0.85);
  ctx.lineWidth = 1.2 * scale;
  ctx.beginPath();
  ctx.moveTo(-rx * 0.95, cy + sign * 2 * scale);
  ctx.lineTo( rx * 0.95, cy + sign * 2 * scale);
  ctx.stroke();
  ctx.restore();
}

// ─── Per-animal drawing ──────────────────────────────────────────────────

function fillCircleGradient(ctx: CanvasRenderingContext2D, r: number, body: string) {
  const grad = ctx.createRadialGradient(-r * 0.32, -r * 0.34, r * 0.1, 0, 0, r);
  grad.addColorStop(0, lighten(body, 0.22));
  grad.addColorStop(1, body);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
}

function darkOutline(ctx: CanvasRenderingContext2D, r: number) {
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = r * 0.04;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawEye(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.ellipse(cx, cy, size, size * 1.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(cx - size * 0.25, cy - size * 0.4, size * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function drawPig(ctx: CanvasRenderingContext2D, r: number, v: FlyerVisual) {
  // Ears (behind head)
  ctx.fillStyle = darken(v.body, 0.06);
  ctx.beginPath();
  ctx.ellipse(-r * 0.55, -r * 0.62, r * 0.22, r * 0.32, -0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse( r * 0.55, -r * 0.62, r * 0.22, r * 0.32,  0.55, 0, Math.PI * 2);
  ctx.fill();
  // Inner ear blush
  ctx.fillStyle = v.accent;
  ctx.beginPath();
  ctx.ellipse(-r * 0.55, -r * 0.55, r * 0.10, r * 0.18, -0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse( r * 0.55, -r * 0.55, r * 0.10, r * 0.18,  0.55, 0, Math.PI * 2);
  ctx.fill();

  // Head
  fillCircleGradient(ctx, r, v.body);
  darkOutline(ctx, r);

  // Snout
  ctx.fillStyle = v.accent;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.30, r * 0.45, r * 0.30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = darken(v.accent, 0.3);
  ctx.lineWidth = r * 0.03;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.30, r * 0.45, r * 0.30, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Nostrils
  ctx.fillStyle = v.dark;
  ctx.beginPath();
  ctx.ellipse(-r * 0.14, r * 0.30, r * 0.06, r * 0.10, 0, 0, Math.PI * 2);
  ctx.ellipse( r * 0.14, r * 0.30, r * 0.06, r * 0.10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  drawEye(ctx, -r * 0.28, -r * 0.12, r * 0.10);
  drawEye(ctx,  r * 0.28, -r * 0.12, r * 0.10);

  // Blush spots
  ctx.fillStyle = withAlpha(v.accent, 0.55);
  ctx.beginPath();
  ctx.ellipse(-r * 0.55, r * 0.05, r * 0.12, r * 0.08, 0, 0, Math.PI * 2);
  ctx.ellipse( r * 0.55, r * 0.05, r * 0.12, r * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCow(ctx: CanvasRenderingContext2D, r: number, v: FlyerVisual) {
  // Horns
  ctx.fillStyle = v.dark;
  ctx.beginPath();
  ctx.ellipse(-r * 0.58, -r * 0.78, r * 0.10, r * 0.20, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse( r * 0.58, -r * 0.78, r * 0.10, r * 0.20,  0.5, 0, Math.PI * 2);
  ctx.fill();
  // Ears
  ctx.fillStyle = darken(v.body, 0.18);
  ctx.beginPath();
  ctx.ellipse(-r * 0.78, -r * 0.45, r * 0.18, r * 0.26, -0.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse( r * 0.78, -r * 0.45, r * 0.18, r * 0.26,  0.8, 0, Math.PI * 2);
  ctx.fill();

  // Head
  fillCircleGradient(ctx, r, v.body);

  // Black spots
  ctx.fillStyle = v.accent;
  ctx.beginPath();
  ctx.ellipse(-r * 0.42, -r * 0.32, r * 0.22, r * 0.16, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse( r * 0.45,  r * 0.08, r * 0.18, r * 0.22,  0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-r * 0.25, r * 0.52, r * 0.20, r * 0.12, 0.2, 0, Math.PI * 2);
  ctx.fill();
  darkOutline(ctx, r);

  // Muzzle
  ctx.fillStyle = '#f5c6c6';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.36, r * 0.42, r * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = darken('#f5c6c6', 0.3);
  ctx.lineWidth = r * 0.03;
  ctx.stroke();
  // Nostrils
  ctx.fillStyle = v.dark;
  ctx.beginPath();
  ctx.ellipse(-r * 0.14, r * 0.36, r * 0.05, r * 0.09, 0, 0, Math.PI * 2);
  ctx.ellipse( r * 0.14, r * 0.36, r * 0.05, r * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  drawEye(ctx, -r * 0.32, -r * 0.10, r * 0.11);
  drawEye(ctx,  r * 0.32, -r * 0.10, r * 0.11);
}

function drawChicken(ctx: CanvasRenderingContext2D, r: number, v: FlyerVisual) {
  // Comb (red crest on top)
  ctx.fillStyle = v.accent;
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, -r * 0.85);
  for (let i = 0; i < 3; i++) {
    const cx = -r * 0.3 + (i + 0.5) * r * 0.2;
    ctx.arc(cx, -r * 0.95, r * 0.16, Math.PI, Math.PI * 2);
  }
  ctx.lineTo( r * 0.3, -r * 0.85);
  ctx.closePath();
  ctx.fill();

  // Head
  fillCircleGradient(ctx, r, v.body);
  darkOutline(ctx, r);

  // Beak
  ctx.fillStyle = v.dark;
  ctx.beginPath();
  ctx.moveTo(-r * 0.10, r * 0.18);
  ctx.lineTo( r * 0.10, r * 0.18);
  ctx.lineTo(0, r * 0.52);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = darken(v.dark, 0.3);
  ctx.lineWidth = r * 0.025;
  ctx.stroke();
  // Beak inner line
  ctx.beginPath();
  ctx.moveTo(-r * 0.10, r * 0.34);
  ctx.lineTo( r * 0.10, r * 0.34);
  ctx.stroke();

  // Wattles (small red drops below beak)
  ctx.fillStyle = v.accent;
  ctx.beginPath();
  ctx.ellipse(-r * 0.10, r * 0.55, r * 0.06, r * 0.10, 0, 0, Math.PI * 2);
  ctx.ellipse( r * 0.10, r * 0.55, r * 0.06, r * 0.10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  drawEye(ctx, -r * 0.32, -r * 0.16, r * 0.10);
  drawEye(ctx,  r * 0.32, -r * 0.16, r * 0.10);
}

function drawSheep(ctx: CanvasRenderingContext2D, r: number, v: FlyerVisual) {
  // Fluffy fleece — multiple overlapping circles
  ctx.fillStyle = v.body;
  const positions = [
    [0,        -r * 0.75, r * 0.42],
    [-r * 0.68,-r * 0.42, r * 0.42],
    [ r * 0.68,-r * 0.42, r * 0.42],
    [-r * 0.85, r * 0.10, r * 0.42],
    [ r * 0.85, r * 0.10, r * 0.42],
    [-r * 0.55, r * 0.60, r * 0.42],
    [ r * 0.55, r * 0.60, r * 0.42],
    [0,         r * 0.78, r * 0.42],
  ];
  for (const [cx, cy, rr] of positions) {
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  // Main fluff body
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
  ctx.fill();
  // Soft inner shadow
  ctx.fillStyle = withAlpha(v.dark, 0.10);
  ctx.beginPath();
  ctx.arc(0, r * 0.15, r * 0.55, 0, Math.PI * 2);
  ctx.fill();

  // Ears (black drooping)
  ctx.fillStyle = v.accent;
  ctx.beginPath();
  ctx.ellipse(-r * 0.55, r * 0.05, r * 0.14, r * 0.22, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse( r * 0.55, r * 0.05, r * 0.14, r * 0.22,  0.6, 0, Math.PI * 2);
  ctx.fill();

  // Face (dark center)
  ctx.fillStyle = v.accent;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.10, r * 0.32, r * 0.40, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (small white dots on dark face)
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-r * 0.12, r * 0.00, r * 0.06, 0, Math.PI * 2);
  ctx.arc( r * 0.12, r * 0.00, r * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(-r * 0.10, r * 0.02, r * 0.03, 0, Math.PI * 2);
  ctx.arc( r * 0.10, r * 0.02, r * 0.03, 0, Math.PI * 2);
  ctx.fill();

  // Nose
  ctx.fillStyle = darken(v.flesh, 0.2);
  ctx.beginPath();
  ctx.ellipse(0, r * 0.24, r * 0.08, r * 0.05, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawDuck(ctx: CanvasRenderingContext2D, r: number, v: FlyerVisual) {
  // Head
  fillCircleGradient(ctx, r, v.body);
  darkOutline(ctx, r);

  // Bill (orange flat oval, wide)
  ctx.fillStyle = v.accent;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.32, r * 0.55, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = v.dark;
  ctx.lineWidth = r * 0.025;
  ctx.stroke();
  // Bill highlight line
  ctx.strokeStyle = withAlpha(v.dark, 0.5);
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, r * 0.32);
  ctx.lineTo( r * 0.45, r * 0.32);
  ctx.stroke();

  // Cheek puff
  ctx.fillStyle = withAlpha('#ffffff', 0.4);
  ctx.beginPath();
  ctx.ellipse(-r * 0.55, r * 0.10, r * 0.18, r * 0.14, 0, 0, Math.PI * 2);
  ctx.ellipse( r * 0.55, r * 0.10, r * 0.18, r * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  drawEye(ctx, -r * 0.28, -r * 0.18, r * 0.11);
  drawEye(ctx,  r * 0.28, -r * 0.18, r * 0.11);

  // Top feather tuft
  ctx.strokeStyle = darken(v.body, 0.3);
  ctx.lineWidth = r * 0.05;
  ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * r * 0.10, -r * 0.85);
    ctx.lineTo(i * r * 0.10 + r * 0.05, -r * 1.10);
    ctx.stroke();
  }
}

function drawWagyu(ctx: CanvasRenderingContext2D, r: number, v: FlyerVisual) {
  // Beef cube body
  const grad = ctx.createLinearGradient(-r, -r, r, r);
  grad.addColorStop(0, lighten(v.body, 0.2));
  grad.addColorStop(1, darken(v.body, 0.15));
  ctx.fillStyle = grad;
  const s = r * 0.95;
  ctx.fillRect(-s, -s * 0.85, s * 2, s * 1.7);
  // Marbling (white squiggle lines)
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
  // Outline
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = r * 0.04;
  ctx.strokeRect(-s, -s * 0.85, s * 2, s * 1.7);
  // Gold A5 stamp
  ctx.save();
  ctx.translate(r * 0.4, -r * 0.45);
  ctx.rotate(-0.2);
  ctx.fillStyle = v.accent;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = darken(v.accent, 0.4);
  ctx.lineWidth = r * 0.03;
  ctx.stroke();
  ctx.fillStyle = '#3a1a08';
  ctx.font = `bold ${r * 0.32}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A5', 0, r * 0.02);
  ctx.restore();
  // Sparkle stars
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.3;
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

function drawNoButcher(ctx: CanvasRenderingContext2D, r: number, v: FlyerVisual) {
  // Red sign body
  ctx.fillStyle = v.body;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  // White inner band
  ctx.strokeStyle = v.accent;
  ctx.lineWidth = r * 0.14;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  // Cleaver icon — silhouette of a cleaver
  ctx.save();
  ctx.rotate(-0.5);
  ctx.fillStyle = v.accent;
  // Blade (rectangle)
  ctx.fillRect(-r * 0.36, -r * 0.12, r * 0.42, r * 0.32);
  // Handle (small rectangle to right)
  ctx.fillRect( r * 0.06, -r * 0.05, r * 0.28, r * 0.10);
  ctx.restore();
  // Diagonal slash (the "no" symbol)
  ctx.save();
  ctx.rotate(0.785);  // 45°
  ctx.fillStyle = v.accent;
  ctx.fillRect(-r * 0.85, -r * 0.10, r * 1.7, r * 0.20);
  ctx.restore();
  // Outline
  ctx.strokeStyle = darken(v.body, 0.4);
  ctx.lineWidth = r * 0.04;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // Spark crown (subtle danger glow)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.fillStyle = `rgba(255, 90, 80, 0.4)`;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 1.18, Math.sin(a) * r * 1.18, r * 0.10, 0, Math.PI * 2);
    ctx.fill();
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
    // Outer red glow
    ctx.strokeStyle = `rgba(255, 90, 80, ${0.22 * k})`;
    ctx.lineWidth = width * 1.8;
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

// ─── Color helpers ────────────────────────────────────────────────────────

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
