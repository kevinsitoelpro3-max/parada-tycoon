import { game } from '../../state.js';
import { P, poly, cbox, winY } from '../iso.js';

/* ---------- Pensión de tráileres ---------- */
// Patio de asfalto con cajones pintados, caseta de vigilancia y letrero azul con la P.
// El nivel agrega cajones y, en el 3, una barda; de noche se encienden la caseta y el letrero.
const BLUE = '#3B5BA5';
export default function draw(x, y, t) {
  const lvl = Math.max(1, Math.min(3, t.lvl | 0 || 1));
  const off = t.off > 0, lit = game.dark && !off;
  const Q = (pts, c) => poly(pts.map(([a, b, z = 0]) => P(x + a, y + b, z)), c);
  Q([[0.06, 0.06, 0.01], [0.94, 0.06, 0.01], [0.94, 0.94, 0.01], [0.06, 0.94, 0.01]], '#5A5F68');   // patio
  // cajones: rayas blancas a lo largo de x
  const n = lvl + 2;
  for (let i = 0; i <= n; i++) {
    const v = 0.14 + i * (0.72 / n);
    Q([[0.3, v - 0.008, 0.012], [0.9, v - 0.008, 0.012], [0.9, v + 0.008, 0.012], [0.3, v + 0.008, 0.012]], '#E8E8E2');
  }
  if (lvl >= 3) { cbox(x + 0.06, y + 0.06, x + 0.94, y + 0.1, 0, 0.12, '#9AA0A8'); cbox(x + 0.9, y + 0.1, x + 0.94, y + 0.94, 0, 0.12, '#9AA0A8'); }
  // caseta
  cbox(x + 0.08, y + 0.62, x + 0.26, y + 0.86, 0, 0.32, '#E7E2D6');
  cbox(x + 0.06, y + 0.6, x + 0.28, y + 0.88, 0.32, 0.36, BLUE);
  winY(x + 0.11, x + 0.23, y + 0.86, 0.14, 0.26, off ? '#5E6670' : lit ? '#FFE08A' : '#A6D6EA');
  // letrero con la P
  cbox(x + 0.13, y + 0.16, x + 0.16, y + 0.19, 0, 0.62, '#4B5563');
  cbox(x + 0.06, y + 0.15, x + 0.24, y + 0.2, 0.62, 0.86, lit ? '#5C7FD0' : BLUE);
  const c = off ? '#9AA0A8' : lit ? '#FFFFFF' : '#F2F4F8';
  winY(x + 0.12, x + 0.14, y + 0.2, 0.66, 0.82, c);                // palo de la P
  winY(x + 0.14, x + 0.19, y + 0.2, 0.76, 0.82, c);                // panza de la P
  winY(x + 0.17, x + 0.19, y + 0.2, 0.72, 0.8, c);
  return 0.62;
}
