import { game } from '../../state.js';
import { P, poly, box, cbox, winX, winY } from '../iso.js';

/* ---------- Comedor ---------- */
// Dibuja el negocio en la casilla (x, y) y devuelve la altura del techo (para poner el ícono encima).
// t.lvl es el nivel (1 a 3) y t.off > 0 significa que está sin luz.
export default function draw(x, y, t) {
  const glass = t.off > 0 ? '#5E6670' : '#A6D6EA';
  cbox(x + 0.12, y + 0.12, x + 0.86, y + 0.86, 0, 0.52, '#F0B03F', '#B8452E');
  winY(x + 0.2, x + 0.4, y + 0.86, 0, 0.34, '#5A3B24');
  winY(x + 0.5, x + 0.78, y + 0.86, 0.16, 0.36, glass);
  winX(x + 0.86, y + 0.2, y + 0.78, 0.16, 0.36, glass);
  box(x + 0.14, y + 0.86, x + 0.84, y + 0.96, 0.38, 0.44, '#FFFFFF', '#E63946', '#C22F3A');
  box(x + 0.86, y + 0.14, x + 0.96, y + 0.84, 0.38, 0.44, '#FFFFFF', '#E63946', '#C22F3A');
  return 0.52;
}
