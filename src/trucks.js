import { CABS, TRAILERS, KINDS, EXTRA_SHARE, PARK_SHARE, QUEUE_WAIT, COMBO_CHANCE, COMBO_NEAR, COMBO_TIP } from './config.js';
import { clamp, pick } from './utils.js';
import { game, T, mode, inRush, isNight, countK, payNow, priceOf } from './state.js';
import { findService, findQueue, parkSpot } from './routes.js';
import { sfx } from './audio/sfx.js';
import { contractServed } from './contracts.js';

/* ---------- Tráileres ---------- */
// Tipos de negocio extra que ya tienes (tiendita, lavado, taller)
const ownedExtras = () => Object.keys(KINDS).filter(k => KINDS[k].extra && countK(k) > 0);
const BASIC = ['gas', 'food', 'sleep'];

export function spawnInterval() {
  const S = game.S;
  if (game.ev.burst > 0) return 0.5;
  let base = clamp(2.6 - S.served * 0.004 - (S.day - 1) * 0.07, 0.75, 2.6);
  base /= mode().traffic * (0.7 + 0.1 * S.rep);
  if (inRush()) base *= 0.5;
  return base * (0.8 + Math.random() * 0.4);
}
export function spawn() {
  const S = game.S, ev = game.ev;
  if (game.trucks.some(tr => tr.x < 1.2 && tr.y < -0.9)) return false;
  const tr = {
    x: 0.5, y: -2.6, ox: 0, oy: 0, dir: [0, 1], path: [], speed: 2.6,
    need: null, state: 'pass', t: 0, happy: 0, angry: false, tiles: null,
    cab: pick(CABS), trailer: pick(TRAILERS)
  };
  if (Math.random() < 0.82) {
    const q = Math.random();
    // De noche (desde NIGHT_FROM) 10 de cada 100 que pedían comida buscan dónde dormir
    const nf = isNight() ? 0.1 : 0;
    const w = ev.diesel ? [0.65, 0.85 - nf] : [0.45, 0.75 - nf];
    tr.need = q < w[0] ? 'gas' : q < w[1] ? 'food' : 'sleep';
  } else {
    // Los negocios extra atienden a tráileres que antes pasaban de largo, así que nunca le
    // quitan un cliente a gasolina, comida o descanso. Cada tipo extra que ya tengas se queda
    // con EXTRA_SHARE de esos tráileres. Sin negocios extra no hay sorteo y todo sigue igual.
    const extras = ownedExtras();
    // De noche, con pensión, la mitad de estos busca dónde quedarse (sin pensión no hay sorteo)
    if (isNight() && countK('park') > 0 && Math.random() < PARK_SHARE) tr.need = 'park';
    else if (extras.length) {
      const r = Math.random();
      if (r < EXTRA_SHARE * extras.length) tr.need = extras[Math.min(extras.length - 1, Math.floor(r / EXTRA_SHARE))];
    }
  }
  if (tr.need) {
    const plan = findService(tr.need);
    const line = plan ? null : findQueue(tr.need);
    if (line) {
      // Todo lleno: se forma en la calle de enfrente y espera un lugar
      (line.tile.queue || (line.tile.queue = [])).push(tr);
      Object.assign(tr, { state: 'wait', bx: line.bx, by: line.by, slot: -1, route: line.p, patience: QUEUE_WAIT });
      const entry = line.p[line.p.length - 1];
      tr.path = [[0.5, entry[1] + 0.5], ...line.p.slice().reverse().map(([x, y]) => [x + 0.5, y + 0.5])];
      tr.tiles = new Set(line.p.map(([x, y]) => x + ',' + y));
    } else if (plan) {
      plan.tile.slots[plan.slot] = tr;
      Object.assign(tr, { state: 'arrive', bx: plan.bx, by: plan.by, slot: plan.slot, route: plan.p });
      const entry = plan.p[plan.p.length - 1];
      const inward = plan.p.slice().reverse().map(([x, y]) => [x + 0.5, y + 0.5]);
      tr.path = [[0.5, entry[1] + 0.5], ...inward, parkSpot(tr, plan.tile)];
      tr.tiles = new Set(plan.p.map(([x, y]) => x + ',' + y));
      // Segundo pedido: solo si tienes otro tipo básico (si no, no hay sorteo y el azar sigue igual)
      if (BASIC.includes(tr.need)) {
        const others = BASIC.filter(k => k !== tr.need && countK(k) > 0);
        if (others.length) {
          const r = Math.random();
          if (r < COMBO_CHANCE) tr.need2 = others[Math.floor(r / COMBO_CHANCE * others.length)];
        }
      }
    } else {
      tr.angry = true;
      sfx.angry();
      S.lost++; S.dayLost++;
      // Duele más si tenías ese negocio pero estaba lleno o sin luz
      const had = countK(tr.need) > 0;
      S.rep = Math.max(1, S.rep - mode().repLoss * (had ? 1 : 0.25));
    }
  }
  if (tr.state === 'pass') tr.path = [[0.5, game.H + 2.6]];
  if (ev.burst > 0) ev.burst--;
  game.trucks.push(tr);
  return true;
}
export function moveAlong(tr, dt) {
  let dist = tr.speed * dt;
  while (dist > 0 && tr.path.length) {
    const [tx, ty] = tr.path[0];
    const dx = tx - tr.x, dy = ty - tr.y, d = Math.hypot(dx, dy);
    if (d < 1e-4) { tr.path.shift(); continue; }
    tr.dir = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)];
    if (d <= dist) { tr.x = tx; tr.y = ty; dist -= d; tr.path.shift(); }
    else { tr.x += dx / d * dist; tr.y += dy / d * dist; dist = 0; }
  }
  return tr.path.length === 0;
}
export function finishService(tr) {
  const S = game.S;
  const b = T(tr.bx, tr.by);
  if (b && b.t === 'bld') {
    let pay = payNow(b, tr.bx, tr.by);
    const tip = tr.tip ? Math.round(pay * COMBO_TIP) : 0;
    pay += tip;
    S.money += pay; S.served++; S.dayServed++; S.dayEarn += pay;
    S.rep = Math.min(5, S.rep + priceOf(b).rep);
    b.earned = (b.earned || 0) + pay;
    contractServed(b.k);
    sfx.cash();
    if (b.slots[tr.slot] === tr) b.slots[tr.slot] = null;
    game.floats.push({ x: tr.bx + 0.5, y: tr.by + 0.5, z: 1.1, text: '+$' + pay + (tip ? ' propina' : ''), t: 0, neg: false });
  }
  const r = tr.route, exit = r[r.length - 1];
  const out = [...r.map(([x, y]) => [x + 0.5, y + 0.5]), [0.5, exit[1] + 0.5]];
  // Segundo pedido: busca otro negocio más abajo en la carretera; si no hay lugar, se va contento
  if (tr.need2) {
    const need = tr.need2, plan = findService(need, exit[1]);
    tr.need2 = null; tr.tip = false;
    if (plan) {
      const ax = tr.bx, ay = tr.by;
      plan.tile.slots[plan.slot] = tr;
      Object.assign(tr, { state: 'arrive', need, t: 0, bx: plan.bx, by: plan.by, slot: plan.slot, route: plan.p });
      tr.tip = Math.abs(plan.bx - ax) + Math.abs(plan.by - ay) <= COMBO_NEAR;
      const entry = plan.p[plan.p.length - 1];
      const inward = plan.p.slice().reverse().map(([x, y]) => [x + 0.5, y + 0.5]);
      tr.path = [...out, [0.5, entry[1] + 0.5], ...inward, parkSpot(tr, plan.tile)];
      tr.tiles = new Set([...r, ...plan.p].map(([x, y]) => x + ',' + y));
      return;
    }
  }
  tr.tip = false;
  tr.state = 'leave'; tr.need = null; tr.happy = 1.6;
  tr.path = [...out, [0.5, game.H + 2.6]];
}

// Tráiler formado en la fila: entra cuando se libera un lugar (en orden) o se va enojado
export function waitInLine(tr, dt) {
  const S = game.S, b = T(tr.bx, tr.by);
  const q = b && b.t === 'bld' ? (b.queue || []) : [];
  if (b && b.t === 'bld' && !(b.off > 0) && q[0] === tr) {
    const slot = b.slots.indexOf(null);
    if (slot >= 0) {
      q.shift();
      b.slots[slot] = tr;
      Object.assign(tr, { state: 'arrive', slot });
      tr.path = [parkSpot(tr, b)];
      return;
    }
  }
  tr.patience -= dt;
  if (tr.patience > 0 && b && b.t === 'bld') return;
  const i = q.indexOf(tr);
  if (i >= 0) q.splice(i, 1);
  tr.angry = true; tr.need = null; tr.state = 'leave';
  sfx.angry();
  S.lost++; S.dayLost++;
  S.rep = Math.max(1, S.rep - mode().repLoss);
  const r = tr.route, exit = r[r.length - 1];
  tr.path = [...r.map(([x, y]) => [x + 0.5, y + 0.5]), [0.5, exit[1] + 0.5], [0.5, game.H + 2.6]];
}
