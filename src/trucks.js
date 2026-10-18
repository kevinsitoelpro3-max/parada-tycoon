import { CABS, TRAILERS, KINDS, EXTRA_SHARE, PARK_SHARE, QUEUE_WAIT, COMBO_CHANCE, COMBO_NEAR, COMBO_TIP, CASH_CHANCE, CASH_TTL, CARGO_SHARE, STOCK_REACH, STOCK_GIVE, STOCK_MAX } from './config.js';
import { clamp, pick, mulberry32 } from './utils.js';
import { game, T, mode, inRush, isNight, countK, payNow, priceOf, perkVal } from './state.js';
import { findService, findQueue, parkSpot } from './routes.js';
import { sfx } from './audio/sfx.js';
import { contractServed } from './contracts.js';
import { addXp } from './progress.js';
import { track } from './daily.js';
import { coinsFrom, buzz } from './fx.js';

/* ---------- Tráileres ---------- */
// Tipos de negocio extra que ya tienes (tiendita, lavado, taller)
const ownedExtras = () => Object.keys(KINDS).filter(k => KINDS[k].extra && countK(k) > 0);
const BASIC = ['gas', 'food', 'sleep'];
// Sorteo de las propinas 💰 aparte, para no cambiar el azar de los tráileres
const cashRng = mulberry32(20261016);
// Sorteo de los tráileres de carga, también aparte
const cargoRng = mulberry32(1250);
// Con la mejora Buena fama la reputación baja menos
const repLoss = () => mode().repLoss * (1 - perkVal('fama'));

