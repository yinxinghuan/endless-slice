import type { ActiveFood, Rating } from '../types';

export interface DrawCtx {
  ctx: CanvasRenderingContext2D;
  W: number;          // device-px width
  H: number;          // device-px height
  scale: number;      // (W / 1080) — design-unit → device-px multiplier
  boardLeft: number;  // device-px
  boardRight: number; // device-px
  boardTop: number;
  boardBottom: number;
  centerY: number;    // device-px
}

export function makeDrawCtx(ctx: CanvasRenderingContext2D, W: number, H: number): DrawCtx {
  const scale = W / 1080;
  const boardHeight = Math.min(H * 0.55, 720 * scale);
  const centerY = H * 0.5;
  const boardTop = centerY - boardHeight / 2;
  const boardBottom = centerY + boardHeight / 2;
  const boardMargin = 40 * scale;
  return {
    ctx,
    W,
    H,
    scale,
    boardLeft: boardMargin,
    boardRight: W - boardMargin,
    boardTop,
    boardBottom,
    centerY,
  };
}

export function drawBackground(d: DrawCtx, t: number) {
  const { ctx, W, H } = d;
  // Dark cozy backdrop with subtle vignette breath.
  const breath = 0.5 + 0.5 * Math.sin(t * 0.0006);
  const grad = ctx.createRadialGradient(W / 2, H / 2, 40 * d.scale, W / 2, H / 2, Math.max(W, H) * 0.7);
  grad.addColorStop(0, `rgba(64, 38, 22, ${0.95 - breath * 0.05})`);
  grad.addColorStop(0.7, '#22150c');
  grad.addColorStop(1, '#0e0805');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

export function drawBoard(d: DrawCtx) {
  const { ctx, boardLeft, boardRight, boardTop, boardBottom, scale } = d;
  const w = boardRight - boardLeft;
  const h = boardBottom - boardTop;

  // Board base
  ctx.save();
  const grad = ctx.createLinearGradient(0, boardTop, 0, boardBottom);
  grad.addColorStop(0, '#a37348');
  grad.addColorStop(0.5, '#7a5230');
  grad.addColorStop(1, '#5d3c20');
  ctx.fillStyle = grad;
  roundRect(ctx, boardLeft, boardTop, w, h, 24 * scale);
  ctx.fill();

  // Wood grain (subtle lines)
  ctx.strokeStyle = 'rgba(40,22,10,0.18)';
  ctx.lineWidth = 1 * scale;
  for (let i = 0; i < 10; i++) {
    const y = boardTop + (h / 10) * (i + 0.5) + Math.sin(i * 1.3) * 4 * scale;
    ctx.beginPath();
    ctx.moveTo(boardLeft + 20 * scale, y);
    ctx.lineTo(boardRight - 20 * scale, y);
    ctx.stroke();
  }
  // Edge shadow
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 3 * scale;
  roundRect(ctx, boardLeft, boardTop, w, h, 24 * scale);
  ctx.stroke();
  ctx.restore();
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

export function drawFood(d: DrawCtx, food: ActiveFood) {
  const { ctx, scale } = d;
  const kind = food.kind;
  const len = kind.length * scale;
  const thick = kind.thickness * scale;
  const left = food.leftX;
  const top = food.centerY - thick / 2;

  ctx.save();
  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  roundRect(ctx, left + 4 * scale, top + 8 * scale, len, thick, thick / 2);
  ctx.fill();

  // Body
  const grad = ctx.createLinearGradient(0, top, 0, top + thick);
  grad.addColorStop(0, kind.accent);
  grad.addColorStop(0.5, kind.body);
  grad.addColorStop(1, kind.crust);
  ctx.fillStyle = grad;
  roundRect(ctx, left, top, len, thick, thick / 2);
  ctx.fill();

  // Crust ends
  ctx.fillStyle = kind.crust;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.ellipse(left + thick * 0.18, food.centerY, thick * 0.18, thick * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(left + len - thick * 0.18, food.centerY, thick * 0.18, thick * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Surface specks (texture)
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  const speckCount = Math.floor(kind.length / 30);
  for (let i = 0; i < speckCount; i++) {
    const sx = left + ((i * 73 + food.seed * 17) % len);
    const sy = top + ((i * 37 + food.seed * 11) % thick * 0.7) + thick * 0.15;
    const r = 1.4 * scale + (i % 3) * 0.4 * scale;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Target dashes (uncut = white dashed; cut = colored slot)
  food.marks.forEach((m) => {
    const x = m.x;
    if (!m.cut) {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2 * scale;
      ctx.setLineDash([6 * scale, 5 * scale]);
      ctx.beginPath();
      ctx.moveTo(x, top - 6 * scale);
      ctx.lineTo(x, top + thick + 6 * scale);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // Cut mark: thin dark gap rendered later in cuts loop.
    }
  });

  // Cuts (player slashes) — solid dark gap
  food.cuts.forEach((c) => {
    const color = c.rating === 'perfect' ? '#ffd24a'
                : c.rating === 'good' ? '#9be36b'
                : c.rating === 'ok' ? '#7ad0ff'
                : '#ff5a5a';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.moveTo(c.x, top - 10 * scale);
    ctx.lineTo(c.x, top + thick + 10 * scale);
    ctx.stroke();
    // Dark inset
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.moveTo(c.x, top + 4 * scale);
    ctx.lineTo(c.x, top + thick - 4 * scale);
    ctx.stroke();
  });

  ctx.restore();
}

export function drawScanLine(d: DrawCtx, x: number, food: ActiveFood) {
  const { ctx, scale } = d;
  const top = food.centerY - food.kind.thickness * scale / 2 - 18 * scale;
  const bot = food.centerY + food.kind.thickness * scale / 2 + 18 * scale;
  ctx.save();
  // Faint trail
  const grad = ctx.createLinearGradient(x - 80 * scale, 0, x, 0);
  grad.addColorStop(0, 'rgba(255,210,90,0)');
  grad.addColorStop(1, 'rgba(255,210,90,0.35)');
  ctx.fillStyle = grad;
  ctx.fillRect(x - 80 * scale, top, 80 * scale, bot - top);
  // The line itself
  ctx.strokeStyle = '#ffd24a';
  ctx.shadowColor = '#ffd24a';
  ctx.shadowBlur = 14 * scale;
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.moveTo(x, top);
  ctx.lineTo(x, bot);
  ctx.stroke();
  ctx.restore();
}

export function ratingColor(r: Rating): string {
  switch (r) {
    case 'perfect': return '#ffd24a';
    case 'good':    return '#9be36b';
    case 'ok':      return '#7ad0ff';
    case 'miss':    return '#ff5a5a';
  }
}

export function drawLeavingFood(d: DrawCtx, food: ActiveFood, progress: number) {
  // progress 0 → 1: pieces fall and slide off to the left + downward + rotate.
  const { ctx, scale } = d;
  const kind = food.kind;
  const thick = kind.thickness * scale;
  const len = kind.length * scale;
  const top = food.centerY - thick / 2;

  // Split positions
  const cutXs = [...food.cuts.map(c => c.x), food.leftX, food.leftX + len].sort((a, b) => a - b);
  for (let i = 0; i < cutXs.length - 1; i++) {
    const x0 = cutXs[i];
    const x1 = cutXs[i + 1];
    const w = x1 - x0;
    if (w < 2) continue;
    const dx = -120 * scale * progress - i * 10 * scale * progress;
    const dy = 240 * scale * progress * progress + i * 20 * scale * progress;
    const rot = (i % 2 === 0 ? -1 : 1) * 0.3 * progress + (food.seed % 5) * 0.02;
    const alpha = 1 - progress * 0.7;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x0 + w / 2 + dx, food.centerY + dy);
    ctx.rotate(rot);
    ctx.translate(-(x0 + w / 2), -food.centerY);

    const grad = ctx.createLinearGradient(0, top, 0, top + thick);
    grad.addColorStop(0, kind.accent);
    grad.addColorStop(0.5, kind.body);
    grad.addColorStop(1, kind.crust);
    ctx.fillStyle = grad;
    roundRect(ctx, x0, top, w, thick, Math.min(thick / 2, w / 2));
    ctx.fill();
    // cut face
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x0, top, 2 * scale, thick);
    ctx.fillRect(x1 - 2 * scale, top, 2 * scale, thick);
    ctx.restore();
  }
}
