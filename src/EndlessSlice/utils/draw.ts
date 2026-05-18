import type { Flyer, Half, Particle, TrailPoint, FlyerVisual } from '../types';

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
  const breath = 0.5 + 0.5 * Math.sin(t * 0.0006);
  const grad = ctx.createRadialGradient(W / 2, H * 0.4, 60 * d.scale, W / 2, H / 2, Math.max(W, H) * 0.8);
  grad.addColorStop(0, `rgba(74, 44, 26, ${0.95 - breath * 0.05})`);
  grad.addColorStop(0.7, '#22150c');
  grad.addColorStop(1, '#0e0805');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

// ─── Whole flyer ─────────────────────────────────────────────────────────

export function drawFlyer(d: DrawCtx, f: Flyer) {
  const { ctx, scale } = d;
  const r = f.visual.radius * scale;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(f.rot);

  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.12, r * 0.95, r * 0.95 * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();

  if (f.kind === 'bomb') {
    drawBombBody(ctx, r, f.visual);
  } else if (f.kind === 'banana') {
    drawBananaBody(ctx, r, f.visual);
  } else if (f.kind === 'watermelon') {
    drawWatermelonBody(ctx, r, f.visual);
  } else if (f.kind === 'sushi') {
    drawSushiBody(ctx, r, f.visual);
  } else if (f.kind === 'cucumber') {
    drawCucumberBody(ctx, r, f.visual);
  } else {
    // tomato / orange / golden — round skin
    drawRoundBody(ctx, r, f.visual);
    if (f.kind === 'tomato') drawTomatoLeaf(ctx, r, f.visual);
    if (f.kind === 'orange') drawOrangePeel(ctx, r);
    if (f.kind === 'golden') drawGoldenSparkle(ctx, r);
  }

  // Subtle highlight
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.32, -r * 0.42, r * 0.4, r * 0.22, -0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawRoundBody(ctx: CanvasRenderingContext2D, r: number, v: FlyerVisual) {
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  grad.addColorStop(0, lighten(v.body, 0.2));
  grad.addColorStop(1, v.body);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawTomatoLeaf(ctx: CanvasRenderingContext2D, r: number, v: FlyerVisual) {
  ctx.fillStyle = v.accent;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.55;
    const lx = Math.cos(a) * r * 0.55;
    const ly = Math.sin(a) * r * 0.55;
    ctx.ellipse(lx, ly, r * 0.22, r * 0.13, a, 0, Math.PI * 2);
  }
  ctx.fill();
}

function drawOrangePeel(ctx: CanvasRenderingContext2D, r: number) {
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = r * 0.04;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95);
    ctx.stroke();
  }
}

