import { game } from '../../state.js';
import { P, poly, box, cbox, winX, winY } from '../iso.js';

/* ---------- Taller mecánico ---------- */
// Dibuja el negocio en la casilla (x, y) y devuelve la altura del techo (para poner el ícono encima).
// t.lvl es el nivel (1 a 3) y t.off > 0 significa que está sin luz.
export default function draw(x, y, t) {
  const lit = t.off > 0 ? '#5E6670' : '#FFE08A';
  cbox(x + 0.1, y + 0.1, x + 0.9, y + 0.9, 0, 0.62, '#9CA3AF', '#4B5563');
  // cortina del taller con franjas
  winY(x + 0.2, x + 0.8, y + 0.9, 0, 0.46, '#374151');
  for (const z of [0.12, 0.24, 0.36]) winY(x + 0.2, x + 0.8, y + 0.9 + 0.001, z, z + 0.025, '#6B7280');
  winX(x + 0.9, y + 0.25, y + 0.75, 0.24, 0.44, lit);
  // franja amarilla de advertencia arriba de la cortina
  winY(x + 0.12, x + 0.88, y + 0.9 + 0.002, 0.5, 0.56, '#F2C230');
  return 0.62;
}
