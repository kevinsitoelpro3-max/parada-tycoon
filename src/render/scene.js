import { W, HMAX, DIRS } from '../config.js';
import { ctx, clamp, mulberry32 } from '../utils.js';
import { game, T, isRoad } from '../state.js';
import { check } from '../tools.js';
import { P, poly, tile, line, box, cbox, winY, winX, circle } from './iso.js';

/* ---------- Escena: suelo, calles, árboles, negocios, tráileres y lluvia ---------- */
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
  const H = game.H;
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
    for (let y = 0; y < game.H; y++) for (let x = 1; x < W; x++) if (check(tool, x, y).ok) tile(x, y, fill);
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
function drawGas(x, y, t) {
  const glass = t.off > 0 ? '#5E6670' : '#86C0DC';
  cbox(x + 0.07, y + 0.07, x + 0.4, y + 0.4, 0, 0.5, '#E9E9E9', '#2F6B4F');
  winY(x + 0.12, x + 0.34, y + 0.4, 0.12, 0.36, glass);
  winX(x + 0.4, y + 0.12, y + 0.34, 0.12, 0.36, glass);
  cbox(x + 0.55, y + 0.55, x + 0.63, y + 0.63, 0, 0.3, '#D62828');
  cbox(x + 0.74, y + 0.5, x + 0.82, y + 0.58, 0, 0.3, '#D62828');
  cbox(x + 0.88, y + 0.38, x + 0.93, y + 0.43, 0, 0.62, '#BDBDBD');
  cbox(x + 0.38, y + 0.88, x + 0.43, y + 0.93, 0, 0.62, '#BDBDBD');
  cbox(x + 0.88, y + 0.88, x + 0.93, y + 0.93, 0, 0.62, '#BDBDBD');
  box(x + 0.34, y + 0.34, x + 0.96, y + 0.96, 0.62, 0.72, '#F7F7F7', '#D62828', '#AE1F1F');
  return 0.72;
}
function drawFood(x, y, t) {
  const glass = t.off > 0 ? '#5E6670' : '#A6D6EA';
  cbox(x + 0.12, y + 0.12, x + 0.86, y + 0.86, 0, 0.52, '#F0B03F', '#B8452E');
  winY(x + 0.2, x + 0.4, y + 0.86, 0, 0.34, '#5A3B24');
  winY(x + 0.5, x + 0.78, y + 0.86, 0.16, 0.36, glass);
  winX(x + 0.86, y + 0.2, y + 0.78, 0.16, 0.36, glass);
  box(x + 0.14, y + 0.86, x + 0.84, y + 0.96, 0.38, 0.44, '#FFFFFF', '#E63946', '#C22F3A');
  box(x + 0.86, y + 0.14, x + 0.96, y + 0.84, 0.38, 0.44, '#FFFFFF', '#E63946', '#C22F3A');
  return 0.52;
}
function drawSleep(x, y, t) {
  const h = 0.95 + 0.3 * (t.lvl - 1);
  cbox(x + 0.12, y + 0.12, x + 0.88, y + 0.88, 0, h, '#4F86C6', '#2B4A75');
  const lit = t.off > 0 ? '#3F4A57' : game.dark ? '#FFE08A' : '#DCEBF7';
  for (let z = 0.24; z + 0.13 < h - 0.06; z += 0.26) {
    for (const c of [0.2, 0.44, 0.66]) {
      winY(x + c, x + c + 0.12, y + 0.88, z, z + 0.13, lit);
      winX(x + 0.88, y + c, y + c + 0.12, z, z + 0.13, lit);
    }
  }
  winY(x + 0.44, x + 0.56, y + 0.88, 0, 0.18, '#22344F');
  return h;
}
export function drawBld(x, y, t) {
  if (t.k === 'gas') t.top = drawGas(x, y, t);
  else if (t.k === 'food') t.top = drawFood(x, y, t);
  else t.top = drawSleep(x, y, t);
}
export function drawTruck(tr) {
  const d = tr.dir, cx = tr.x + tr.ox, cy = tr.y + tr.oy, hw = 0.13;
  const seg = (a, b) => {
    if (d[0] !== 0) { const p = cx + d[0] * a, q = cx + d[0] * b; return [Math.min(p, q), cy - hw, Math.max(p, q), cy + hw]; }
    const p = cy + d[1] * a, q = cy + d[1] * b; return [cx - hw, Math.min(p, q), cx + hw, Math.max(p, q)];
  };
  const s = seg(-0.4, 0.34);
  poly([P(s[0] + 0.03, s[1] + 0.03), P(s[2] + 0.06, s[1] + 0.03), P(s[2] + 0.06, s[3] + 0.06), P(s[0] + 0.03, s[3] + 0.06)], 'rgba(0,0,0,.22)');
  const tb = seg(-0.38, 0.06), cb = seg(0.1, 0.34);
  const trailer = () => cbox(tb[0], tb[1], tb[2], tb[3], 0.08, 0.52, tr.trailer);
  const cab = () => {
    cbox(cb[0], cb[1], cb[2], cb[3], 0.08, 0.44, tr.cab);
    if (d[0] === 1) winX(cb[2], cb[1] + 0.03, cb[3] - 0.03, 0.27, 0.4, '#1F2B36');
    else if (d[1] === 1) winY(cb[0] + 0.03, cb[2] - 0.03, cb[3], 0.27, 0.4, '#1F2B36');
  };
  if (d[0] + d[1] > 0) { trailer(); cab(); } else { cab(); trailer(); }
}
export function drawRain(w, h) {
  ctx.fillStyle = 'rgba(40,60,90,.14)';
  ctx.fillRect(0, 0, w, h);
  ctx.beginPath();
  for (let i = 0; i < 110; i++) {
    const x = ((i * 137.5 + game.rainT * 90) % (w + 40)) - 20;
    const y = ((i * 61.3 + game.rainT * 560) % (h + 40)) - 20;
    ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 13);
  }
  ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(215,230,255,.55)'; ctx.stroke();
}
export let outerTrees = [];
export function buildOuterTrees() {
  outerTrees = [];
  const r = mulberry32(99);
  for (let y = -4; y <= HMAX + 3; y++) for (let x = -3; x <= W + 2; x++) {
    const roll = r(), size = 0.75 + r() * 0.4;
    const inLot = x >= 0 && x < W && y >= 0 && y < game.H;
    if (inLot || x === 0 || y > game.H + 3) continue;
    if (roll < 0.2) outerTrees.push([x, y, size]);
  }
}
export function truckAlpha(tr) {
  const d = Math.max(0, -tr.y, tr.y - game.H);
  return clamp(1 - d * 0.42, 0, 1);
}
