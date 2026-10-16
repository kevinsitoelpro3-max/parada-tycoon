import { KINDS, COST, DIRS, DECOS } from './config.js';
import { fmt, money } from './utils.js';
import { game, T, isRoad, upkeepOf } from './state.js';
import { inUse } from './routes.js';
import { toast } from './ui/toast.js';
import { openSheet, closeSheet } from './ui/sheet.js';
import { sfx } from './audio/sfx.js';
import { collectCash } from './trucks.js';
import { track } from './daily.js';
import { pop, dust } from './fx.js';

/* ---------- Herramientas ---------- */
export function toolCost(k) {
  if (k === 'road') return COST.road;
  if (k === 'demo') return COST.demo;
  if (KINDS[k]) return KINDS[k].cost;
  if (DECOS[k]) return DECOS[k].cost;
  return 0;
}
export function check(k, x, y) {
  const t = T(x, y);
  if (!t) return { ok: false, msg: '' };
  if (t.t === 'hwy') return { ok: false, msg: 'Esa es la carretera principal' };
  if (t.t === 'hwy2') return { ok: false, msg: 'Esa es la carretera de arriba' };
  const roadNear = DIRS.some(([dx, dy]) => isRoad(x + dx, y + dy));
  if (k === 'road') {
    if (t.t === 'tree') return { ok: false, msg: 'Quita el árbol con 🔨 Demoler primero' };
    if (t.t === 'rock') return { ok: false, msg: `Quita las rocas con 🔨 Demoler primero ($${COST.rock})` };
    if (t.t !== 'grass' && t.t !== 'water') return { ok: false, msg: 'Ahí no se puede hacer calle' };
    if (!(x === 1 || roadNear || (game.S.hwy2 && y === 1))) return { ok: false, msg: 'La calle tiene que salir de la carretera o de otra calle' };
    return { ok: true, cost: t.t === 'water' ? COST.bridge : COST.road };
  }
  if (KINDS[k]) {
    if (t.t === 'tree') return { ok: false, msg: 'Quita el árbol con 🔨 Demoler primero' };
    if (t.t === 'rock') return { ok: false, msg: `Quita las rocas con 🔨 Demoler primero ($${COST.rock})` };
    if (t.t !== 'grass') return { ok: false, msg: 'Ese lugar ya está ocupado' };
    if (!roadNear) return { ok: false, msg: 'Ponlo pegado a una calle para que lleguen los tráileres' };
    return { ok: true, cost: KINDS[k].cost };
  }
  if (DECOS[k]) {
    if (t.t === 'tree' || t.t === 'rock') return { ok: false, msg: 'Despeja la casilla con 🔨 Demoler primero' };
    if (t.t !== 'grass') return { ok: false, msg: 'La decoración va en el pasto' };
    return { ok: true, cost: DECOS[k].cost };
  }
  if (k === 'demo') {
    if (t.t === 'deco') return { ok: true, cost: COST.demo, refund: Math.round(DECOS[t.d].cost * 0.5) };
    if (t.t === 'tree') return { ok: true, cost: COST.tree };
    if (t.t === 'rock') return { ok: true, cost: COST.rock };
    if (t.t === 'water') return { ok: false, msg: 'El agua no se quita; con 🛣️ Calle puedes ponerle un puente' };
    if (t.t === 'road') {
      if (inUse(x, y)) return { ok: false, msg: 'Hay tráileres usando esa calle, espera a que pasen' };
      return { ok: true, cost: COST.demo };
    }
    if (t.t === 'bld') {
      if (t.slots.some(Boolean) || (t.queue && t.queue.length)) return { ok: false, msg: 'Espera a que salgan los clientes' };
      return { ok: true, cost: COST.demo, refund: Math.round(KINDS[t.k].cost * 0.5) };
    }
  }
  return { ok: false, msg: '' };
}
export function applyTool(x, y, drag) {
  const S = game.S, tool = game.tool;
  if (S.over) return;
  // Tocar un negocio con propina 💰 la cobra, con cualquier herramienta
  if (!drag && collectCash(x, y)) return;
  if (tool === 'none') {
    const t = T(x, y);
    if (t && t.t === 'bld') openSheet(x, y); else closeSheet();
    return;
  }
  const r = check(tool, x, y);
  if (!r.ok) { if (r.msg && !drag) { toast(r.msg); sfx.nope(); } return; }
  if (S.money < r.cost) { sfx.nope(); toast(S.money < 0 ? 'Estás en rojo: no puedes construir hasta recuperarte' : 'Te faltan ' + money(r.cost - S.money)); return; }
  const t = T(x, y);
  S.money -= r.cost;
  if (tool === 'road') {
    if (t.t === 'water') t.br = true;   // puente
    t.t = 'road';
    sfx.road();
  } else if (KINDS[tool]) {
    Object.assign(t, { t: 'bld', k: tool, lvl: 1, earned: 0, slots: [null, null] });
    sfx.build(); pop(t); dust(x, y, 14);
    toast(`Nuevo negocio: ${KINDS[tool].name}. Gasto diario $${fmt(upkeepOf(t))}`);
  } else if (DECOS[tool]) {
    Object.assign(t, { t: 'deco', d: tool });
    sfx.build(); pop(t); dust(x, y, 8);
    track('deco');
    toast(`${DECOS[tool].emoji} ${DECOS[tool].name}: +${Math.round(DECOS[tool].bonus * 100)} % de cobro a los negocios de alrededor`);
  } else if (tool === 'demo') {
    const wasBridge = !!t.br, sand = !!t.sand;
    for (const k of Object.keys(t)) delete t[k];
    t.t = wasBridge ? 'water' : 'grass';
    if (sand && !wasBridge) t.sand = true;
    sfx.demolish(); dust(x, y, 16, '#B9AE98');
    if (r.refund) {
      S.money += r.refund;
      game.floats.push({ x: x + 0.5, y: y + 0.5, z: 1.1, text: '+$' + r.refund, t: 0, neg: false });
    }
    if (game.sel && game.sel.x === x && game.sel.y === y) closeSheet();
  }
  game.floats.push({ x: x + 0.5, y: y + 0.5, z: 0.5, text: '−$' + r.cost, t: 0, neg: true });
  game.puffs.push({ x, y, t: 0 });
}
