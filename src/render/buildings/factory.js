import { game } from '../../state.js';
import { P, poly, cbox, box, winY, winX, shade } from '../iso.js';

/* ---------- Fábrica ---------- */
// Nave de ladrillo con techo de dientes de sierra (tragaluces), chimenea a rayas y andén de carga al
// frente. El nivel agrega dientes al techo y una segunda chimenea; de noche se encienden los ventanales.
const BRICK = '#A4553A', STEEL = '#8E96A3';
export default function draw(x, y, t) {
  const lvl = Math.max(1, Math.min(3, t.lvl | 0 || 1));
  const off = t.off > 0, lit = game.dark && !off;
  const Q = (pts, c) => poly(pts.map(([a, b, z = 0]) => P(x + a, y + b, z)), c);
  Q([[0.04, 0.04, 0.005], [0.96, 0.04, 0.005], [0.96, 0.96, 0.005], [0.04, 0.96, 0.005]], '#B9B5AC');   // patio
  const x0 = 0.1, y0 = 0.12, x1 = 0.9, y1 = 0.66, h = 0.42;
  box(x + x0, y + y0, x + x1, y + y1, 0, h, shade(BRICK, 0.1), BRICK, shade(BRICK, -0.25));
  // ventanales y portón
  const glass = off ? '#5E6670' : lit ? '#FFE08A' : '#9CC7DE';
  for (let i = 0; i < 4; i++) winY(x + 0.14 + i * 0.19, x + 0.27 + i * 0.19, y + y1, 0.24, 0.36, glass);
  winY(x + 0.36, x + 0.62, y + y1, 0, 0.2, STEEL);
  for (let k = 0; k < 3; k++) winY(x + 0.36, x + 0.62, y + y1, 0.05 + k * 0.05, 0.06 + k * 0.05, shade(STEEL, -0.2));
  winX(x + x1, y + 0.2, y + 0.58, 0.24, 0.34, glass);
  // techo de dientes de sierra (a lo largo de y)
  const n = 2 + lvl, w = (y1 - y0) / n;
  for (let i = 0; i < n; i++) {
    const a = y0 + i * w, b = a + w;
    Q([[x0, a, h], [x1, a, h], [x1, b, h + 0.16], [x0, b, h + 0.16]], '#6F7680');
    Q([[x0, b, h], [x1, b, h], [x1, b, h + 0.16], [x0, b, h + 0.16]], lit ? '#FFE9A0' : '#B7D6E6');
    Q([[x1, a, h], [x1, b, h], [x1, b, h + 0.16]], '#565D66');
  }
  // chimeneas
  const chim = (cx, cy, top) => {
    cbox(x + cx, y + cy, x + cx + 0.1, y + cy + 0.1, h, top, '#C8C2B8');
    cbox(x + cx - 0.005, y + cy - 0.005, x + cx + 0.105, y + cy + 0.105, top - 0.12, top - 0.07, '#D62828');
  };
  chim(0.72, 0.16, h + 0.62);
  if (lvl >= 3) chim(0.56, 0.16, h + 0.5);
  // andén con tarimas
  cbox(x + 0.3, y + y1, x + 0.7, y + y1 + 0.12, 0, 0.08, '#A8A398');
  if (lvl >= 2) cbox(x + 0.66, y + 0.76, x + 0.84, y + 0.9, 0, 0.14, '#C9954F');
  return h + 0.16;
}
