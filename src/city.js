import { HOME, CITY_KINDS, CITIZEN_PAY, CITY_HOURS, CITY_SHOP_TIME, HAP_START, HAP_UP, HAP_DECO, HAP_DOWN, HAP_GROW, HAP_LEAVE, CAR_COLORS, DIRS, DAY_LEN, OPEN_HOUR, CLOSE_HOUR } from './config.js';
import { mulberry32, clamp, fmt } from './utils.js';
import { game, T, isRoad, payNow, hourNow } from './state.js';
import { moveAlong } from './trucks.js';
import { addXp } from './progress.js';
import { track } from './daily.js';
import { sfx } from './audio/sfx.js';

/* ---------- Ciudad: casas, ciudadanos en coche y felicidad del barrio ---------- */
// El ciclo de la 1.3: el tráiler descarga en la zona 📦, el comercio queda surtido y los
// ciudadanos de las casas 🏠 van en coche a comprarle. Sin surtido no hay venta.
// Todo el azar de la ciudad sale de cityRng: sin casas la partida es idéntica a antes.
const cityRng = mulberry32(1300);

export const capOfHome = t => HOME.cap[clamp(t.lvl, 1, 3) - 1];
export const hap = () => game.S.hap ?? HAP_START;
export function homes() {
  const out = [];
  for (let y = 0; y < game.H; y++) for (let x = 1; x < game.W; x++) {
    const t = T(x, y);
    if (t.t === 'home') out.push({ x, y, t });
  }
  return out;
}
export const population = () => game.S.tiles.reduce((a, t) => a + (t.t === 'home' ? t.res | 0 : 0), 0);
export const hapFace = (h = hap()) => h >= HAP_GROW ? '😊' : h >= HAP_LEAVE ? '😐' : '😟';

const roadNextTo = (x, y) => { for (const [dx, dy] of DIRS) if (isRoad(x + dx, y + dy)) return [x + dx, y + dy]; return null; };
const decoNear = (x, y) => {
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const t = T(x + dx, y + dy); if (t && t.t === 'deco') return true; }
  return false;
};
// El comercio surtido más cercano por las calles: BFS desde la calle de la casa
function findShop(sx, sy) {
  const key = (x, y) => y * game.W + x;
  const prev = new Map([[key(sx, sy), null]]), q = [[sx, sy]];
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    for (const [dx, dy] of DIRS) {
      const t = T(x + dx, y + dy);
      if (t && t.t === 'bld' && CITY_KINDS.includes(t.k) && t.stock > 0 && !(t.off > 0)) {
        const path = [];
        for (let c = [x, y]; c; c = prev.get(key(c[0], c[1]))) path.push(c);
        return { path: path.reverse(), bx: x + dx, by: y + dy };
      }
    }
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      if (isRoad(nx, ny) && !prev.has(key(nx, ny))) { prev.set(key(nx, ny), [x, y]); q.push([nx, ny]); }
    }
  }
  return null;
}
const setHap = v => { game.S.hap = clamp(v, 0, 100); };

