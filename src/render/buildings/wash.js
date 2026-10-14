import { game } from '../../state.js';
import { P, poly, box, cbox, winX, winY } from '../iso.js';

/* ---------- Lavado de tráileres ---------- */
// Dibuja el negocio en la casilla (x, y) y devuelve la altura del techo (para poner el ícono encima).
// t.lvl es el nivel (1 a 3) y t.off > 0 significa que está sin luz.
export default function draw(x, y, t) {
  const roof = t.off > 0 ? '#7C8790' : '#1B8FC4';
  // piso mojado y cepillos
  poly([P(x + 0.12, y + 0.12), P(x + 0.88, y + 0.12), P(x + 0.88, y + 0.88), P(x + 0.12, y + 0.88)], '#B9DDEE');
  cbox(x + 0.3, y + 0.42, x + 0.4, y + 0.52, 0, 0.42, '#F2C230');
  cbox(x + 0.6, y + 0.42, x + 0.7, y + 0.52, 0, 0.42, '#F2C230');
  // cuatro postes y techo
  for (const [a, b] of [[0.1, 0.1], [0.8, 0.1], [0.1, 0.8], [0.8, 0.8]]) cbox(x + a, y + b, x + a + 0.1, y + b + 0.1, 0, 0.56, '#E9F4FA');
  box(x + 0.06, y + 0.06, x + 0.94, y + 0.94, 0.56, 0.66, roof, '#E9F4FA', '#C9E3F0');
  return 0.66;
}