function drawGoldenSparkle(ctx: CanvasRenderingContext2D, r: number) {
  ctx.fillStyle = '#fff';
  ctx.globalAlpha = 0.85;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawBananaBody(ctx: CanvasRenderingContext2D, r: number, v: FlyerVisual) {
  // Crescent
  ctx.fillStyle = v.body;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.1, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  // Inner curve (subtract via overlay)
  ctx.fillStyle = lighten(v.body, 0.15);
  ctx.beginPath();
  ctx.ellipse(0, r * 0.4, r * 1.05, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ends darker
  ctx.fillStyle = v.accent;
  ctx.beginPath();
  ctx.ellipse(-r * 1.05, 0, r * 0.1, r * 0.18, 0, 0, Math.PI * 2);
  ctx.ellipse(r * 1.05, 0, r * 0.1, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCucumberBody(ctx: CanvasRenderingContext2D, r: number, v: FlyerVisual) {
  const grad = ctx.createLinearGradient(0, -r * 0.4, 0, r * 0.4);
  grad.addColorStop(0, lighten(v.body, 0.2));
  grad.addColorStop(1, v.body);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.15, r * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ridges
  ctx.strokeStyle = v.accent;
  ctx.lineWidth = r * 0.04;
  for (let i = -3; i <= 3; i++) {
    const x = i * r * 0.28;
    ctx.beginPath();
    ctx.moveTo(x, -r * 0.4);
    ctx.lineTo(x, r * 0.4);
    ctx.stroke();
  }
}

function drawWatermelonBody(ctx: CanvasRenderingContext2D, r: number, v: FlyerVisual) {
  // Green skin
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  grad.addColorStop(0, lighten(v.body, 0.25));
  grad.addColorStop(1, v.body);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  // Stripes
  ctx.fillStyle = v.accent;
  ctx.globalAlpha = 0.45;
  for (let i = -3; i <= 3; i++) {
    const a = (i / 3) * 0.7;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.07, r * 0.95, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawSushiBody(ctx: CanvasRenderingContext2D, r: number, v: FlyerVisual) {
  // Dark nori cylinder seen from end
  ctx.fillStyle = v.body;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  // Rice inner ring
  ctx.fillStyle = v.flesh;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
  ctx.fill();
  // Red filling center
  ctx.fillStyle = v.accent;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
  ctx.fill();
}

function drawBombBody(ctx: CanvasRenderingContext2D, r: number, v: FlyerVisual) {
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  grad.addColorStop(0, '#55555a');
  grad.addColorStop(0.8, v.body);
  grad.addColorStop(1, '#000');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  // Fuse
  ctx.strokeStyle = '#8a6b3a';
  ctx.lineWidth = r * 0.10;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.95);
  ctx.quadraticCurveTo(r * 0.55, -r * 1.45, r * 0.65, -r * 1.7);
  ctx.stroke();
  // Spark
  ctx.fillStyle = v.accent;
  ctx.shadowColor = v.accent;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(r * 0.65, -r * 1.7, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // White warning stripe
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = `bold ${r * 0.7}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('!', 0, 0);
}

// ─── Half (sliced piece) ─────────────────────────────────────────────────

export function drawHalf(d: DrawCtx, h: Half) {
  const { ctx, scale } = d;
  const r = h.visual.radius * scale;
  const alpha = Math.min(1, h.life / 600);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(h.x, h.y);
  // Rotate so the cut faces "down" (+y) in local space
  ctx.rotate(h.cutAngle + (h.side === 1 ? 0 : Math.PI));

  // Body half-disk: arc above the cut line (y <= 0 in local space).
  ctx.fillStyle = h.visual.body;
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI, 0); // upper half
  ctx.closePath();
  ctx.fill();

  // Flesh strip along cut line
  const fleshGrad = ctx.createLinearGradient(0, -r * 0.1, 0, 0);
  fleshGrad.addColorStop(0, lighten(h.visual.flesh, 0.2));
  fleshGrad.addColorStop(1, h.visual.flesh);
  ctx.fillStyle = fleshGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.92, r * 0.32, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // Seeds
  if (h.visual.seeds > 0) {
    ctx.fillStyle = h.visual.accent;
    for (let i = 0; i < h.visual.seeds; i++) {
      const k = (i + 0.5) / h.visual.seeds;
      const sx = (k - 0.5) * r * 1.5;
      const sy = -r * 0.08 + Math.sin(i * 2.3) * r * 0.05;
      ctx.beginPath();
      ctx.ellipse(sx, sy, r * 0.05, r * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Edge shadow
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = r * 0.04;
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI, 0);
  ctx.stroke();

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
    const k = Math.max(0, 1 - age / 200); // fade over 200ms
    if (k <= 0) continue;
    const width = 18 * scale * k + 4 * scale;
    // Outer glow
    ctx.strokeStyle = `rgba(255, 240, 200, ${0.18 * k})`;
    ctx.lineWidth = width * 1.8;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    // Bright core
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * k})`;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

// ─── Misc ────────────────────────────────────────────────────────────────

function lighten(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  let r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  r = Math.min(255, r + Math.round((255 - r) * amount));
  g = Math.min(255, g + Math.round((255 - g) * amount));
  b = Math.min(255, b + Math.round((255 - b) * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
