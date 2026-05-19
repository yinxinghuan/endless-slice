import type { Flyer, FlyKind, FlyerVisual, Half, Impact, Particle, TrailPoint } from '../types';

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

  // ── 1. Tent fabric: two close-tone reds in vertical stripes ──
  const stripeW = 78 * d.scale;
  // Base deep red
  ctx.fillStyle = '#581010';
  ctx.fillRect(0, 0, W, H);
  // Alternate slightly brighter red stripes (close tone, just texture)
  ctx.fillStyle = '#7a1818';
  for (let x = -stripeW; x < W + stripeW; x += stripeW * 2) {
    ctx.fillRect(x, 0, stripeW, H);
  }

  // Subtle vertical seam shadows (where panels of tent fabric meet)
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#1a0606';
  for (let x = -stripeW; x < W + stripeW; x += stripeW * 2) {
    ctx.fillRect(x - 1 * d.scale, 0, 2 * d.scale, H);
    ctx.fillRect(x + stripeW - 1 * d.scale, 0, 2 * d.scale, H);
  }
  ctx.restore();

  // Floating dust motes
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 18; i++) {
    const seed = i * 71.3;
    const px = ((Math.sin(seed) * 0.5 + 0.5) * W + t * 0.04 * (1 + (i % 3))) % W;
    const py = ((Math.cos(seed * 1.3) * 0.5 + 0.5) * H + t * 0.025 * ((i % 4) - 1)) % H;
    const r = (1 + (i % 4)) * 2 * d.scale;
    const a = 0.04 + 0.03 * Math.sin(t * 0.001 + seed);
    ctx.fillStyle = `rgba(255, 220, 160, ${a})`;
    ctx.beginPath();
    ctx.arc(((px % W) + W) % W, ((py % H) + H) % H, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ─── Stage spotlights ────────────────────────────────────────────────────
//
// Two drifting overhead spotlights lay warm soft pools on the tent fabric
// (additive radial gradients). Combined with drawObjectShadows() for
// flyers/halves, this delivers the stage-light feel without garish framing.

export interface Spotlight { cx: number; cy: number; r: number; color: string }

export function getSpotlights(t: number, W: number, H: number): Spotlight[] {
  return [
    {
      cx: W * 0.5 + Math.sin(t * 0.00040) * W * 0.22,
      cy: H * 0.32 + Math.sin(t * 0.00035) * H * 0.07,
      r:  Math.max(W, H) * 0.55,
      color: 'rgba(255, 220, 150, 0.22)',
    },
    {
      cx: W * 0.30 - Math.sin(t * 0.00055) * W * 0.18,
      cy: H * 0.58 + Math.cos(t * 0.00042) * H * 0.05,
      r:  Math.max(W, H) * 0.42,
      color: 'rgba(255, 170, 210, 0.14)',
    },
  ];
}

export function drawSpotlights(d: DrawCtx, lights: Spotlight[]) {
  const { ctx, W, H } = d;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const L of lights) {
    const g = ctx.createRadialGradient(L.cx, L.cy, 0, L.cx, L.cy, L.r);
    g.addColorStop(0,    L.color);
    g.addColorStop(0.55, L.color.replace(/,\s*0?\.[0-9]+\)/, ', 0.04)'));
    g.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

/**
 * Soft blurred shadow drawn under each living flyer and tumbling half,
 * offset away from the dominant overhead spotlight. Drawn AFTER background
 * + spotlights but BEFORE the objects themselves, so the shadow lands on
 * the tent fabric beneath the object.
 */
export function drawObjectShadows(d: DrawCtx, flyers: Flyer[], halves: Half[], lights: Spotlight[]) {
  if (lights.length === 0) return;
  const { ctx, scale } = d;
  const L = lights[0]; // dominant light

  const drop = (x: number, y: number, r: number, alpha: number) => {
    const dx = x - L.cx;
    const dy = y - L.cy;
    const len = Math.hypot(dx, dy) || 1;
    // Big push so the shadow clearly separates from the object (depth feel).
    // Lateral offset follows the light vector; vertical extra drop sells the
    // sense the object floats above the tent.
    const push = 70 * scale;
    const sx = x + (dx / len) * push * 0.5;
    const sy = y + (dy / len) * push * 0.5 + 50 * scale;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 1.8);
    g.addColorStop(0,    `rgba(0,0,0,${alpha})`);
    g.addColorStop(0.55, `rgba(0,0,0,${alpha * 0.4})`);
    g.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    // Flatter ellipse — typical floor cast shadow shape.
    ctx.ellipse(sx, sy, r * 1.4, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  ctx.save();
  flyers.forEach(f => {
    if (f.sliced) return;
    drop(f.x, f.y, f.visual.radius * scale, 0.45);
  });
  halves.forEach(h => {
    drop(h.x, h.y, h.visual.radius * scale, 0.32);
  });
  ctx.restore();
}

// ─── Title watermark (debossed into the canvas backdrop) ────────────────
//
// Drawn AFTER drawBackground but BEFORE flyers / halves / particles so that
// gameplay floats in front of the title. Same trick Marbles uses: three text
// layers — light edge below + dark edge above + dark-fill carved letter.

export function drawTitleWatermark(d: DrawCtx) {
  const { ctx, W, H } = d;
  const cx = W / 2;
  const cy = H / 2;

  const ctx2d = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Auto-fit big slab-serif words to ~78% of canvas width.
  const maxW = W * 0.78;
  let bigSize = Math.min(W * 0.22, H * 0.16);
  ctx2d.letterSpacing = '0.04em';
  for (; bigSize >= 30; bigSize -= 2) {
    ctx.font = `400 ${bigSize}px "Rye", "Playfair Display", "Times New Roman", serif`;
    if (ctx.measureText('TABLE').width <= maxW) break;
  }
  const tinySize = bigSize * 0.22;
  const subSize  = bigSize * 0.28;
  const lineGap  = bigSize * 0.85;

  // Y positions (top to bottom)
  const yTopRule  = cy - lineGap * 1.6 - subSize * 1.2;
  const yGreatest = cy - lineGap * 1.6;
  const yFarm     = cy - lineGap * 0.75;
  const yTo       = cy;
  const yTable    = cy + lineGap * 0.75;
  const yShow     = cy + lineGap * 1.6;
  const yBotRule  = cy + lineGap * 1.6 + subSize * 1.2;

  // Decorative top / bottom rules with star centerpiece
  drawCircusRule(ctx, cx, yTopRule, W * 0.66, bigSize * 0.08);
  drawCircusRule(ctx, cx, yBotRule, W * 0.66, bigSize * 0.08);

  // Sub-titles (Playfair italic — different feel from the slab Rye words)
  drawDebossedLine(ctx, 'THE GREATEST', cx, yGreatest, subSize, 'italic 800', 'Playfair Display');
  drawDebossedLine(ctx, 'SHOW ON EARTH', cx, yShow,    subSize, 'italic 800', 'Playfair Display');

  // Main words in Rye (circus poster slab serif)
  drawDebossedLine(ctx, 'FARM',  cx, yFarm,  bigSize, '400', 'Rye');
  // Tiny italic "to" with stars flanking it (carnival barker style)
  drawDebossedLine(ctx, '✶  to  ✶', cx, yTo, tinySize * 1.6, 'italic 700', 'Playfair Display');
  drawDebossedLine(ctx, 'TABLE', cx, yTable, bigSize, '400', 'Rye');

  ctx2d.letterSpacing = '0em';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawDebossedLine(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, weight: string, family = 'Playfair Display') {
  ctx.font = `${weight} ${size}px "${family}", "Bodoni 72", "Times New Roman", serif`;
  // Warm bottom-right rim (catches stage light)
  ctx.fillStyle = 'rgba(255, 220, 180, 0.10)';
  ctx.fillText(text, x + 1.6, y + 2.0);
  // Dark top-left rim (indent shadow)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillText(text, x - 0.6, y - 2.0);
  // Carved-in main fill
  ctx.fillStyle = '#34080a';
  ctx.fillText(text, x, y);
}

/** A horizontal decorative rule with a star in the middle, debossed. */
function drawCircusRule(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
  const halfW = w / 2;
  const starR = h * 1.6;
  // The two side bars (gap in the middle for the star)
  drawDebossedRect(ctx, cx - halfW, cy - h / 2, halfW - starR * 1.4, h);
  drawDebossedRect(ctx, cx + starR * 1.4, cy - h / 2, halfW - starR * 1.4, h);
  // Centerpiece star
  drawDebossedStar(ctx, cx, cy, starR);
}

function drawDebossedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  // Highlight (warm)
  ctx.fillStyle = 'rgba(255, 220, 180, 0.10)';
  ctx.fillRect(x + 1, y + 1, w, h);
  // Shadow indent
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(x - 0.5, y - 1, w, h);
  // Carved fill
  ctx.fillStyle = '#34080a';
  ctx.fillRect(x, y, w, h);
}

function drawDebossedStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const points = 5;
  const drawAt = (dx: number, dy: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const ang = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 === 0 ? r : r * 0.42;
      const px = cx + dx + Math.cos(ang) * rr;
      const py = cy + dy + Math.sin(ang) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  };
  drawAt(1.4, 1.6, 'rgba(255, 220, 180, 0.10)'); // highlight
  drawAt(-0.6, -1.6, 'rgba(0, 0, 0, 0.55)');     // shadow
  drawAt(0, 0, '#34080a');                        // carved fill
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

/**
 * Strong "DO NOT SLICE" signal layered around every pet. Drawn in world
 * space (NOT inside the body's rotation transform) so all elements stay
 * upright while the pet tumbles.
 *
 *   1. Thick pulsing pink halo wrapping the body (1.3× radius outer)
 *   2. Cream "PET" banner ribbon across the chest with the pet's name
 *   3. Big floating heart disc with crossed-out cleaver, sitting above
 *
 * Together this is impossible to miss even at high spawn rate.
 */
export function drawPetBadge(d: DrawCtx, f: Flyer) {
  const { ctx, scale } = d;
  const r = f.visual.radius * scale;
  const t = performance.now();
  const pulse = 0.5 + 0.5 * Math.sin(t * 0.006);

  // ── 1. Body halo ──
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const haloRMax = r * (1.45 + pulse * 0.10);
  // Outer soft pink glow
  for (let i = 0; i < 6; i++) {
    const rr = haloRMax * (1 + i * 0.05);
    ctx.fillStyle = `rgba(255, 110, 170, ${0.10 - i * 0.014})`;
    ctx.beginPath();
    ctx.arc(f.x, f.y, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Solid thick pink ring (the "selected pet" outline)
  ctx.strokeStyle = `rgba(255, 100, 160, ${0.55 + pulse * 0.35})`;
  ctx.lineWidth = (6 + pulse * 3) * scale;
  ctx.beginPath();
  ctx.arc(f.x, f.y, r * 1.18, 0, Math.PI * 2);
  ctx.stroke();
  // Cream inner highlight ring
  ctx.strokeStyle = `rgba(255, 245, 232, ${0.7})`;
  ctx.lineWidth = 1.6 * scale;
  ctx.beginPath();
  ctx.arc(f.x, f.y, r * 1.12, 0, Math.PI * 2);
  ctx.stroke();

  // ── 2. "PET" ribbon banner across the body ──
  const banY = f.y;
  const banH = r * 0.40;
  const banW = r * 1.85;
  ctx.save();
  ctx.translate(f.x, banY);
  // Body fill
  ctx.fillStyle = '#ff3a7a';
  roundRect(ctx, -banW / 2, -banH / 2, banW, banH, banH * 0.18);
  ctx.fill();
  // Cream inner band
  ctx.fillStyle = '#fff5e8';
  roundRect(ctx, -banW / 2 + 3 * scale, -banH / 2 + 3 * scale, banW - 6 * scale, banH - 6 * scale, banH * 0.12);
  ctx.fill();
  // "PET" text
  ctx.font = `900 ${banH * 0.62}px "Rye", "Playfair Display", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#b81818';
  ctx.fillText('PET', 0, 0);
  // Ribbon end notches
  ctx.fillStyle = '#ff3a7a';
  ctx.beginPath();
  ctx.moveTo(-banW / 2, -banH / 2);
  ctx.lineTo(-banW / 2 - banH * 0.4, 0);
  ctx.lineTo(-banW / 2, banH / 2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(banW / 2, -banH / 2);
  ctx.lineTo(banW / 2 + banH * 0.4, 0);
  ctx.lineTo(banW / 2, banH / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // ── 3. Heart disc with cleaver-slash above the body ──
  const discCx = f.x;
  const discCy = f.y - r * 1.35;
  const discR = r * 0.40 * (1 + pulse * 0.10);
  // Cream disc + double-color outline
  ctx.fillStyle = '#fff5e8';
  ctx.beginPath();
  ctx.arc(discCx, discCy, discR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ff3a7a';
  ctx.lineWidth = 4 * scale;
  ctx.stroke();
  ctx.strokeStyle = '#ffd24a';
  ctx.lineWidth = 1.6 * scale;
  ctx.beginPath();
  ctx.arc(discCx, discCy, discR - 5 * scale, 0, Math.PI * 2);
  ctx.stroke();
  // Heart inside
  const hr = discR * 0.55;
  ctx.fillStyle = '#ff2a72';
  drawHeartPath(ctx, discCx, discCy + hr * 0.10, hr);
  ctx.fill();
  // Heart shine
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(discCx - hr * 0.28, discCy - hr * 0.20, hr * 0.20, hr * 0.13, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // Diagonal cleaver-slash "NO" through the heart
  ctx.save();
  ctx.translate(discCx, discCy);
  ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = '#b81818';
  ctx.fillRect(-discR * 1.05, -discR * 0.13, discR * 2.1, discR * 0.26);
  ctx.fillStyle = '#fff5e8';
  ctx.fillRect(-discR * 1.05, -discR * 0.06, discR * 2.1, discR * 0.04);
  ctx.restore();
}

/**
 * Renders a static memorial scene of the slain pet inside an arbitrary
 * canvas (used on the end screen). The two halves sit slightly tilted with
 * a thick cut face + blood splatter around them + a small "X" eye motif.
 * Cream paper background to fit the receipt card.
 */
export function drawSlainPetScene(ctx: CanvasRenderingContext2D, kind: FlyKind, visual: FlyerVisual, w: number, h: number) {
  // Transparent canvas — let the parent receipt card show through so this
  // reads as carnage scattered ON the paper, not a framed-off illustration.
  ctx.clearRect(0, 0, w, h);

  const r = Math.min(w, h) * 0.32;
  const cx = w / 2;
  const cy = h * 0.55;

  // Blood splatter behind / around
  const splatColor = visual.flesh;
  ctx.save();
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2;
    const dist = (0.4 + Math.random() * 0.9) * r * 1.4;
    const px = cx + Math.cos(a) * dist;
    const py = cy + Math.sin(a) * dist * 0.7;
    const dropR = (3 + Math.random() * 8) * (Math.min(w, h) / 220);
    ctx.fillStyle = splatColor;
    ctx.globalAlpha = 0.5 + Math.random() * 0.4;
    ctx.beginPath();
    ctx.arc(px, py, dropR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Build two synthetic halves
  const rad = (visual.radius);
  const visScale = r / rad;

  // Half A — flung up-left
  drawMemorialHalf(ctx, kind, visual, cx - r * 0.55, cy - r * 0.10, visScale, -0.22, +1, w);
  // Half B — flung down-right
  drawMemorialHalf(ctx, kind, visual, cx + r * 0.55, cy + r * 0.10, visScale, 0.22, -1, w);

  // X-eyes mark above (universal "kaput" sign)
  ctx.save();
  ctx.strokeStyle = '#b81818';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  const exR = r * 0.10;
  const drawX = (ex: number, ey: number) => {
    ctx.beginPath();
    ctx.moveTo(ex - exR, ey - exR); ctx.lineTo(ex + exR, ey + exR);
    ctx.moveTo(ex - exR, ey + exR); ctx.lineTo(ex + exR, ey - exR);
    ctx.stroke();
  };
  drawX(cx - r * 0.55, cy - r * 0.55);
  drawX(cx + r * 0.55, cy - r * 0.45);
  ctx.restore();

  // "R.I.P." stamp at bottom (slightly off-axis, like an ink stamp pressed
  // into the paper). No frame box — just the inky text directly on the card.
  ctx.save();
  ctx.translate(cx, h - 18);
  ctx.rotate(-0.06);
  ctx.font = `900 22px "Rye", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(184, 24, 24, 0.72)';
  ctx.fillText('R.I.P.', 0, 0);
  ctx.restore();
}

function drawMemorialHalf(ctx: CanvasRenderingContext2D, kind: FlyKind, visual: FlyerVisual, x: number, y: number, visScale: number, rot: number, side: 1 | -1, _w: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(visScale, visScale);
  const r = visual.radius;

  // Clip to one half along x-axis (so cut shows on the inside edge facing the gap)
  ctx.save();
  ctx.beginPath();
  const big = r * 4;
  if (side === 1) ctx.rect(-big, -big, big * 2, big);   // upper-half clip
  else            ctx.rect(-big, 0, big * 2, big);      // lower-half clip
  ctx.clip();
  drawAnimal(ctx, kind, r, visual);
  ctx.restore();

  // Cut-face: thick meat cross-section ellipse
  const sign = side === 1 ? -1 : 1;
  const rx = r * 1.05;
  const ry = r * 0.36;
  // Outer fat
  ctx.fillStyle = visual.fat;
  ctx.beginPath();
  if (sign === -1) ctx.ellipse(0, 0, rx, ry, 0, Math.PI, Math.PI * 2);
  else             ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  // Inner flesh gradient
  const fleshGrad = sign === -1
    ? ctx.createLinearGradient(0, -ry * 0.9, 0, 0)
    : ctx.createLinearGradient(0, 0, 0, ry * 0.9);
  fleshGrad.addColorStop(0, lighten(visual.flesh, 0.18));
  fleshGrad.addColorStop(0.55, visual.flesh);
  fleshGrad.addColorStop(1, darken(visual.flesh, 0.18));
  ctx.fillStyle = fleshGrad;
  const fRx = rx * 0.86, fRy = ry * 0.82;
  ctx.beginPath();
  if (sign === -1) ctx.ellipse(0, 0, fRx, fRy, 0, Math.PI, Math.PI * 2);
  else             ctx.ellipse(0, 0, fRx, fRy, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  // Bone
  ctx.fillStyle = visual.bone;
  ctx.strokeStyle = darken(visual.flesh, 0.4);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, sign * fRy * 0.5, fRx * 0.18, fRy * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Cut line
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-rx, 0); ctx.lineTo(rx, 0);
  ctx.stroke();

  ctx.restore();
}

function drawHeartPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.45);
  ctx.bezierCurveTo(x + r * 1.0, y - r * 0.05, x + r * 0.55, y - r * 0.85, x, y - r * 0.30);
  ctx.bezierCurveTo(x - r * 0.55, y - r * 0.85, x - r * 1.0, y - r * 0.05, x, y + r * 0.45);
  ctx.closePath();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
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
    case 'kitten':   drawKitten(ctx, r, v); break;
    case 'bunny':    drawBunny(ctx, r, v); break;
    case 'hamster':  drawHamster(ctx, r, v); break;
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

// ────────────── KITTEN (bomb — gray tabby) ──────────────
function drawKitten(ctx: CanvasRenderingContext2D, r: number, v: FlyerVisual) {
  const bx = 0, by = 0;
  // Tail (curled up behind body)
  ctx.fillStyle = v.body;
  ctx.beginPath();
  ctx.ellipse(bx - r * 0.90, by - r * 0.10, r * 0.08, r * 0.30, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = darken(v.body, 0.05);
  for (const lx of [-0.40, 0.45]) {
    ctx.beginPath();
    ctx.ellipse(bx + lx * r, by + r * 0.45, r * 0.12, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Body
  fillBody(ctx, v.body, bx, by, r * 0.78, r * 0.50);
  // Stripes
  ctx.strokeStyle = withAlpha(v.accent, 0.6);
  ctx.lineWidth = r * 0.05;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(bx + i * r * 0.2, by - r * 0.45);
    ctx.lineTo(bx + i * r * 0.2 + r * 0.05, by - r * 0.20);
    ctx.stroke();
  }
  outlineEllipse(ctx, bx, by, r * 0.78, r * 0.50);

  // Head
  const hx = bx + r * 0.70, hy = by - r * 0.30;
  fillBody(ctx, v.body, hx, hy, r * 0.40, r * 0.38);

  // Pointy ears
  ctx.fillStyle = v.body;
  ctx.beginPath();
  ctx.moveTo(hx - r * 0.32, hy - r * 0.18);
  ctx.lineTo(hx - r * 0.20, hy - r * 0.52);
  ctx.lineTo(hx - r * 0.06, hy - r * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hx + r * 0.06, hy - r * 0.28);
  ctx.lineTo(hx + r * 0.20, hy - r * 0.52);
  ctx.lineTo(hx + r * 0.32, hy - r * 0.18);
  ctx.closePath();
  ctx.fill();
  // Inner ears (pink)
  ctx.fillStyle = '#ffc0d0';
  ctx.beginPath();
  ctx.moveTo(hx - r * 0.22, hy - r * 0.24);
  ctx.lineTo(hx - r * 0.18, hy - r * 0.40);
  ctx.lineTo(hx - r * 0.12, hy - r * 0.26);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hx + r * 0.12, hy - r * 0.26);
  ctx.lineTo(hx + r * 0.18, hy - r * 0.40);
  ctx.lineTo(hx + r * 0.22, hy - r * 0.24);
  ctx.closePath();
  ctx.fill();
  outlineEllipse(ctx, hx, hy, r * 0.40, r * 0.38);

  // Eyes (large green to read as cat)
  ctx.fillStyle = '#7ad06a';
  ctx.beginPath();
  ctx.ellipse(hx - r * 0.13, hy, r * 0.08, r * 0.10, 0, 0, Math.PI * 2);
  ctx.ellipse(hx + r * 0.13, hy, r * 0.08, r * 0.10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(hx - r * 0.14, hy - r * 0.10, r * 0.02, r * 0.20);
  ctx.fillRect(hx + r * 0.12, hy - r * 0.10, r * 0.02, r * 0.20);

  // Pink nose
  ctx.fillStyle = '#ff80a0';
  ctx.beginPath();
  ctx.moveTo(hx, hy + r * 0.05);
  ctx.lineTo(hx - r * 0.05, hy + r * 0.12);
  ctx.lineTo(hx + r * 0.05, hy + r * 0.12);
  ctx.closePath();
  ctx.fill();
  // Whiskers
  ctx.strokeStyle = withAlpha('#fff', 0.7);
  ctx.lineWidth = r * 0.01;
  for (const yo of [-0.04, 0, 0.04]) {
    ctx.beginPath();
    ctx.moveTo(hx - r * 0.10, hy + r * 0.16 + yo * r);
    ctx.lineTo(hx - r * 0.40, hy + r * 0.16 + yo * 1.5 * r);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hx + r * 0.10, hy + r * 0.16 + yo * r);
    ctx.lineTo(hx + r * 0.40, hy + r * 0.16 + yo * 1.5 * r);
    ctx.stroke();
  }

  // Red bow-tie collar (pet signifier)
  ctx.fillStyle = '#e23b3b';
  ctx.beginPath();
  ctx.moveTo(hx - r * 0.18, hy + r * 0.30);
  ctx.lineTo(hx - r * 0.30, hy + r * 0.20);
  ctx.lineTo(hx - r * 0.30, hy + r * 0.40);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(hx + r * 0.18, hy + r * 0.30);
  ctx.lineTo(hx + r * 0.30, hy + r * 0.20);
  ctx.lineTo(hx + r * 0.30, hy + r * 0.40);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#a01818';
  ctx.fillRect(hx - r * 0.06, hy + r * 0.24, r * 0.12, r * 0.12);

  drawPetHalo(ctx, hx, hy, r);
}

// ────────────── BUNNY (bomb — white rabbit) ──────────────
function drawBunny(ctx: CanvasRenderingContext2D, r: number, v: FlyerVisual) {
  const bx = 0, by = 0;

  // Hind legs (big rabbit hops)
  ctx.fillStyle = darken(v.body, 0.04);
  ctx.beginPath();
  ctx.ellipse(bx - r * 0.42, by + r * 0.50, r * 0.20, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(bx + r * 0.48, by + r * 0.50, r * 0.20, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body (egg-shaped)
  fillBody(ctx, v.body, bx, by, r * 0.65, r * 0.55);
  outlineEllipse(ctx, bx, by, r * 0.65, r * 0.55);

  // Cotton tail
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(bx - r * 0.60, by + r * 0.10, r * 0.10, 0, Math.PI * 2);
  ctx.fill();

  // Front paws
  ctx.fillStyle = v.body;
  ctx.beginPath();
  ctx.ellipse(bx + r * 0.20, by + r * 0.40, r * 0.10, r * 0.13, 0, 0, Math.PI * 2);
  ctx.ellipse(bx + r * 0.42, by + r * 0.40, r * 0.10, r * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Head
  const hx = bx + r * 0.55, hy = by - r * 0.30;
  // Long ears (behind head)
  ctx.fillStyle = v.body;
  ctx.beginPath();
  ctx.ellipse(hx - r * 0.18, hy - r * 0.50, r * 0.10, r * 0.34, -0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(hx + r * 0.18, hy - r * 0.50, r * 0.10, r * 0.34, 0.18, 0, Math.PI * 2);
  ctx.fill();
  // Inner ear (pink)
  ctx.fillStyle = v.accent;
  ctx.beginPath();
  ctx.ellipse(hx - r * 0.18, hy - r * 0.50, r * 0.05, r * 0.26, -0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(hx + r * 0.18, hy - r * 0.50, r * 0.05, r * 0.26, 0.18, 0, Math.PI * 2);
  ctx.fill();

  fillBody(ctx, v.body, hx, hy, r * 0.36, r * 0.34);
  outlineEllipse(ctx, hx, hy, r * 0.36, r * 0.34);

  // Eyes (round black)
  drawEye(ctx, hx - r * 0.13, hy - r * 0.04, r * 0.07);
  drawEye(ctx, hx + r * 0.13, hy - r * 0.04, r * 0.07);

  // Pink nose
  ctx.fillStyle = v.accent;
  ctx.beginPath();
  ctx.moveTo(hx, hy + r * 0.10);
  ctx.lineTo(hx - r * 0.05, hy + r * 0.16);
  ctx.lineTo(hx + r * 0.05, hy + r * 0.16);
  ctx.closePath();
  ctx.fill();
  // Mouth (Y shape under nose)
  ctx.strokeStyle = v.dark;
  ctx.lineWidth = r * 0.015;
  ctx.beginPath();
  ctx.moveTo(hx, hy + r * 0.16);
  ctx.lineTo(hx, hy + r * 0.22);
  ctx.moveTo(hx, hy + r * 0.22);
  ctx.lineTo(hx - r * 0.04, hy + r * 0.27);
  ctx.moveTo(hx, hy + r * 0.22);
  ctx.lineTo(hx + r * 0.04, hy + r * 0.27);
  ctx.stroke();

  // Pink ribbon collar with carrot tag (pet signifier)
  ctx.fillStyle = '#ff7aa8';
  ctx.beginPath();
  ctx.ellipse(hx - r * 0.05, hy + r * 0.34, r * 0.20, r * 0.05, 0.1, 0, Math.PI * 2);
  ctx.fill();
  // Carrot tag
  ctx.fillStyle = '#ff8025';
  ctx.beginPath();
  ctx.moveTo(hx + r * 0.05, hy + r * 0.42);
  ctx.lineTo(hx + r * 0.02, hy + r * 0.56);
  ctx.lineTo(hx + r * 0.10, hy + r * 0.56);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3aa84a';
  ctx.fillRect(hx + r * 0.03, hy + r * 0.40, r * 0.06, r * 0.04);

  drawPetHalo(ctx, hx, hy, r);
}

// ────────────── HAMSTER (bomb — small + adorable) ──────────────
function drawHamster(ctx: CanvasRenderingContext2D, r: number, v: FlyerVisual) {
  const bx = 0, by = 0;
  // Small round body
  fillBody(ctx, v.body, bx, by, r * 0.85, r * 0.78);
  // Belly patch (cream)
  ctx.fillStyle = v.accent;
  ctx.beginPath();
  ctx.ellipse(bx, by + r * 0.15, r * 0.55, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  outlineEllipse(ctx, bx, by, r * 0.85, r * 0.78);

  // Tiny ears
  ctx.fillStyle = darken(v.body, 0.15);
  ctx.beginPath();
  ctx.arc(bx - r * 0.45, by - r * 0.55, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bx + r * 0.45, by - r * 0.55, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
  // Inner ear pink
  ctx.fillStyle = '#ffc8b8';
  ctx.beginPath();
  ctx.arc(bx - r * 0.45, by - r * 0.55, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bx + r * 0.45, by - r * 0.55, r * 0.08, 0, Math.PI * 2);
  ctx.fill();

  // Tiny paws on belly
  ctx.fillStyle = darken(v.body, 0.10);
  ctx.beginPath();
  ctx.ellipse(bx - r * 0.12, by + r * 0.55, r * 0.08, r * 0.06, 0, 0, Math.PI * 2);
  ctx.ellipse(bx + r * 0.12, by + r * 0.55, r * 0.08, r * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (huge black)
  drawEye(ctx, bx - r * 0.20, by - r * 0.10, r * 0.10);
  drawEye(ctx, bx + r * 0.20, by - r * 0.10, r * 0.10);

  // Tiny pink nose
  ctx.fillStyle = '#ff80a0';
  ctx.beginPath();
  ctx.ellipse(bx, by + r * 0.10, r * 0.06, r * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();
  // Mouth
  ctx.strokeStyle = v.dark;
  ctx.lineWidth = r * 0.015;
  ctx.beginPath();
  ctx.moveTo(bx, by + r * 0.14);
  ctx.lineTo(bx, by + r * 0.20);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(bx, by + r * 0.20, r * 0.06, 0, Math.PI);
  ctx.stroke();

  // Sunflower seed in hand (pet signifier)
  ctx.save();
  ctx.translate(bx + r * 0.35, by + r * 0.30);
  ctx.rotate(-0.4);
  ctx.fillStyle = '#3a2a18';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.08, r * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#caa078';
  ctx.lineWidth = r * 0.012;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r * 0.04, Math.sin(a) * r * 0.06);
    ctx.stroke();
  }
  ctx.restore();

  drawPetHalo(ctx, bx, by - r * 0.1, r);
}

function drawPetHalo(ctx: CanvasRenderingContext2D, hx: number, hy: number, r: number) {
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

/** Circus poster-stub style "+N" / "×N +N" callout drawn at each slice. */
export function drawImpactTicket(d: DrawCtx, impact: Impact, now: number, lifetime: number) {
  const k = (now - impact.born) / lifetime;
  if (k >= 1) return;
  const { ctx, scale } = d;
  const alpha = 1 - k;
  const dy = -70 * scale * k;
  const popScale = (1 + (1 - k) * 0.55) * impact.scale;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(impact.x, impact.y + dy);
  ctx.scale(popScale, popScale);

  // Measure
  const fontSize = 30 * scale;
  ctx.font = `900 ${fontSize}px "Rye", "Playfair Display", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(impact.text).width;
  const padX = 22 * scale;
  const ticketW = tw + padX * 2;
  const ticketH = 40 * scale;
  const rrad = ticketH / 2;

  // Soft drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, -ticketW / 2 + 2 * scale, -ticketH / 2 + 4 * scale, ticketW, ticketH, rrad);
  ctx.fill();

  // Red/orange/gold body — color tied to combo via impact.color
  ctx.fillStyle = impact.color;
  roundRect(ctx, -ticketW / 2, -ticketH / 2, ticketW, ticketH, rrad);
  ctx.fill();

  // Cream double-trim
  ctx.strokeStyle = 'rgba(245, 232, 200, 0.95)';
  ctx.lineWidth = 2.4 * scale;
  roundRect(ctx, -ticketW / 2 + 4 * scale, -ticketH / 2 + 4 * scale,
            ticketW - 8 * scale, ticketH - 8 * scale, Math.max(2, rrad - 4 * scale));
  ctx.stroke();

  // Gold outer thread
  ctx.strokeStyle = 'rgba(255, 210, 74, 0.85)';
  ctx.lineWidth = 1.2 * scale;
  roundRect(ctx, -ticketW / 2 - 1.5 * scale, -ticketH / 2 - 1.5 * scale,
            ticketW + 3 * scale, ticketH + 3 * scale, rrad + 1.5 * scale);
  ctx.stroke();

  // Small dark perforation dots at the two ends (ticket-stub feel)
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.arc(-ticketW / 2 + 8 * scale, 0, 2 * scale, 0, Math.PI * 2);
  ctx.arc( ticketW / 2 - 8 * scale, 0, 2 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Star flourishes on combo-heavy hits
  const isComboHit = impact.text.startsWith('×') || impact.text.includes('GOLDEN');
  if (isComboHit) {
    drawTinyStar(ctx, -ticketW / 2 - 12 * scale, 0, 6 * scale, '#f5e8c8');
    drawTinyStar(ctx,  ticketW / 2 + 12 * scale, 0, 6 * scale, '#f5e8c8');
  }

  // Text — cream with dark inset shadow, like a stamp pressed into paper
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillText(impact.text, 0, 3 * scale);
  ctx.fillStyle = '#fff5e8';
  ctx.fillText(impact.text, 0, 2 * scale);

  ctx.restore();
}

function drawTinyStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.42;
    const px = cx + Math.cos(ang) * rr;
    const py = cy + Math.sin(ang) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

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
