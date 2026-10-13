import { KINDS, COST, DIRS } from './config.js';
import { fmt, money } from './utils.js';
import { game, T, isRoad, upkeepOf } from './state.js';
import { inUse } from './routes.js';
import { toast } from './ui/toast.js';
import { openSheet, closeSheet } from './ui/sheet.js';

/* ---------- Herramientas ---------- */
export function toolCost(k) {
  if (k === 'road') return COST.road;
  if (k === 'demo') return COST.demo;
  if (KINDS[k]) return KINDS[k].cost;
  return 0;
}
export function check(k, x, y) {
  const t = T(x, y);
  if (!t) return { ok: false, msg: '' };
  if (t.t === 'hwy') return { ok: false, msg: 'Esa es la carretera principal' };
  const roadNear = DIRS.some(([dx, dy]) => isRoad(x + dx, y + dy));
  if (k === 'road') {
    if (t.t === 'tree') return { ok: false, msg: 'Quita el árbol con 🔨 Demoler primero' };
    if (t.t !== 'grass') return { ok: false, msg: 'Ahí no se puede hacer calle' };
    if (!(x === 1 || roadNear)) return { ok: false, msg: 'La calle tiene que salir de la carretera o de otra calle' };
    return { ok: true, cost: COST.road };
  }
  if (KINDS[k]) {
    if (t.t === 'tree') return { ok: false, msg: 'Quita el árbol con 🔨 Demoler primero' };
    if (t.t !== 'grass') return { ok: false, msg: 'Ese lugar ya está ocupado' };
    if (!roadNear) return { ok: false, msg: 'Ponlo pegado a una calle para que lleguen los tráileres' };
    return { ok: true, cost: KINDS[k].cost };
  }
  if (k === 'demo') {
    if (t.t === 'tree') return { ok: true, cost: COST.tree };
    if (t.t === 'water') return { ok: false, msg: 'El estanque no se puede quitar' };
    if (t.t === 'road') {
      if (inUse(x, y)) return { ok: false, msg: 'Hay tráileres usando esa calle, espera a que pasen' };
      return { ok: true, cost: COST.demo };
    }
    if (t.t === 'bld') {
      if (t.slots.some(Boolean)) return { ok: false, msg: 'Espera a que salgan los clientes' };
      return { ok: true, cost: COST.demo, refund: Math.round(KINDS[t.k].cost * 0.5) };
    }
  }
  return { ok: false, msg: '' };
}
export function applyTool(x, y, drag) {
  const S = game.S, tool = game.tool;
  if (S.over) return;
  if (tool === 'none') {
    const t = T(x, y);
    if (t && t.t === 'bld') openSheet(x, y); else closeSheet();
    return;
  }
  const r = check(tool, x, y);
  if (!r.ok) { if (r.msg && !drag) toast(r.msg); return; }
  if (S.money < r.cost) { toast(S.money < 0 ? 'Estás en rojo: no puedes construir hasta recuperarte' : 'Te faltan ' + money(r.cost - S.money)); return; }
  const t = T(x, y);
  S.money -= r.cost;
  if (tool === 'road') {
    t.t = 'road';
  } else if (KINDS[tool]) {
    Object.assign(t, { t: 'bld', k: tool, lvl: 1, earned: 0, slots: [null, null] });
    toast(`Nuevo negocio: ${KINDS[tool].name}. Gasto diario $${fmt(upkeepOf(t))}`);
  } else if (tool === 'demo') {
    for (const k of Object.keys(t)) delete t[k];
    t.t = 'grass';
    if (r.refund) {
      S.money += r.refund;
      game.floats.push({ x: x + 0.5, y: y + 0.5, z: 1.1, text: '+$' + r.refund, t: 0, neg: false });
    }
    if (game.sel && game.sel.x === x && game.sel.y === y) closeSheet();
  }
  game.floats.push({ x: x + 0.5, y: y + 0.5, z: 0.5, text: '−$' + r.cost, t: 0, neg: true });
  game.puffs.push({ x, y, t: 0 });
}
