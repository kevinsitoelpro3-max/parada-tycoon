import { KINDS } from './config.js';
import { fmt, mulberry32 } from './utils.js';
import { game, countK, save } from './state.js';
import { addXp } from './progress.js';
import { toast } from './ui/toast.js';
import { sfx } from './audio/sfx.js';

/* ---------- Premio diario y retos del día ---------- */
// Van por día del calendario (del celular), no por día del juego, y se guardan aparte de la partida
// (clave DKEY) para que la racha siga aunque empieces otra partida. Lo que se cobra va a la partida actual.
// El sorteo de los retos usa mulberry32 con la fecha como semilla: no toca Math.random.
const DKEY = 'parada-tycoon-diario';
const DAILY_MONEY = [300, 500, 700, 900, 1200, 1500, 2500];   // día 1 a 7 de la racha (luego vuelve a empezar)
const DAILY_XP = [30, 40, 50, 60, 80, 100, 200];
export const RETOS_DAY = 6;      // retos por día: 3 a la vez; al cobrar uno sale otro hasta llegar a 6
const RETO_XP = 100, ALL_XP = 150;

const BASIC = ['gas', 'food', 'sleep'];
// Cada reto: texto con su meta y si se puede dar (según lo que tienes). d = día de la partida (máx. 30)
const RETOS = {
  serve: { n: d => r5(50 + 6 * d), txt: m => `Atiende ${fmt(m.n)} tráileres` },
  earn:  { n: d => r100(2500 + 800 * d), txt: m => `Vende $${fmt(m.n)}` },
  kind:  { n: d => r5(20 + 3 * d), txt: m => `Atiende ${fmt(m.n)} clientes en ${KINDS[m.k].emoji} ${KINDS[m.k].name.toLowerCase()}` },
  up:    { n: d => d > 8 ? 3 : 2, txt: m => `Mejora ${m.n} veces tus negocios` },
  green: { n: d => d > 10 ? 4 : 3, txt: m => `Cierra ${m.n} días sin quedar en rojo` },
  deco:  { n: () => 3, txt: m => `Pon ${m.n} decoraciones (banca, jardín o letrero)` },
  cash:  { n: d => d > 10 ? 8 : 5, txt: m => `Cobra ${m.n} propinas 💰 tocando tus negocios` },
  night: { n: d => r5(12 + 2 * d), txt: m => `Atiende ${fmt(m.n)} tráileres de noche (desde las 20:00)` },
  cit:   { n: d => r5(10 + 2 * d), txt: m => `Atiende a ${fmt(m.n)} ciudadanos 🚗`, can: () => game.S.tiles.some(t => t.t === 'home') },
  unload:{ n: d => r5(8 + d), txt: m => `Descarga ${fmt(m.n)} tráileres en tu 📦 zona de descarga`, can: () => countK('dock') > 0 },
  box:   { n: d => r5(10 + 2 * d), txt: m => `Entrega ${fmt(m.n)} 📦 cajas de tu fábrica`, can: () => countK('factory') > 0 },
  combo: { n: d => d > 10 ? 10 : 6, txt: m => `Cobra ${m.n} propinas de tráileres con dos pedidos`, can: () => BASIC.filter(k => countK(k) > 0).length >= 2 },
};
const r5 = v => Math.round(v / 5) * 5, r100 = v => Math.round(v / 100) * 100;

const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => ymd(new Date());
const yesterday = () => { const d = new Date(); return ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)); };
const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

let D = null;   // { v, date, last (último día que cobraste el premio), streak, dealt, all, ms: [{ t, n, k?, got, prize }] }
function store() { try { localStorage.setItem(DKEY, JSON.stringify(D)); } catch (_) {} }
function read() {
  try {
    const d = JSON.parse(localStorage.getItem(DKEY) || 'null');
    if (d && d.v === 1 && Array.isArray(d.ms)) return d;
  } catch (_) {}
  return { v: 1, date: '', last: '', streak: 0, dealt: 0, all: false, ms: [] };
}
const moneyScale = () => 1 + 0.15 * Math.min(20, game.S.day - 1);

