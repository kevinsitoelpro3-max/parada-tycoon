import { PERFECT_DAY_MIN, KINDS } from './config.js';
import { game, countK, levelInfo } from './state.js';

/* ---------- Metas ---------- */
export const GOALS = [
  { text: 'Traza una calle que salga de la carretera', prize: 50,   ok: () => game.S.tiles.some(t => t.t === 'road') },
  { text: 'Abre una gasolinera pegada a tu calle',     prize: 100,  ok: () => countK('gas') >= 1 },
  { text: 'Atiende 10 tráileres',                      prize: 150,  ok: () => game.S.served >= 10 },
  { text: 'Abre un comedor',                           prize: 200,  ok: () => countK('food') >= 1 },
  { text: 'Abre un hotel de paso',                     prize: 250,  ok: () => countK('sleep') >= 1 },
  { text: 'Mejora un negocio a nivel 2',               prize: 300,  ok: () => game.S.tiles.some(t => t.t === 'bld' && t.lvl >= 2) },
  { text: 'Atiende 100 tráileres',                     prize: 500,  ok: () => game.S.served >= 100 },
  { text: 'Junta $5,000 en caja',                      prize: 1000, ok: () => game.S.money >= 5000 },
  { text: 'Ten 3 negocios en nivel 3',                 prize: 2000, ok: () => game.S.tiles.filter(t => t.t === 'bld' && t.lvl >= 3).length >= 3 },
  // Temporada 2
  { text: 'Llega a 4 estrellas de reputación',         prize: 500,  ok: () => game.S.rep >= 4 },
  { text: 'Amplía tu terreno desde el menú ☰',         prize: 500,  ok: () => (game.S.land || 0) > 0 },
  { text: `Cierra un día con ${PERFECT_DAY_MIN} clientes o más y nadie enojado`, prize: 800, ok: () => game.S.perfectDays >= 1 },
  { text: 'Vende $5,000 en un solo día',               prize: 1000, ok: () => Math.max(game.S.bestDay, game.S.dayEarn) >= 5000 },
  { text: 'Atiende 500 tráileres',                     prize: 1500, ok: () => game.S.served >= 500 },
  { text: 'Llega al día 10 sin quebrar',               prize: 2000, ok: () => game.S.day >= 10 },
  { text: 'Llega a 5 estrellas de reputación',         prize: 3000, ok: () => game.S.rep >= 4.95 },
  { text: 'Junta $30,000 en caja',                     prize: 5000, ok: () => game.S.money >= 30000 },
  // Temporada 3: negocios extra
  { text: 'Abre una tiendita',                         prize: 100,  ok: () => countK('shop') >= 1 },
  { text: 'Abre un lavado de tráileres',               prize: 200,  ok: () => countK('wash') >= 1 },
  { text: 'Abre un taller',                            prize: 400,  ok: () => countK('repair') >= 1 },
  { text: 'Ten los 6 tipos de negocio a la vez',       prize: 1500, ok: () => Object.keys(KINDS).filter(k => !KINDS[k].night).every(k => countK(k) >= 1) },
  { text: 'Atiende 1,000 tráileres',                   prize: 3000, ok: () => game.S.served >= 1000 },
  // Temporada 4: nivel de dueño, retos y propinas
  { text: 'Cobra 5 propinas 💰 tocando tus negocios',   prize: 500,  ok: () => (game.S.cash || 0) >= 5 },
  { text: 'Llega al nivel 5 de dueño',                 prize: 1000, ok: () => levelInfo().lvl >= 5 },
  { text: 'Compra 3 mejoras en ☰ → Mejoras',           prize: 1500, ok: () => Object.values(game.S.perks || {}).reduce((a, b) => a + b, 0) >= 3 },
  { text: 'Cumple 5 retos del día (☰ → Retos)',        prize: 2500, ok: () => (game.S.retos || 0) >= 5 },
  { text: 'Atiende 2,500 tráileres',                   prize: 5000, ok: () => game.S.served >= 2500 },
  { text: 'Llega al día 20 sin quebrar',               prize: 6000, ok: () => game.S.day >= 20 },
  { text: 'Llega al nivel 15 de dueño',                prize: 8000, ok: () => levelInfo().lvl >= 15 },
  { text: 'Junta $100,000 en caja',                    prize: 15000, ok: () => game.S.money >= 100000 },
  { text: 'Atiende 5,000 tráileres',                   prize: 20000, ok: () => game.S.served >= 5000 }
];
