import type { ActiveFood } from '../types';

export interface DrawCtx {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  scale: number;
  boardLeft: number;
  boardRight: number;
  boardTop: number;
  boardBottom: number;
  centerY: number;
}

export function makeDrawCtx(ctx: CanvasRenderingContext2D, W: number, H: number): DrawCtx {
  const scale = W / 1080;
  const boardHeight = Math.min(H * 0.55, 720 * scale);
  const centerY = H * 0.5;
  const boardTop = centerY - boardHeight / 2;
  const boardBottom = centerY + boardHeight / 2;
  const boardMargin = 40 * scale;
  return {
    ctx, W, H, scale,
    boardLeft: boardMargin,
    boardRight: W - boardMargin,
    boardTop, boardBottom, centerY,
  };
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

export function drawBackground(d: DrawCtx, t: number) {
  const { ctx, W, H } = d;
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
  ctx.save();
  const grad = ctx.createLinearGradient(0, boardTop, 0, boardBottom);
  grad.addColorStop(0, '#a37348');
  grad.addColorStop(0.5, '#7a5230');
  grad.addColorStop(1, '#5d3c20');
  ctx.fillStyle = grad;
  roundRect(ctx, boardLeft, boardTop, w, h, 24 * scale);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,22,10,0.18)';
  ctx.lineWidth = 1 * scale;
  for (let i = 0; i < 10; i++) {
    const y = boardTop + (h / 10) * (i + 0.5) + Math.sin(i * 1.3) * 4 * scale;
    ctx.beginPath();
    ctx.moveTo(boardLeft + 20 * scale, y);
    ctx.lineTo(boardRight - 20 * scale, y);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 3 * scale;
  roundRect(ctx, boardLeft, boardTop, w, h, 24 * scale);
  ctx.stroke();
  ctx.restore();
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
  roundRect(ctx, left + 4 * scale, top + 10 * scale, len, thick, thick / 2);
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

  // Surface specks
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

  // Cuts (animated): bright flash on birth → settle to thin colored gap
  const now = performance.now();
  food.cuts.forEach((c) => {
    const age = now - c.born;
    const fresh = Math.max(0, 1 - age / 180); // 0..1, fresh→old over 180ms
    const baseColor = comboColor(c.combo);

    // Fresh glow halo
    if (fresh > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = (3 + 12 * fresh) * scale;
      ctx.shadowColor = baseColor;
      ctx.shadowBlur = (10 + 30 * fresh) * scale;
      ctx.globalAlpha = 0.55 + 0.45 * fresh;
      ctx.beginPath();
      ctx.moveTo(c.x, top - 24 * scale);
      ctx.lineTo(c.x, top + thick + 24 * scale);
      ctx.stroke();
      ctx.restore();
    }
    // Persistent thin slash
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.moveTo(c.x, top - 8 * scale);
    ctx.lineTo(c.x, top + thick + 8 * scale);
    ctx.stroke();
    // Dark inset gap (the "sliced" feel)
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    ctx.moveTo(c.x, top + 4 * scale);
    ctx.lineTo(c.x, top + thick - 4 * scale);
    ctx.stroke();
  });

  ctx.restore();
}

export function comboColor(combo: number): string {
  if (combo >= 10) return '#ff4f5e';
  if (combo >= 7)  return '#ff7a3c';
  if (combo >= 5)  return '#ffae3e';
  if (combo >= 3)  return '#ffd24a';
  return '#fffacc';
}

/** Active-window progress bar above the food (1 → 0 as time runs out). */
export function drawTimerBar(d: DrawCtx, food: ActiveFood) {
  if (food.phase !== 'active') return;
  const { ctx, scale } = d;
  const k = Math.max(0, Math.min(1, food.remaining / food.activeS));
  const len = food.kind.length * scale;
  const top = food.centerY - food.kind.thickness * scale / 2 - 22 * scale;
  const h = 6 * scale;
  const w = len;
  // Track
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, food.leftX, top, w, h, h / 2);
  ctx.fill();
  // Fill — color shifts from green → yellow → red
  const color = k > 0.6 ? '#9be36b' : k > 0.3 ? '#ffd24a' : '#ff5a5a';
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8 * scale;
  roundRect(ctx, food.leftX, top, w * k, h, h / 2);
  ctx.fill();
  ctx.restore();
}

export function drawLeavingFood(d: DrawCtx, food: ActiveFood, progress: number) {
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
    // Each piece tumbles independently; outer pieces fly farther/faster
    const sideSign = (x0 + w / 2 - (food.leftX + len / 2)) > 0 ? 1 : -1;
    const dx = sideSign * (100 + i * 8) * scale * progress;
    const dy = (260 + i * 6) * scale * progress * progress;
    const rot = sideSign * (0.18 + i * 0.04) * progress + (food.seed % 5) * 0.02;
    const alpha = 1 - progress * 0.55;
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
    // cut face highlights
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x0, top, 2 * scale, thick);
    ctx.fillRect(x1 - 2 * scale, top, 2 * scale, thick);
    ctx.restore();
  }
}
