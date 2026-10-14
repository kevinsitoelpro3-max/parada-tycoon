import { W0, H0, WMAX, HMAX, LAND_BASE, KEY, DAY_LEN, DAY_SCALE, RUSH, KINDS, MODES, OPEN_HOUR, CLOSE_HOUR, DUSK, DAWN, NIGHT_FROM } from './config.js';
import { clamp, mulberry32 } from './utils.js';
import { GOALS } from './goals.js';

/* ---------- Estado ---------- */
// Todo lo que cambia durante la partida vive en este objeto compartido,
// para que cualquier módulo pueda leerlo y reemplazarlo (game.S = ..., game.trucks = ...).
export const game = {
  S: null,              // partida: dinero, casillas, día, reputación...
  W: W0, H: H0,         // columnas y filas de terreno (crecen al ampliar)
  trucks: [], floats: [], puffs: [],
  tool: 'none', speed: 1, sel: null,
  spawnT: 1.2, goalT: 0, saveT: 0, userCam: false, dpr: 1, rainT: 0, billCache: 0,
  sky: '#D2E4D8', themeDark: false, night: 0, dark: false,   // tema oscuro; oscuridad de 0 a 1; luces encendidas
  ev: emptyEvent(),
  upgradedFromV1: false, grewFromOld: false,
  paused: false         // true mientras está abierta la pantalla de inicio
};

export const T = (x, y) => (x >= 0 && x < game.W && y >= 0 && y < game.H) ? game.S.tiles[y * game.W + x] : null;
export const isRoad = (x, y) => { const t = T(x, y); return !!t && t.t === 'road'; };
export const mode = () => MODES[game.S.mode] || MODES.normal;
export const capOf = t => t.lvl + 1;
export const payOf = (t, lvl = t.lvl) => Math.round(KINDS[t.k].pay * (1 + 0.5 * (lvl - 1)));
export const repMult = () => 1 + 0.08 * (game.S.rep - 3);
export const payNow = t => Math.round(payOf(t) * repMult());
export const inflation = () => 1 + 0.06 * (game.S.day - 1);
export const upkeepOf = (t, lvl = t.lvl) => Math.round(KINDS[t.k].upkeep * lvl * mode().upkeep * inflation() * DAY_SCALE);
export const upCost = t => KINDS[t.k].cost * t.lvl;
// La compra número n cuesta LAND_BASE × n, contando las compras por el tamaño del terreno
// (no por S.land: las partidas de antes ya traen gratis lo que compraron hasta 10 × 12).
export const landCost = () => LAND_BASE * ((game.W - W0) / 2 + (game.H - H0) / 2 + 1);
export const countK = k => game.S.tiles.filter(t => t.t === 'bld' && t.k === k).length;
export const inRush = () => { const f = game.S.dayT / DAY_LEN; return f >= RUSH[0] && f < RUSH[1]; };
// Hora del reloj de la parada para una fracción del día (0 = apertura, 1 = cierre), en pasos de 10 minutos
export function clockAt(f) {
  const m = Math.floor((OPEN_HOUR + f * (CLOSE_HOUR - OPEN_HOUR)) * 6) * 10;
  return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}
export const clockNow = () => clockAt(Math.min(1, game.S.dayT / DAY_LEN));
export const hourNow = () => OPEN_HOUR + Math.min(1, game.S.dayT / DAY_LEN) * (CLOSE_HOUR - OPEN_HOUR);
// Qué tan oscuro está a la hora h: 0 de día, 1 de noche cerrada; al abrir (06:00) todavía está a 0.6
export function darkness(h) {
  if (h < DAWN) return 0.6 * (DAWN - h) / (DAWN - OPEN_HOUR);
  if (h <= DUSK[0]) return 0;
  return Math.min(1, (h - DUSK[0]) / (DUSK[1] - DUSK[0]));
}
export const isNight = () => hourNow() >= NIGHT_FROM;

