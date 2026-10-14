import { W, H0, HMAX, KEY, DAY_LEN, DAY_SCALE, RUSH, KINDS, MODES, OPEN_HOUR, CLOSE_HOUR } from './config.js';
import { clamp, mulberry32 } from './utils.js';
import { GOALS } from './goals.js';

/* ---------- Estado ---------- */
// Todo lo que cambia durante la partida vive en este objeto compartido,
// para que cualquier módulo pueda leerlo y reemplazarlo (game.S = ..., game.trucks = ...).
export const game = {
  S: null,              // partida: dinero, casillas, día, reputación...
  H: H0,                // filas de terreno (crece al ampliar)
  trucks: [], floats: [], puffs: [],
  tool: 'none', speed: 1, sel: null,
  spawnT: 1.2, goalT: 0, saveT: 0, userCam: false, dpr: 1, rainT: 0, billCache: 0,
  sky: '#D2E4D8', dark: false,
  ev: emptyEvent(),
  upgradedFromV1: false,
  paused: false         // true mientras está abierta la pantalla de inicio
};

export const T = (x, y) => (x >= 0 && x < W && y >= 0 && y < game.H) ? game.S.tiles[y * W + x] : null;
export const isRoad = (x, y) => { const t = T(x, y); return !!t && t.t === 'road'; };
export const mode = () => MODES[game.S.mode] || MODES.normal;
export const capOf = t => t.lvl + 1;
export const payOf = (t, lvl = t.lvl) => Math.round(KINDS[t.k].pay * (1 + 0.5 * (lvl - 1)));
export const repMult = () => 1 + 0.08 * (game.S.rep - 3);
export const payNow = t => Math.round(payOf(t) * repMult());
export const inflation = () => 1 + 0.06 * (game.S.day - 1);
export const upkeepOf = (t, lvl = t.lvl) => Math.round(KINDS[t.k].upkeep * lvl * mode().upkeep * inflation() * DAY_SCALE);
export const upCost = t => KINDS[t.k].cost * t.lvl;
export const landCost = () => 3000 * ((game.H - H0) / 2 + 1);
export const countK = k => game.S.tiles.filter(t => t.t === 'bld' && t.k === k).length;
export const inRush = () => { const f = game.S.dayT / DAY_LEN; return f >= RUSH[0] && f < RUSH[1]; };
// Hora del reloj de la parada para una fracción del día (0 = apertura, 1 = cierre), en pasos de 10 minutos
export function clockAt(f) {
  const m = Math.floor((OPEN_HOUR + f * (CLOSE_HOUR - OPEN_HOUR)) * 6) * 10;
  return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}
export const clockNow = () => clockAt(Math.min(1, game.S.dayT / DAY_LEN));

export function emptyEvent() { return { type: null, label: '', rain: false, diesel: false, luzAt: -1, caravanAt: -1, burst: 0, rushOn: false }; }
export function totalUpkeep() {
  let c = 0;
  for (const t of game.S.tiles) {
    if (t.t === 'bld') c += KINDS[t.k].upkeep * t.lvl;
    else if (t.t === 'road') c += 1;
  }
  return Math.round(c * mode().upkeep * inflation() * DAY_SCALE);
}

export function newGame(modeKey) {
  const md = MODES[modeKey] ? modeKey : 'normal';
  game.H = H0;
  const H = game.H;
  const r = mulberry32(7);
  const tiles = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) tiles.push({ t: x === 0 ? 'hwy' : 'grass' });
  [[6, 7], [7, 7], [6, 8], [7, 8]].forEach(([x, y]) => { tiles[y * W + x].t = 'water'; });
  let n = 0;
  for (let i = 0; i < 80 && n < 11; i++) {
    const x = 3 + Math.floor(r() * (W - 3)), y = Math.floor(r() * H);
    const t = tiles[y * W + x];
    if (t.t === 'grass') { t.t = 'tree'; n++; }
  }
  game.S = {
    mode: md, money: MODES[md].money, served: 0, lost: 0, goal: 0, tiles,
    day: 1, dayT: 0, rep: 3, red: 0, perfectDays: 0, bestDay: 0,
    dayEarn: 0, dayServed: 0, dayLost: 0, h: H, over: false
  };
  prep();
}
export function prep() {
  game.S.tiles.forEach((t, i) => {
    if (i % W === 0) { for (const k of Object.keys(t)) delete t[k]; t.t = 'hwy'; return; }
    if (t.t === 'bld') { t.slots = Array(capOf(t)).fill(null); t.earned = t.earned || 0; delete t.off; }
  });
}
export function save() {
  const S = game.S;
  try {
    const data = {
      v: 2, mode: S.mode, money: S.money, served: S.served, lost: S.lost, goal: S.goal,
      day: S.day, dayT: S.dayT, rep: S.rep, red: S.red, perfectDays: S.perfectDays, bestDay: S.bestDay,
      dayEarn: S.dayEarn, dayServed: S.dayServed, dayLost: S.dayLost, h: game.H, over: S.over,
      tiles: S.tiles.map(t => t.t === 'bld' ? { t: 'bld', k: t.k, l: t.lvl, e: t.earned || 0 } : { t: t.t })
    };
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) { /* sin almacenamiento: el juego sigue */ }
}
export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d || (d.v !== 1 && d.v !== 2) || !Array.isArray(d.tiles)) return false;
    const h = clamp((d.h | 0) || H0, H0, HMAX);
    if (d.tiles.length !== W * h) return false;
    game.H = h;
    const valid = ['grass', 'road', 'tree', 'water', 'hwy'];
    game.S = {
      mode: MODES[d.mode] ? d.mode : 'normal',
      money: Number.isFinite(+d.money) ? +d.money : 0,
      served: +d.served || 0, lost: +d.lost || 0,
      goal: clamp(+d.goal || 0, 0, GOALS.length),
      day: Math.max(1, +d.day || 1), dayT: clamp(+d.dayT || 0, 0, DAY_LEN - 1),
      rep: clamp(Number.isFinite(+d.rep) && d.rep !== undefined ? +d.rep : 3, 1, 5),
      red: +d.red || 0, perfectDays: +d.perfectDays || 0, bestDay: +d.bestDay || 0,
      dayEarn: +d.dayEarn || 0, dayServed: +d.dayServed || 0, dayLost: +d.dayLost || 0,
      h, over: !!d.over,
      tiles: d.tiles.map(o => (o && o.t === 'bld' && KINDS[o.k])
        ? { t: 'bld', k: o.k, lvl: clamp(o.l | 0, 1, 3), earned: o.e | 0 }
        : { t: (o && valid.includes(o.t)) ? o.t : 'grass' })
    };
    game.upgradedFromV1 = d.v === 1;
    prep();
    return true;
  } catch (e) { return false; }
}