// Un ciudadano de la casa h sale a comprar
function depart(h) {
  const S = game.S, r = roadNextTo(h.x, h.y), f = r && findShop(r[0], r[1]);
  if (!f) {
    setHap(hap() - HAP_DOWN);
    game.floats.push({ x: h.x + 0.5, y: h.y + 0.5, z: 1, text: '😟 sin surtido', t: 0, neg: true });
    return;
  }
  const last = f.path[f.path.length - 1];
  const pts = f.path.map(([x, y]) => [x + 0.5, y + 0.5]);
  const stop = [last[0] + 0.5 + (f.bx - last[0]) * 0.22, last[1] + 0.5 + (f.by - last[1]) * 0.22];
  game.cars.push({
    x: pts[0][0], y: pts[0][1], ox: 0, oy: 0, dir: [1, 0], speed: 1.8, state: 'go', t: 0,
    path: [...pts.slice(1), stop], back: [...pts.slice().reverse()], hx: h.x, hy: h.y, bx: f.bx, by: f.by,
    need: T(f.bx, f.by).k, col: CAR_COLORS[Math.floor(cityRng() * CAR_COLORS.length)],
    tiles: new Set(f.path.map(([x, y]) => x + ',' + y))
  });
  S.trips = (S.trips || 0) + 1;
}
// Llega al comercio: compra si todavía hay surtido
function buy(c) {
  const S = game.S, b = T(c.bx, c.by);
  if (!b || b.t !== 'bld' || !(b.stock > 0)) {
    setHap(hap() - HAP_DOWN / 2);
    c.sad = true;
    return;
  }
  const pay = Math.max(1, Math.round(payNow(b, c.bx, c.by) * CITIZEN_PAY));
  b.stock--;
  S.money += pay; S.dayEarn += pay; S.total = (S.total || 0) + pay; b.earned = (b.earned || 0) + pay;
  S.cit = (S.cit || 0) + 1;
  setHap(hap() + HAP_UP + (decoNear(c.hx, c.hy) ? HAP_DECO : 0));
  addXp(1);
  track('cit');
  sfx.cash();
  c.happy = 1.4;
  game.floats.push({ x: c.bx + 0.5, y: c.by + 0.5, z: 1.1, text: '+$' + pay, t: 0, neg: false });
}

// Cada paso de la simulación (dt: tiempo de juego)
export function tickCity(dt) {
  const h = hourNow();
  if (h >= CITY_HOURS[0] && h < CITY_HOURS[1]) {
    const pop = population();
    if (pop > 0) {
      game.cityT = (game.cityT ?? 0) - dt;
      if (game.cityT <= 0) {
        // cada habitante sale una vez entre CITY_HOURS: el intervalo se reparte entre todos
        const span = DAY_LEN * (CITY_HOURS[1] - CITY_HOURS[0]) / (CLOSE_HOUR - OPEN_HOUR);
        game.cityT = span / pop * (0.7 + cityRng() * 0.6);
        // la casa sale al azar, pesada por sus habitantes
        let k = cityRng() * pop;
        for (const hm of homes()) { k -= hm.t.res | 0; if (k < 0) { depart(hm); break; } }
      }
    }
  }
  const slow = game.ev.rain ? 0.7 : 1;
  for (const c of game.cars) {
    c.speed = 1.8 * slow;
    if (c.state === 'shop') {
      c.t += dt;
      if (c.t >= CITY_SHOP_TIME) { buy(c); c.state = 'back'; c.path = c.back; }
    } else if (moveAlong(c, dt)) {
      if (c.state === 'go') { c.state = 'shop'; c.t = 0; }
      else c.dead = true;
    }
    if (c.happy > 0) c.happy -= dt;
    const L = 0.12, tx = c.state === 'shop' ? 0 : -c.dir[1] * L, ty = c.state === 'shop' ? 0 : c.dir[0] * L, kk = Math.min(1, dt * 7);
    c.ox += (tx - c.ox) * kk; c.oy += (ty - c.oy) * kk;
  }
  game.cars = game.cars.filter(c => !c.dead);
}

// Al cierre del día: renta y vecinos que llegan o se van. Devuelve el aviso (o '').
export function cityDay() {
  const S = game.S, list = homes();
  if (!list.length) return '';
  const pop = population(), rent = HOME.rent * pop;
  S.money += rent;
  let came = 0, left = 0;
  for (const { t } of list) {
    if (hap() >= HAP_GROW && t.res < capOfHome(t)) { t.res++; came++; }
    else if (hap() < HAP_LEAVE && t.res > 1) { t.res--; left++; }
  }
  let msg = `🏠 Renta del barrio: +$${fmt(rent)} de ${pop} habitantes.`;
  if (came) msg += ` Llegaron ${came} ${came > 1 ? 'vecinos' : 'vecino'} ${hapFace()}.`;
  if (left) msg += ` Se ${left > 1 ? 'fueron' : 'fue'} ${left} ${left > 1 ? 'vecinos' : 'vecino'} 😟: surte tu comercio.`;
  return msg;
}
