import { H0 } from './config.js';
import { game, countK } from './state.js';

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
  { text: 'Amplía tu terreno desde el menú ☰',         prize: 500,  ok: () => game.H > H0 },
  { text: 'Cierra un día con 10 clientes o más y nadie enojado', prize: 800, ok: () => game.S.perfectDays >= 1 },
  { text: 'Vende $2,000 en un solo día',               prize: 1000, ok: () => Math.max(game.S.bestDay, game.S.dayEarn) >= 2000 },
  { text: 'Atiende 500 tráileres',                     prize: 1500, ok: () => game.S.served >= 500 },
  { text: 'Llega al día 15 sin quebrar',               prize: 2000, ok: () => game.S.day >= 15 },
  { text: 'Llega a 5 estrellas de reputación',         prize: 3000, ok: () => game.S.rep >= 4.95 },
  { text: 'Junta $30,000 en caja',                     prize: 5000, ok: () => game.S.money >= 30000 }
];
