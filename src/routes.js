import { DIRS, QUEUE_MAX } from './config.js';
import { game, T, isRoad, priceOf } from './state.js';

/* ---------- Rutas ---------- */
export function pathToHighway(sx, sy) {
  if (!isRoad(sx, sy)) return null;
  const key = (x, y) => x + ',' + y;
  const prev = new Map([[key(sx, sy), null]]);
  const q = [[sx, sy]];
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    if (x === 1) {
      const out = [];
      let cur = [x, y];
      while (cur) { out.push(cur); cur = prev.get(key(cur[0], cur[1])); }
      return out.reverse(); // [parada, ..., salida a carretera]
    }
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (isRoad(nx, ny) && !prev.has(key(nx, ny))) { prev.set(key(nx, ny), [x, y]); q.push([nx, ny]); }
    }
  }
  return null;
}
// Al aparecer, cada tráiler pide la ruta desde cada calle junto a cada negocio libre; en un mapa
// grande eso son cientos de búsquedas. Las rutas solo cambian cuando cambian las calles, así que
// se guardan hasta entonces. Son compartidas: quien las use solo debe leerlas.
const memo = new Map();
let memoRoads = '';
function roadsKey() {
  let s = game.W + ':';
  for (const t of game.S.tiles) s += t.t === 'road' ? '1' : '0';
  return s;
}
function routeFrom(x, y) {
  if (!isRoad(x, y)) return null;
  const k = y * game.W + x;
  let p = memo.get(k);
  if (p === undefined) { p = pathToHighway(x, y); memo.set(k, p); }
  return p;
}
// minRow: solo negocios cuya salida a la carretera está en esa fila o más abajo
export function findService(need, minRow = 0) {
  const key = roadsKey();
  if (key !== memoRoads) { memo.clear(); memoRoads = key; }
  let best = null;
  for (let y = 0; y < game.H; y++) for (let x = 1; x < game.W; x++) {
    const t = T(x, y);
    if (!t || t.t !== 'bld' || t.k !== need || t.off > 0) continue;
    const slot = t.slots.indexOf(null);
    if (slot < 0) continue;
    for (const [dx, dy] of DIRS) {
      const p = routeFrom(x + dx, y + dy);
      if (!p || p[p.length - 1][1] < minRow) continue;
      const score = p.length + p[p.length - 1][1] * 0.1 + priceOf(t).avoid;
      if (!best || score < best.score) best = { score, bx: x, by: y, slot, p, tile: t };
    }
  }
  return best;
}
// Si todos están llenos: el negocio de ese tipo con lugar en su fila (y conectado) más a la mano
export function findQueue(need) {
  const key = roadsKey();
  if (key !== memoRoads) { memo.clear(); memoRoads = key; }
  let best = null;
  for (let y = 0; y < game.H; y++) for (let x = 1; x < game.W; x++) {
    const t = T(x, y);
    if (!t || t.t !== 'bld' || t.k !== need || t.off > 0 || (t.queue || []).length >= QUEUE_MAX) continue;
    for (const [dx, dy] of DIRS) {
      const p = routeFrom(x + dx, y + dy);
      if (!p) continue;
      const score = p.length + (t.queue || []).length * 3;
      if (!best || score < best.score) best = { score, bx: x, by: y, p, tile: t };
    }
  }
  return best;
}
export function inUse(x, y) {
  const k = x + ',' + y;
  return game.trucks.some(tr => tr.tiles && tr.tiles.has(k));
}
export function parkSpot(tr, b) {
  const [sx, sy] = tr.route[0];
  const v = [tr.bx - sx, tr.by - sy];
  const perp = [Math.abs(v[1]), Math.abs(v[0])];
  const cap = b.slots.length;
  const off = (tr.slot - (cap - 1) / 2) * Math.min(0.3, 0.9 / cap);
  return [sx + 0.5 + v[0] * 0.14 + perp[0] * off, sy + 0.5 + v[1] * 0.14 + perp[1] * off];
}
