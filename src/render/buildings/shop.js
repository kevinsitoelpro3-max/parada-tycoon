import { game } from '../../state.js';
import { P, poly, box, cbox, winX, winY } from '../iso.js';

/* ---------- Tiendita ---------- */
// Dibuja el negocio en la casilla (x, y) y devuelve la altura del techo (para poner el ícono encima).
// t.lvl es el nivel (1 a 3) y t.off > 0 significa que está sin luz.
export default function draw(x, y, t) {
  const glass = t.off > 0 ? '#5E6670' : '#A6D6EA';
  cbox(x + 0.16, y + 0.16, x + 0.84, y + 0.84, 0, 0.42, '#F4F1E8', '#2F6B4F');
  winY(x + 0.22, x + 0.42, y + 0.84, 0, 0.3, '#5A3B24');
  winY(x + 0.48, x + 0.78, y + 0.84, 0.1, 0.3, glass);
  winX(x + 0.84, y + 0.22, y + 0.78, 0.1, 0.3, glass);
  // toldo verde y blanco
  box(x + 0.18, y + 0.84, x + 0.82, y + 0.94, 0.3, 0.36, '#FFFFFF', '#2A9D5C', '#1F7A47');
  box(x + 0.84, y + 0.18, x + 0.94, y + 0.82, 0.3, 0.36, '#FFFFFF', '#2A9D5C', '#1F7A47');
  // letrero en el techo
  cbox(x + 0.3, y + 0.42, x + 0.7, y + 0.5, 0.42, 0.58, '#F2C230');
  return 0.58;
}