export function spawnInterval() {
  const S = game.S;
  if (game.ev.burst > 0) return 0.5;
  let base = clamp(2.6 - S.served * 0.004 - (S.day - 1) * 0.07, 0.75, 2.6);
  base /= mode().traffic * (0.7 + 0.1 * S.rep) * (game.ev.traffic || 1) * (1 + perkVal('trafico'));
  if (inRush()) base *= 0.5;
  return base * (0.8 + Math.random() * 0.4);
}
// top = true: el tráiler llega por la carretera de arriba (de derecha a izquierda) y luego baja
// por la principal; no hace fila ni segundo pedido.
export function spawn(top = false) {
  const S = game.S, ev = game.ev;
  if (top ? game.trucks.some(tr => tr.y < 1 && tr.x > game.W + 0.8) : game.trucks.some(tr => tr.x < 1.2 && tr.y < -0.9)) return false;
  const tr = {
    x: top ? game.W + 2.5 : 0.5, y: top ? 0.5 : -2.6, ox: 0, oy: 0, dir: top ? [-1, 0] : [0, 1], path: [], speed: 2.6, top,
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
    // Los que todavía no piden nada pueden traer carga para tu zona de descarga
    if (!tr.need && countK('dock') > 0 && cargoRng() < CARGO_SHARE) { tr.need = 'dock'; tr.cargo = true; }
  }
  if (tr.need) {
    const plan = findService(tr.need, 0, top);
    const line = plan || top || tr.cargo ? null : findQueue(tr.need);
    if (line) {
      // Todo lleno: se forma en la calle de enfrente y espera un lugar
      (line.tile.queue || (line.tile.queue = [])).push(tr);
      Object.assign(tr, { state: 'wait', bx: line.bx, by: line.by, slot: -1, route: line.p, patience: QUEUE_WAIT + perkVal('paciencia') });
      const entry = line.p[line.p.length - 1];
      tr.path = [[0.5, entry[1] + 0.5], ...line.p.slice().reverse().map(([x, y]) => [x + 0.5, y + 0.5])];
      tr.tiles = new Set(line.p.map(([x, y]) => x + ',' + y));
    } else if (plan) {
      plan.tile.slots[plan.slot] = tr;
      Object.assign(tr, { state: 'arrive', bx: plan.bx, by: plan.by, slot: plan.slot, route: plan.p });
      const entry = plan.p[plan.p.length - 1];
      const inward = plan.p.slice().reverse().map(([x, y]) => [x + 0.5, y + 0.5]);
      tr.path = [top ? [entry[0] + 0.5, 0.5] : [0.5, entry[1] + 0.5], ...inward, parkSpot(tr, plan.tile)];
      tr.tiles = new Set(plan.p.map(([x, y]) => x + ',' + y));
      // Segundo pedido: solo si tienes otro tipo básico (si no, no hay sorteo y el azar sigue igual)
      if (!top && BASIC.includes(tr.need)) {
        const others = BASIC.filter(k => k !== tr.need && countK(k) > 0);
        if (others.length) {
          const r = Math.random();
          if (r < COMBO_CHANCE) tr.need2 = others[Math.floor(r / COMBO_CHANCE * others.length)];
        }
      }
    } else if (tr.cargo) {
      // Carga sin lugar para descargar: sigue su camino sin enojarse (no es tu cliente)
      tr.need = null; tr.cargo = false;
    } else {
      tr.angry = true;
      sfx.angry();
      S.lost++; S.dayLost++;
      // Duele más si tenías ese negocio pero estaba lleno o sin luz
      const had = countK(tr.need) > 0;
      S.rep = Math.max(1, S.rep - repLoss() * (had ? 1 : 0.25));
    }
  }
  if (tr.state === 'pass') tr.path = top ? [[0.5, 0.5], [0.5, game.H + 2.6]] : [[0.5, game.H + 2.6]];
  if (!top && ev.burst > 0) ev.burst--;
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
    S.total = (S.total || 0) + pay;
    S.rep = Math.min(5, S.rep + priceOf(b).rep);
    b.earned = (b.earned || 0) + pay;
    contractServed(b.k);
    if (b.k === 'dock') { supply(tr.bx, tr.by); track('unload'); }
    else if (b.stock > 0) b.stock--;
    addXp(1);
    track('serve'); track('earn', pay); track('kind', 1, b.k);
    if (isNight()) track('night');
    if (tip) track('combo');
    // A veces el cliente deja una propina 💰 en el negocio: se cobra tocándolo (ver collectCash)
    if (!b.cash && cashRng() < CASH_CHANCE) b.cash = { v: payNow(b, tr.bx, tr.by), ttl: CASH_TTL };
    sfx.cash();
    if (b.slots[tr.slot] === tr) b.slots[tr.slot] = null;
    game.floats.push({ x: tr.bx + 0.5, y: tr.by + 0.5, z: 1.1, text: '+$' + pay + (tip ? ' propina' : ''), t: 0, neg: false });
  }
  const r = tr.route, exit = r[r.length - 1];
  const out = [...r.map(([x, y]) => [x + 0.5, y + 0.5]), ...(tr.top ? [[exit[0] + 0.5, 0.5], [0.5, 0.5]] : [[0.5, exit[1] + 0.5]])];
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
  S.rep = Math.max(1, S.rep - repLoss());
  const r = tr.route, exit = r[r.length - 1];
  tr.path = [...r.map(([x, y]) => [x + 0.5, y + 0.5]), [0.5, exit[1] + 0.5], [0.5, game.H + 2.6]];
}

// Descarga: surte a los negocios de alrededor de la zona (x, y)
export function supply(x, y) {
  for (let dy = -STOCK_REACH; dy <= STOCK_REACH; dy++) for (let dx = -STOCK_REACH; dx <= STOCK_REACH; dx++) {
    const t = T(x + dx, y + dy);
    if (t && t.t === 'bld' && !KINDS[t.k].side) t.stock = Math.min(STOCK_MAX, (t.stock || 0) + STOCK_GIVE);
  }
}
// Toca un negocio con propina 💰: la cobras (vale un cobro más y da experiencia).
// (px, py): dónde tocaste en la pantalla, para que de ahí salgan las monedas
export function collectCash(x, y, px, py) {
  const S = game.S, b = T(x, y);
  if (!b || !b.cash || S.over) return false;
  const v = b.cash.v;
  delete b.cash;
  S.money += v; S.total = (S.total || 0) + v; S.cash = (S.cash || 0) + 1;
  b.earned = (b.earned || 0) + v;
  addXp(3);
  track('cash');
  sfx.cash(); buzz('light');
  if (px !== undefined) coinsFrom(px, py, 6);
  game.floats.push({ x: x + 0.5, y: y + 0.5, z: 1.4, text: '💰 +$' + v, t: 0, neg: false });
  return true;
}
