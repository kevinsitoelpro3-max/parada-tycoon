import { game } from '../state.js';
import { P, poly, cbox, winY, circle } from './iso.js';
import { ctx } from '../utils.js';

/* ---------- Decoración: banca, jardín y letrero luminoso ---------- */
// Cada una queda dentro de su casilla; de noche (game.dark) el letrero y la lámpara se encienden.
const bench = (x, y) => {
  poly([P(x + 0.2, y + 0.2), P(x + 0.8, y + 0.2), P(x + 0.8, y + 0.8), P(x + 0.2, y + 0.8)], 'rgba(0,0,0,.1)');
  cbox(x + 0.28, y + 0.42, x + 0.32, y + 0.6, 0, 0.14, '#5B4636');
  cbox(x + 0.68, y + 0.42, x + 0.72, y + 0.6, 0, 0.14, '#5B4636');
  cbox(x + 0.25, y + 0.4, x + 0.75, y + 0.62, 0.14, 0.18, '#B5763A');       // asiento
  cbox(x + 0.25, y + 0.36, x + 0.75, y + 0.4, 0.18, 0.36, '#9C6230');       // respaldo
  // farol al lado
  cbox(x + 0.78, y + 0.7, x + 0.82, y + 0.74, 0, 0.62, '#3E4450');
  const [lx, ly] = P(x + 0.8, y + 0.72, 0.66);
  circle(lx, ly, 3.2, game.dark ? '#FFE58A' : '#D9DEE4');
};

const FLOWERS = ['#E63946', '#F2C230', '#F28FAD', '#FFFFFF', '#9B5DE5'];
const garden = (x, y) => {
  cbox(x + 0.12, y + 0.12, x + 0.88, y + 0.88, 0, 0.08, '#8A6A4F');       // jardinera
  poly([P(x + 0.16, y + 0.16, 0.08), P(x + 0.84, y + 0.16, 0.08), P(x + 0.84, y + 0.84, 0.08), P(x + 0.16, y + 0.84, 0.08)], '#4F8F3A');
  // arbusto redondo al centro y flores alrededor, en un patrón fijo por casilla
  const [bx, by] = P(x + 0.5, y + 0.5, 0.22);
  circle(bx, by, 9, '#3E7A2E'); circle(bx - 2, by - 3, 6, '#5AA545');
  let h = (x * 73856093 ^ y * 19349663) >>> 0;
  for (let i = 0; i < 7; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    const u = 0.22 + ((h >>> 8) % 56) / 100, v = 0.22 + ((h >>> 16) % 56) / 100;
    if (Math.abs(u - 0.5) < 0.14 && Math.abs(v - 0.5) < 0.14) continue;
    const [fx, fy] = P(x + u, y + v, 0.1);
    circle(fx, fy, 2.2, FLOWERS[i % FLOWERS.length]);
  }
};

const neon = (x, y) => {
  const lit = game.dark;
  cbox(x + 0.46, y + 0.46, x + 0.54, y + 0.54, 0, 0.9, '#4B5563');          // poste
  cbox(x + 0.2, y + 0.44, x + 0.8, y + 0.56, 0.9, 1.3, '#1F2937');          // caja del letrero
  // cara del letrero (mira hacia +y): franjas de colores que se encienden de noche
  winY(x + 0.24, x + 0.76, y + 0.56, 0.94, 1.26, lit ? '#FFF3B0' : '#E5E7EB');
  winY(x + 0.28, x + 0.72, y + 0.56, 1.13, 1.2, lit ? '#FF4D8D' : '#D62828');
  winY(x + 0.28, x + 0.6, y + 0.56, 1.0, 1.07, lit ? '#3BE8FF' : '#3D6FB0');
  if (lit) {
    const [gx, gy] = P(x + 0.5, y + 0.56, 1.1);
    ctx.globalAlpha *= 0.35; circle(gx, gy, 16, '#FFE58A'); ctx.globalAlpha /= 0.35;
  }
};

const DRAW = { bench, garden, neon };
export function drawDeco(x, y, t) { const f = DRAW[t.d]; if (f) f(x, y); }
