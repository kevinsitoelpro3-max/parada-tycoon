import { WMAX, HMAX, DIRS } from '../config.js';
import { ctx, clamp, mulberry32 } from '../utils.js';
import { game, T, isRoad } from '../state.js';
import { check } from '../tools.js';
import { P, poly, tile, line, cbox, circle } from './iso.js';

/* ---------- Terreno: pasto, calles, carretera, agua, árboles y resaltado de herramientas ---------- */
const CURB = { '1,0': [[1, 0], [1, 1]], '-1,0': [[0, 0], [0, 1]], '0,1': [[0, 1], [1, 1]], '0,-1': [[0, 0], [1, 0]] };
function drawRoad(x, y) {
  tile(x, y, '#4B4F57');
  for (const [dx, dy] of DIRS) {
    const nx = x + dx, ny = y + dy;
    const conn = isRoad(nx, ny) || (nx === 0 && dx === -1);
    if (conn) {
      line(P(x + 0.5 + dx * 0.12, y + 0.5 + dy * 0.12), P(x + 0.5 + dx * 0.38, y + 0.5 + dy * 0.38), 1.5, 'rgba(255,255,255,.72)');
    } else {
      const [a, b] = CURB[dx + ',' + dy];
      line(P(x + a[0], y + a[1]), P(x + b[0], y + b[1]), 2.2, '#D9D3C3');
    }
  }
}
function drawHwy(y) {
  tile(0, y, '#3A3D43');
  line(P(0.07, y), P(0.07, y + 1), 1.4, 'rgba(255,255,255,.8)');
  if (!isRoad(1, y)) line(P(0.93, y), P(0.93, y + 1), 1.4, 'rgba(255,255,255,.8)');
  line(P(0.5, y + 0.15), P(0.5, y + 0.6), 1.7, '#F2C230');
}
export function drawGround() {
  const W = game.W, H = game.H;
  for (let y = -4; y <= H + 3; y++) for (let x = -3; x <= W + 2; x++) {
    const inLot = x >= 0 && x < W && y >= 0 && y < H;
    const d = Math.max(0, -x, x - (W - 1), -y, y - (H - 1));
    const a = inLot ? 1 : clamp(1 - d * 0.3, 0, 1);
    if (a <= 0) continue;
    ctx.globalAlpha = a;
    if (x === 0) drawHwy(y);
    else if (!inLot) tile(x, y, (x + y) & 1 ? '#9AC673' : '#95C16E');
    else {
      const t = T(x, y);
      if (t.t === 'road') drawRoad(x, y);
      else if (t.t === 'water') {
        tile(x, y, '#4C9CC4');
        poly([P(x + 0.5, y + 0.18), P(x + 0.82, y + 0.5), P(x + 0.5, y + 0.82), P(x + 0.18, y + 0.5)], '#6CB2D4');
      }
      else if (t.t === 'bld') tile(x, y, '#CEC9BD');
      else tile(x, y, (x + y) & 1 ? '#8CC265' : '#86BC5F');
    }
  }
  ctx.globalAlpha = 1;
  ctx.beginPath();
  const c = [P(1, 0), P(W, 0), P(W, H), P(1, H)];
  ctx.moveTo(c[0][0], c[0][1]); for (let i = 1; i < 4; i++) ctx.lineTo(c[i][0], c[i][1]);
  ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.stroke(); ctx.setLineDash([]);
}
export function drawHighlights() {
  const tool = game.tool, sel = game.sel;
  if (tool !== 'none' && !game.S.over) {
    const fill = tool === 'demo' ? 'rgba(230,57,70,.34)' : 'rgba(255,238,140,.45)';
    for (let y = 0; y < game.H; y++) for (let x = 1; x < game.W; x++) if (check(tool, x, y).ok) tile(x, y, fill);
  }
  if (sel) {
    const p = [P(sel.x, sel.y), P(sel.x + 1, sel.y), P(sel.x + 1, sel.y + 1), P(sel.x, sel.y + 1)];
    ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < 4; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.closePath();
    ctx.lineWidth = 3; ctx.strokeStyle = '#F2C230'; ctx.stroke();
  }
}
export function drawTree(x, y, s) {
  const cx = x + 0.5, cy = y + 0.5, g = P(cx, cy);
  ctx.beginPath(); ctx.ellipse(g[0] + 3, g[1] + 1, 13 * s, 6.5 * s, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.fill();
  cbox(cx - 0.035, cy - 0.035, cx + 0.035, cy + 0.035, 0, 0.32 * s, '#7A5230');
  const p = P(cx, cy, 0.62 * s);
  circle(p[0], p[1], 12.5 * s, '#3B8A43');
  circle(p[0] - 3.5 * s, p[1] - 4 * s, 6.5 * s, '#57A651');
}
export let outerTrees = [];
export function buildOuterTrees() {
  outerTrees = [];
  const r = mulberry32(99);
  // la cuadrícula del sorteo es fija (hasta el tamaño máximo), así los árboles de afuera no se
  // mueven al ampliar el terreno: solo desaparecen los que quedan dentro
  for (let y = -4; y <= HMAX + 3; y++) for (let x = -3; x <= WMAX + 2; x++) {
    const roll = r(), size = 0.75 + r() * 0.4;
    const inLot = x >= 0 && x < game.W && y >= 0 && y < game.H;
    if (inLot || x === 0 || y > game.H + 3 || x > game.W + 2) continue;
    if (roll < 0.2) outerTrees.push([x, y, size]);
  }
}
