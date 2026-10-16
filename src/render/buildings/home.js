import { game } from '../../state.js';
import { P, poly, cbox, box, winY, winX, shade } from '../iso.js';

/* ---------- Casa ---------- */
// Nivel 1: casita de un piso con techo de teja a dos aguas. Nivel 2: casa de dos pisos con balcón.
// Nivel 3: edificio chico de departamentos con tinaco. El color de la fachada sale de la casilla
// (sin azar) para que el barrio no se vea igual. De noche se encienden algunas ventanas.
const WALLS = ['#F2D7A6', '#E9B8A0', '#BFD8C2', '#C9D6EA', '#F0E2C4', '#E7C9DD'];
const ROOF = '#B5523B', TRIM = '#FFFFFF';
export default function draw(x, y, t) {
  const lvl = Math.max(1, Math.min(3, t.lvl | 0 || 1));
  const wall = WALLS[((x * 7 + y * 13) >>> 0) % WALLS.length];
  const lit = game.dark, win = i => lit && ((x + y + i) % 3 !== 0) ? '#FFE08A' : '#9CC7DE';
  const Q = (pts, c) => poly(pts.map(([a, b, z = 0]) => P(x + a, y + b, z)), c);
  // patio con pasto y banqueta hacia +y
  Q([[0.06, 0.06, 0.005], [0.94, 0.06, 0.005], [0.94, 0.94, 0.005], [0.06, 0.94, 0.005]], '#7FB45A');
  Q([[0.42, 0.62, 0.008], [0.54, 0.62, 0.008], [0.54, 0.94, 0.008], [0.42, 0.94, 0.008]], '#D9D3C3');
  if (lvl === 1) {
    const x0 = 0.16, y0 = 0.16, x1 = 0.84, y1 = 0.62, h = 0.34;
    box(x + x0, y + y0, x + x1, y + y1, 0, h, shade(wall, 0.1), wall, shade(wall, -0.22));
    winY(x + 0.42, x + 0.54, y + y1, 0, 0.24, '#7A4E2D');                  // puerta
    winY(x + 0.22, x + 0.36, y + y1, 0.12, 0.25, win(0));
    winY(x + 0.6, x + 0.76, y + y1, 0.12, 0.25, win(1));
    winX(x + x1, y + 0.28, y + 0.48, 0.12, 0.25, win(2));
    // techo a dos aguas (cumbrera a lo largo de x)
    const ym = (y0 + y1) / 2, rz = h + 0.22;
    Q([[x0 - 0.04, y0 - 0.04, h], [x1 + 0.04, y0 - 0.04, h], [x1 + 0.04, ym, rz], [x0 - 0.04, ym, rz]], shade(ROOF, 0.12));
    Q([[x0 - 0.04, ym, rz], [x1 + 0.04, ym, rz], [x1 + 0.04, y1 + 0.04, h], [x0 - 0.04, y1 + 0.04, h]], ROOF);
    Q([[x1 + 0.04, y0 - 0.04, h], [x1 + 0.04, y1 + 0.04, h], [x1 + 0.04, ym, rz]], shade(wall, -0.3));
    return rz;
  }
  if (lvl === 2) {
    const x0 = 0.14, y0 = 0.14, x1 = 0.86, y1 = 0.6, h = 0.7;
    box(x + x0, y + y0, x + x1, y + y1, 0, h, shade(wall, 0.12), wall, shade(wall, -0.22));
    winY(x + 0.42, x + 0.54, y + y1, 0, 0.24, '#7A4E2D');
    for (const [a, b, z, i] of [[0.2, 0.34, 0.12, 0], [0.62, 0.78, 0.12, 1], [0.2, 0.34, 0.44, 2], [0.42, 0.56, 0.44, 3], [0.62, 0.78, 0.44, 4]]) winY(x + a, x + b, y + y1, z, z + 0.14, win(i));
    winX(x + x1, y + 0.22, y + 0.34, 0.44, 0.58, win(5)); winX(x + x1, y + 0.42, y + 0.54, 0.12, 0.26, win(6));
    // balcón con barandal
    cbox(x + 0.38, y + y1, x + 0.6, y + y1 + 0.1, 0.36, 0.39, '#DDD6C8');
    winY(x + 0.38, x + 0.6, y + y1 + 0.1, 0.39, 0.48, 'rgba(255,255,255,.55)');
    // azotea con pretil y techo inclinado chico
    box(x + x0 - 0.01, y + y0 - 0.01, x + x1 + 0.01, y + y1 + 0.01, h, h + 0.05, shade(wall, 0.2), shade(wall, -0.05), shade(wall, -0.26));
    Q([[x0 + 0.06, y0 + 0.06, h + 0.05], [x0 + 0.34, y0 + 0.06, h + 0.05], [x0 + 0.34, y0 + 0.24, h + 0.17], [x0 + 0.06, y0 + 0.24, h + 0.17]], ROOF);
    return h + 0.05;
  }
  // nivel 3: departamentos
  const x0 = 0.1, y0 = 0.1, x1 = 0.9, y1 = 0.62, h = 1.05;
  box(x + x0, y + y0, x + x1, y + y1, 0, h, shade(wall, 0.12), wall, shade(wall, -0.22));
  winY(x + 0.42, x + 0.58, y + y1, 0, 0.26, '#5B6B7A');
  for (let f = 0; f < 3; f++) for (let c = 0; c < 3; c++) {
    if (f === 0 && c === 1) continue;
    const a = 0.16 + c * 0.25, z = 0.1 + f * 0.32;
    winY(x + a, x + a + 0.15, y + y1, z, z + 0.16, win(f * 3 + c));
    if (f > 0) winY(x + a - 0.01, x + a + 0.16, y + y1, z - 0.02, z, TRIM);
  }
  for (let f = 0; f < 3; f++) winX(x + x1, y + 0.24, y + 0.46, 0.1 + f * 0.32, 0.26 + f * 0.32, win(f + 9));
  box(x + x0 - 0.01, y + y0 - 0.01, x + x1 + 0.01, y + y1 + 0.01, h, h + 0.05, shade(wall, 0.2), shade(wall, -0.05), shade(wall, -0.26));
  cbox(x + 0.66, y + 0.18, x + 0.82, y + 0.32, h + 0.05, h + 0.22, '#2F3439');      // tinaco
  return h + 0.05;
}
