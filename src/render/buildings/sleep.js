import { game } from '../../state.js';
import { P, poly, box, cbox, winX, winY } from '../iso.js';

/* ---------- Hotel de paso ---------- */
// Dibuja el negocio en la casilla (x, y) y devuelve la altura del techo (para poner el ícono encima).
// t.lvl es el nivel (1 a 3) y t.off > 0 significa que está sin luz.
export default function draw(x, y, t) {
  const h = 0.95 + 0.3 * (t.lvl - 1);
  cbox(x + 0.12, y + 0.12, x + 0.88, y + 0.88, 0, h, '#4F86C6', '#2B4A75');
  const lit = t.off > 0 ? '#3F4A57' : game.dark ? '#FFE08A' : '#DCEBF7';
  for (let z = 0.24; z + 0.13 < h - 0.06; z += 0.26) {
    for (const c of [0.2, 0.44, 0.66]) {
      winY(x + c, x + c + 0.12, y + 0.88, z, z + 0.13, lit);
      winX(x + 0.88, y + c, y + c + 0.12, z, z + 0.13, lit);
    }
  }
  winY(x + 0.44, x + 0.56, y + 0.88, 0, 0.18, '#22344F');
  return h;
}
