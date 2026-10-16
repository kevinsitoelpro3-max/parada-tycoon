import { game } from '../../state.js';
import { P, poly, cbox, box, winY, winX, shade } from '../iso.js';

/* ---------- Zona de descarga ---------- */
// Andén de concreto con bodega al fondo (cortinas metálicas que dan a +y), techo de lámina café y
// tarimas con cajas. El nivel agrega cortinas y cajas; en el 3 hay un montacargas amarillo.
// De noche se encienden las lámparas sobre las cortinas.
const BROWN = '#B07A3B', CRATE = '#C9954F';
export default function draw(x, y, t) {
  const lvl = Math.max(1, Math.min(3, t.lvl | 0 || 1));
  const off = t.off > 0, lit = game.dark && !off;
  const Q = (pts, c) => poly(pts.map(([a, b, z = 0]) => P(x + a, y + b, z)), c);
  // andén con orilla amarilla de seguridad
  cbox(x + 0.06, y + 0.06, x + 0.94, y + 0.94, 0, 0.1, '#BFBAB0');
  Q([[0.06, 0.9, 0.1], [0.94, 0.9, 0.1], [0.94, 0.94, 0.1], [0.06, 0.94, 0.1]], '#F2C230');
  // bodega
  const x0 = 0.1, y0 = 0.1, x1 = 0.9, y1 = 0.48, h = 0.52;
  box(x + x0, y + y0, x + x1, y + y1, 0.1, h, '#E9E3D6', '#E2DBCB', '#C8C0AE');
  // techo de lámina a dos aguas (cumbrera a lo largo de x)
  const ym = (y0 + y1) / 2, rz = h + 0.14;
  Q([[x0 - 0.02, y0 - 0.03, h], [x1 + 0.02, y0 - 0.03, h], [x1 + 0.02, ym, rz], [x0 - 0.02, ym, rz]], shade(BROWN, 0.1));
  Q([[x0 - 0.02, ym, rz], [x1 + 0.02, ym, rz], [x1 + 0.02, y1 + 0.03, h], [x0 - 0.02, y1 + 0.03, h]], BROWN);
  Q([[x1 + 0.02, y0 - 0.03, h], [x1 + 0.02, y1 + 0.03, h], [x1 + 0.02, ym, rz]], shade(BROWN, -0.3));
  // cortinas metálicas con rayas
  const n = lvl + 1, w = (x1 - x0 - 0.06) / n;
  for (let i = 0; i < n; i++) {
    const a = x0 + 0.04 + i * w, b = a + w - 0.04;
    winY(x + a, x + b, y + y1, 0.1, 0.4, off ? '#6B7078' : '#8E959E');
    for (let k = 0; k < 4; k++) winY(x + a, x + b, y + y1, 0.16 + k * 0.06, 0.17 + k * 0.06, '#757C85');
    if (lit) winY(x + a + 0.04, x + b - 0.04, y + y1, 0.43, 0.46, '#FFE08A');
  }
  winX(x + x1, y + y0 + 0.08, y + y1 - 0.08, 0.22, 0.34, off ? '#5E6670' : lit ? '#FFE08A' : '#A6D6EA');
  // tarimas con cajas (más con cada nivel)
  const crate = (cx, cy, z) => cbox(x + cx, y + cy, x + cx + 0.13, y + cy + 0.12, z, z + 0.12, CRATE);
  const pallet = (cx, cy) => cbox(x + cx - 0.01, y + cy - 0.01, x + cx + 0.28, y + cy + 0.14, 0.1, 0.13, '#8A6A45');
  pallet(0.14, 0.62); crate(0.14, 0.63, 0.13); crate(0.28, 0.63, 0.13);
  if (lvl >= 2) { crate(0.21, 0.63, 0.25); pallet(0.56, 0.7); crate(0.56, 0.71, 0.13); crate(0.7, 0.71, 0.13); }
  if (lvl >= 3) {
    crate(0.63, 0.71, 0.25);
    // montacargas
    cbox(x + 0.44, y + 0.58, x + 0.56, y + 0.74, 0.1, 0.26, '#F2B705');
    cbox(x + 0.46, y + 0.6, x + 0.54, y + 0.7, 0.26, 0.4, '#2F3439');
    cbox(x + 0.4, y + 0.74, x + 0.42, y + 0.76, 0.1, 0.42, '#4B5563');
  }
  return rz;
}
