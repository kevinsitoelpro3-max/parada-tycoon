import { game } from '../../state.js';
import { P, poly, box, cbox, winX, winY } from '../iso.js';

/* ---------- Gasolinera ---------- */
// Dibuja el negocio en la casilla (x, y) y devuelve la altura del techo (para poner el ícono encima).
// t.lvl es el nivel (1 a 3) y t.off > 0 significa que está sin luz.
export default function draw(x, y, t) {
  const glass = t.off > 0 ? '#5E6670' : '#86C0DC';
  cbox(x + 0.07, y + 0.07, x + 0.4, y + 0.4, 0, 0.5, '#E9E9E9', '#2F6B4F');
  winY(x + 0.12, x + 0.34, y + 0.4, 0.12, 0.36, glass);
  winX(x + 0.4, y + 0.12, y + 0.34, 0.12, 0.36, glass);
  cbox(x + 0.55, y + 0.55, x + 0.63, y + 0.63, 0, 0.3, '#D62828');
  cbox(x + 0.74, y + 0.5, x + 0.82, y + 0.58, 0, 0.3, '#D62828');
  cbox(x + 0.88, y + 0.38, x + 0.93, y + 0.43, 0, 0.62, '#BDBDBD');
  cbox(x + 0.38, y + 0.88, x + 0.43, y + 0.93, 0, 0.62, '#BDBDBD');
  cbox(x + 0.88, y + 0.88, x + 0.93, y + 0.93, 0, 0.62, '#BDBDBD');
  box(x + 0.34, y + 0.34, x + 0.96, y + 0.96, 0.62, 0.72, '#F7F7F7', '#D62828', '#AE1F1F');
  return 0.72;
}
