import { DIRS } from './config.js';
import { game, T, isRoad } from './state.js';

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
export function findService(need) {
  let best = null;
  for (let y = 0; y < game.H; y++) for (let x = 1; x < game.W; x++) {
    const t = T(x, y);
    if (!t || t.t !== 'bld' || t.k !== need || t.off > 0) continue;
    const slot = t.slots.indexOf(null);
    if (slot < 0) continue;
    for (const [dx, dy] of DIRS) {
      const p = pathToHighway(x + dx, y + dy);
      if (!p) continue;
      const score = p.length + p[p.length - 1][1] * 0.1;
      if (!best || score < best.score) best = { score, bx: x, by: y, slot, p, tile: t };
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