export function emptyEvent() { return { type: null, label: '', rain: false, diesel: false, luzAt: -1, caravanAt: -1, burst: 0, rushOn: false, nightOn: false }; }
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
  game.W = W0; game.H = H0;
  const W = game.W, H = game.H;
  const r = mulberry32(7);
  const tiles = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) tiles.push({ t: x === 0 ? 'hwy' : 'grass' });
  // estanque de 2×2 abajo a la derecha
  [[W - 3, H - 4], [W - 2, H - 4], [W - 3, H - 3], [W - 2, H - 3]].forEach(([x, y]) => { tiles[y * W + x].t = 'water'; });
  let n = 0;
  for (let i = 0; i < 120 && n < 16; i++) {
    const x = 3 + Math.floor(r() * (W - 3)), y = Math.floor(r() * H);
    const t = tiles[y * W + x];
    if (t.t === 'grass') { t.t = 'tree'; n++; }
  }
  game.S = {
    mode: md, money: MODES[md].money, served: 0, lost: 0, goal: 0, tiles,
    day: 1, dayT: 0, rep: 3, red: 0, perfectDays: 0, bestDay: 0,
    dayEarn: 0, dayServed: 0, dayLost: 0, w: W, h: H, land: 0, over: false
  };
  prep();
}
export function prep() {
  game.S.tiles.forEach((t, i) => {
    if (i % game.W === 0) { for (const k of Object.keys(t)) delete t[k]; t.t = 'hwy'; return; }
    if (t.t === 'bld') { t.slots = Array(capOf(t)).fill(null); t.earned = t.earned || 0; delete t.off; }
  });
}
export function save() {
  const S = game.S;
  try {
    const data = {
      v: 3, mode: S.mode, money: S.money, served: S.served, lost: S.lost, goal: S.goal,
      day: S.day, dayT: S.dayT, rep: S.rep, red: S.red, perfectDays: S.perfectDays, bestDay: S.bestDay,
      dayEarn: S.dayEarn, dayServed: S.dayServed, dayLost: S.dayLost, w: game.W, h: game.H, land: S.land || 0, over: S.over,
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
    if (!d || (d.v !== 1 && d.v !== 2 && d.v !== 3) || !Array.isArray(d.tiles)) return false;
    // v1 y v2 tenían 8 columnas fijas y 10 a 16 filas (cada 2 filas extra eran una compra)
    const w = d.v === 3 ? d.w | 0 : 8;
    const h = (d.h | 0) || 10;
    if (w < 2 || w > WMAX || h < 2 || h > HMAX || d.tiles.length !== w * h) return false;
    const land = d.v === 3 ? Math.max(0, d.land | 0) : Math.max(0, (h - 10) / 2 | 0);
    const valid = ['grass', 'road', 'tree', 'water', 'hwy'];
    const old = d.tiles.map(o => (o && o.t === 'bld' && KINDS[o.k])
      ? { t: 'bld', k: o.k, lvl: clamp(o.l | 0, 1, 3), earned: o.e | 0 }
      : { t: (o && valid.includes(o.t)) ? o.t : 'grass' });
    // Las partidas de antes crecen gratis al tamaño inicial nuevo (columnas a la derecha y filas
    // abajo, con pasto). Lo construido queda en las mismas casillas.
    game.W = Math.max(w, W0); game.H = Math.max(h, H0);
    const tiles = [];
    for (let y = 0; y < game.H; y++) for (let x = 0; x < game.W; x++) {
      tiles.push(x < w && y < h ? old[y * w + x] : { t: x === 0 ? 'hwy' : 'grass' });
    }
    game.S = {
      mode: MODES[d.mode] ? d.mode : 'normal',
      money: Number.isFinite(+d.money) ? +d.money : 0,
      served: +d.served || 0, lost: +d.lost || 0,
      goal: clamp(+d.goal || 0, 0, GOALS.length),
      day: Math.max(1, +d.day || 1), dayT: clamp(+d.dayT || 0, 0, DAY_LEN - 1),
      rep: clamp(Number.isFinite(+d.rep) && d.rep !== undefined ? +d.rep : 3, 1, 5),
      red: +d.red || 0, perfectDays: +d.perfectDays || 0, bestDay: +d.bestDay || 0,
      dayEarn: +d.dayEarn || 0, dayServed: +d.dayServed || 0, dayLost: +d.dayLost || 0,
      w: game.W, h: game.H, land, over: !!d.over, tiles
    };
    game.grewFromOld = game.W > w || game.H > h;
    game.upgradedFromV1 = d.v === 1;
    prep();
    return true;
  } catch (e) { return false; }
}