function deal() {
  const d = Math.min(30, game.S.day), date = D.date;
  const r = mulberry32(hash(date + '#' + D.dealt));
  const used = new Set(D.ms.map(m => m.t));
  const pool = Object.keys(RETOS).filter(t => !used.has(t) && (!RETOS[t].can || RETOS[t].can()));
  const t = pool[Math.floor(r() * pool.length)] || 'serve';
  const m = { t, n: RETOS[t].n(d), got: 0, prize: Math.round((400 + 200 * d) / 50) * 50 };
  if (t === 'kind') {
    const own = Object.keys(KINDS).filter(k => !KINDS[k].side && countK(k) > 0);
    m.k = own.length ? own[Math.floor(r() * own.length)] : 'gas';
  }
  D.dealt++;
  return m;
}
// Al cambiar de fecha salen 3 retos nuevos (los de ayer se pierden)
export function ensureToday() {
  if (!D) D = read();
  const t = today();
  if (D.date === t) return D;
  D.date = t; D.dealt = 0; D.all = false; D.ms = [];
  while (D.ms.length < 3) D.ms.push(deal());
  store();
  return D;
}
export const retoText = m => RETOS[m.t] ? RETOS[m.t].txt(m) : '';
export const retoDone = m => m.got >= m.n;

// Lo que pasa en la partida avanza los retos: track('serve'), track('earn', 120), track('kind', 1, 'gas')...
export function track(t, n = 1, k = null) {
  if (game.S.over) return;
  ensureToday();
  let changed = false;
  for (const m of D.ms) {
    if (m.t !== t || retoDone(m) || (m.k && m.k !== k)) continue;
    m.got = Math.min(m.n, m.got + n); changed = true;
    if (retoDone(m)) { sfx.goal(); toast(`🎯 Reto cumplido: ${retoText(m)}. Cóbralo en ☰ → Retos`, 3200, true); }
  }
  if (changed) store();
}

// Premio diario: se cobra una vez por fecha; si ayer también cobraste, la racha sigue
export function dailyInfo() {
  ensureToday();
  const can = D.last !== D.date;
  const streak = can ? (D.last === yesterday() ? D.streak + 1 : 1) : D.streak;
  const i = (streak - 1) % 7;
  return { can, streak, i, money: Math.round(DAILY_MONEY[i] * moneyScale() / 10) * 10, xp: DAILY_XP[i], all: DAILY_MONEY.map(v => Math.round(v * moneyScale() / 10) * 10) };
}
export function claimDaily() {
  const S = game.S, info = dailyInfo();
  if (!info.can || S.over) return;
  D.last = D.date; D.streak = info.streak;
  store();
  S.money += info.money;
  addXp(info.xp);
  sfx.goal();
  toast(`🎁 Premio del día ${info.i + 1}: +$${fmt(info.money)} y ${info.xp} XP. ¡Vuelve mañana para seguir la racha!`, 3600, true);
  save();
}
export function claimReto(i) {
  const S = game.S;
  ensureToday();
  const m = D.ms[i];
  if (!m || !retoDone(m) || S.over) return;
  S.money += m.prize;
  S.retos = (S.retos || 0) + 1;
  addXp(RETO_XP);
  sfx.goal();
  toast(`🎯 +$${fmt(m.prize)} y ${RETO_XP} XP`, 2600, true);
  // Sale otro reto en su lugar hasta RETOS_DAY por día
  if (D.dealt < RETOS_DAY) D.ms[i] = deal(); else D.ms.splice(i, 1);
  // Bono por cumplir los 6 del día
  if (!D.ms.length && !D.all) {
    D.all = true;
    const bonus = Math.round(1000 * moneyScale() / 50) * 50;
    S.money += bonus;
    addXp(ALL_XP);
    toast(`🏆 ¡Cumpliste todos los retos de hoy! +$${fmt(bonus)} y ${ALL_XP} XP`, 3600, true);
  }
  store();
  save();
}
export const retosInfo = () => ({ ms: ensureToday().ms, left: RETOS_DAY - D.dealt, all: D.all, xp: RETO_XP });
// Hay algo para cobrar (marca roja en ☰)
export const dailyReady = () => !game.S.over && (dailyInfo().can || D.ms.some(retoDone));
