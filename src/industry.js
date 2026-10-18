import { INDUSTRY, VAN_LOAD, WHOLESALE, VAN_SPEED, VAN_UNLOAD } from './config.js';
import { fmt } from './utils.js';
import { game, T } from './state.js';
import { moveAlong, supply } from './trucks.js';
import { findNear, roadNextTo } from './city.js';
import { addXp } from './progress.js';
import { track } from './daily.js';
import { sfx } from './audio/sfx.js';

/* ---------- Industria: granjas, fábricas y camionetas de reparto ---------- */
// 🌾 La granja produce 🌽; la camioneta la lleva a la 🏭 fábrica, que convierte INDUSTRY.factory.need 🌽
// en 1 📦; otra camioneta lleva las cajas a la 📦 zona de descarga, donde cada caja surte a los comercios
// de alrededor (como un tráiler de carga) y paga WHOLESALE. Cada granja o fábrica tiene una camioneta
// por nivel. No hay azar: sin granjas ni fábricas la partida es idéntica.
const PROD = { farm: 1, factory: 1 };
// Producción más rápida y bodega más grande con el nivel
export const every = t => INDUSTRY[t.k].every / (1 + 0.5 * (t.lvl - 1));
export const capOut = t => INDUSTRY[t.k].cap * t.lvl;
export const capIn = t => (INDUSTRY[t.k].rawCap || 0) * t.lvl;
export const vansOf = (x, y) => game.vans.filter(v => v.hx === x && v.hy === y).length;
const VAN_COL = { raw: '#E9C46A', box: '#F1F1EE' };

function producers() {
  const out = [];
  for (let y = 0; y < game.H; y++) for (let x = 1; x < game.W; x++) {
    const t = T(x, y);
    if (t.t === 'bld' && PROD[t.k]) out.push({ x, y, t });
  }
  return out;
}

// Sale una camioneta de (x, y) con `load` de `kind` ('raw' 🌽 o 'box' 📦) hacia el edificio que cumpla ok
function send(x, y, kind, load, ok) {
  const r = roadNextTo(x, y), f = r && findNear(r[0], r[1], ok);
  if (!f) return false;
  const last = f.path[f.path.length - 1];
  const pts = f.path.map(([px, py]) => [px + 0.5, py + 0.5]);
  const stop = [last[0] + 0.5 + (f.bx - last[0]) * 0.22, last[1] + 0.5 + (f.by - last[1]) * 0.22];
  game.vans.push({
    x: pts[0][0], y: pts[0][1], ox: 0, oy: 0, dir: [1, 0], speed: VAN_SPEED, state: 'go', t: 0, van: true,
    kind, load, hx: x, hy: y, bx: f.bx, by: f.by, col: VAN_COL[kind],
    path: [...pts.slice(1), stop], back: pts.slice().reverse(),
    tiles: new Set(f.path.map(([px, py]) => px + ',' + py))
  });
  return true;
}

// Llega la camioneta: entrega lo que trae (si el edificio sigue ahí)
function deliver(v) {
  const S = game.S, b = T(v.bx, v.by);
  if (!b || b.t !== 'bld') return;
  if (v.kind === 'raw' && b.k === 'factory') b.raw = Math.min(capIn(b), (b.raw | 0) + v.load);
  else if (v.kind === 'box' && b.k === 'dock') {
    for (let i = 0; i < v.load; i++) supply(v.bx, v.by);
    const pay = WHOLESALE * v.load;
    S.money += pay; S.dayEarn += pay; S.total = (S.total || 0) + pay; b.earned = (b.earned || 0) + pay;
    S.boxes = (S.boxes || 0) + v.load;
    addXp(v.load);
    track('box', v.load);
    sfx.cash();
    if (game.floats.length < 40) game.floats.push({ x: v.bx + 0.5, y: v.by + 0.5, z: 1.2, text: `📦×${v.load} +$${fmt(pay)}`, t: 0, neg: false });
  }
}

// Cada paso de la simulación (dt: tiempo de juego)
export function tickIndustry(dt) {
  const list = producers();
  if (!list.length && !game.vans.length) return;
  for (const { t } of list) {
    if (t.off > 0) continue;
    const e = every(t);
    if (t.k === 'farm') {
      if ((t.raw | 0) >= capOut(t)) { t.prog = 0; continue; }
      t.prog = (t.prog || 0) + dt;
      if (t.prog >= e) { t.prog -= e; t.raw = (t.raw | 0) + 1; }
    } else {
      const need = INDUSTRY.factory.need;
      if ((t.raw | 0) < need || (t.goods | 0) >= capOut(t)) { t.prog = 0; continue; }
      t.prog = (t.prog || 0) + dt;
      if (t.prog >= e) { t.prog -= e; t.raw -= need; t.goods = (t.goods | 0) + 1; }
    }
  }
  // Reparto: cada medio segundo, las camionetas libres salen con lo que haya listo
  game.indT = (game.indT || 0) - dt;
  if (game.indT <= 0) {
    game.indT = 0.5;
    for (const { x, y, t } of list) {
      if (t.off > 0 || vansOf(x, y) >= t.lvl) continue;
      if (t.k === 'farm' && (t.raw | 0) >= 2) {
        const load = Math.min(t.raw, VAN_LOAD);
        if (send(x, y, 'raw', load, f => f.t === 'bld' && f.k === 'factory' && (f.raw | 0) + load <= capIn(f))) t.raw -= load;
      } else if (t.k === 'factory' && (t.goods | 0) >= 2) {
        const load = Math.min(t.goods, VAN_LOAD);
        if (send(x, y, 'box', load, f => f.t === 'bld' && f.k === 'dock' && !(f.off > 0))) t.goods -= load;
      }
    }
  }
  const slow = game.ev.rain ? 0.7 : 1;
  for (const v of game.vans) {
    v.speed = VAN_SPEED * slow;
    if (v.state === 'drop') {
      v.t += dt;
      if (v.t >= VAN_UNLOAD) { deliver(v); v.state = 'back'; v.path = v.back; v.load = 0; }
    } else if (moveAlong(v, dt)) {
      if (v.state === 'go') { v.state = 'drop'; v.t = 0; }
      else v.dead = true;
    }
    const L = 0.12, tx = v.state === 'drop' ? 0 : -v.dir[1] * L, ty = v.state === 'drop' ? 0 : v.dir[0] * L, k = Math.min(1, dt * 7);
    v.ox += (tx - v.ox) * k; v.oy += (ty - v.oy) * k;
  }
  if (game.vans.some(v => v.dead)) game.vans = game.vans.filter(v => !v.dead);
}
