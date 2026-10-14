import { game } from '../../state.js';
import { P, poly, box, cbox, winX, winY } from '../iso.js';

/* ---------- Gasolinera ---------- */
// Dibuja el negocio en la casilla (x, y) y devuelve la altura del techo (para poner el ícono encima).
// t.lvl es el nivel (1 a 3) y t.off > 0 significa que está sin luz.
// Acomodo: tienda atrás a la derecha, marquesina con las islas de bombas adelante a la izquierda,
// letrero de precios en la esquina de atrás (bajo en nivel 2, poste alto en nivel 3) y compresor
// de aire al frente.
const RED = '#D62828', RED_D = '#AE1F1F', YEL = '#F2C230';

// Por nivel: alcance de la marquesina y columnas (x) de las islas que van debajo.
const CANOPY = [
  null,
  { x0: 0.1, x1: 0.5, y0: 0.4, y1: 0.93, isl: [0.3] },
  { x0: 0.06, x1: 0.54, y0: 0.32, y1: 0.95, isl: [0.2, 0.41] },
  { x0: 0.04, x1: 0.56, y0: 0.27, y1: 0.96, isl: [0.17, 0.41] }
];

export default function draw(x, y, t) {
  const lvl = Math.max(1, Math.min(3, t.lvl | 0 || 1));
  const off = t.off > 0, lit = game.dark && !off;
  const glass = off ? '#5E6670' : lit ? '#FFE08A' : '#86C0DC';
  const B = (x0, y0, x1, y1, z0, z1, c, top) => cbox(x + x0, y + y0, x + x1, y + y1, z0, z1, c, top);
  const flat = (x0, y0, x1, y1, c) => poly([P(x + x0, y + y0), P(x + x1, y + y0), P(x + x1, y + y1), P(x + x0, y + y1)], c);
  const C = CANOPY[lvl], H = 0.6 + lvl * 0.03;   // altura de la marquesina

  // Letrero de precios atrás a la derecha, para no tapar la tienda ni el ícono:
  // nivel 2, letrero bajo (0.75) sobre un pedestal; nivel 3, poste alto (1.08) con dos precios
  const digit = off ? '#5E6670' : YEL;
  if (lvl >= 3) {
    B(0.885, 0.085, 0.915, 0.115, 0, 0.62, '#9BA1A8');
    box(x + 0.8, y + 0.07, x + 0.98, y + 0.13, 0.6, 1.08, '#F4F4F2', RED, RED_D);
    winY(x + 0.81, x + 0.97, y + 0.13, 0.94, 1.05, '#F7F7F5');
    winY(x + 0.82, x + 0.96, y + 0.13, 0.66, 0.76, '#22262B');
    winY(x + 0.82, x + 0.96, y + 0.13, 0.8, 0.9, '#22262B');
    winY(x + 0.85, x + 0.93, y + 0.13, 0.69, 0.73, digit);
    winY(x + 0.85, x + 0.93, y + 0.13, 0.83, 0.87, digit);
  } else if (lvl >= 2) {
    B(0.87, 0.08, 0.93, 0.12, 0, 0.42, '#9BA1A8');
    box(x + 0.8, y + 0.07, x + 0.98, y + 0.13, 0.4, 0.75, '#F4F4F2', RED, RED_D);
    winY(x + 0.81, x + 0.97, y + 0.13, 0.63, 0.72, '#F7F7F5');
    winY(x + 0.82, x + 0.96, y + 0.13, 0.48, 0.59, '#22262B');
    winY(x + 0.85, x + 0.93, y + 0.13, 0.515, 0.555, digit);
  }

  // Luz bajo la marquesina de noche
  if (lit) flat(C.x0, C.y0 + 0.04, C.x1 + 0.04, C.y1 + 0.03, 'rgba(255,214,110,.5)');

  // Islas con bombas (de atrás hacia adelante): banqueta, bomba trasera, columna, bomba delantera
  const ya = C.y0 + 0.14, yb = C.y1 - 0.12;
  for (const ix of C.isl) {
    B(ix - 0.045, ya - 0.06, ix + 0.045, yb + 0.06, 0, 0.05, '#ECE8DE');
    pump(ix, ya + 0.04);
    B(ix - 0.018, (ya + yb) / 2 - 0.018, ix + 0.018, (ya + yb) / 2 + 0.018, 0.05, H, '#E9E9E6');
    pump(ix, yb - 0.04);
  }
  function pump(px, py, c = RED, cd = RED_D) {
    box(x + px - 0.035, y + py - 0.04, x + px + 0.035, y + py + 0.04, 0.05, 0.3, '#F4F4F2', c, cd);
    winX(x + px + 0.035, y + py - 0.028, y + py + 0.028, 0.19, 0.26, off ? '#4A5058' : lit ? '#BFF0C8' : '#2B3A44');
  }

  // Marquesina: techo blanco con faldón rojo y franja amarilla
  box(x + C.x0, y + C.y0, x + C.x1, y + C.y1, H, H + 0.11, '#F7F7F5', RED, RED_D);
  winY(x + C.x0, x + C.x1, y + C.y1, H + 0.035, H + 0.06, lit ? '#FFE27A' : YEL);
  winX(x + C.x1, y + C.y0, y + C.y1, H + 0.035, H + 0.06, lit ? '#FFE27A' : YEL);

  // Tienda: muros claros, vitrina hacia el patio y cornisa roja
  const sx0 = 0.6, sy0 = lvl >= 3 ? 0.18 : 0.14, sy1 = 0.5, sz = 0.4;
  B(sx0, sy0, 0.94, sy1, 0, sz, '#EEEAE0');
  winY(x + 0.63, x + 0.91, y + sy1, 0.05, 0.29, glass);
  winY(x + 0.66, x + 0.73, y + sy1, 0, 0.29, off ? '#4A5058' : lit ? '#FFF1BF' : '#5A8FA8');
  winX(x + 0.94, y + sy0 + 0.06, y + sy1 - 0.06, 0.12, 0.29, glass);
  box(x + sx0 - 0.01, y + sy0 - 0.01, x + 0.95, y + sy1 + 0.01, sz, sz + 0.09, '#D9D5CB', RED, RED_D);
  if (lvl >= 2) B(0.7, sy0 + 0.06, 0.8, sy0 + 0.16, sz + 0.09, sz + 0.17, '#B9BEC4');   // clima en el techo

  // Frente derecho: compresor de aire; en nivel 3, isla de diésel para tráileres (bomba amarilla)
  if (lvl >= 3) {
    B(0.81, 0.62, 0.89, 0.93, 0, 0.05, '#ECE8DE');
    pump(0.85, 0.7, YEL, '#C99A1E');
    pump(0.85, 0.86, YEL, '#C99A1E');
  } else {
    B(0.84, 0.76, 0.92, 0.84, 0, 0.22, '#3D6FB0');
    winY(x + 0.855, x + 0.905, y + 0.84, 0.12, 0.18, '#E9EEF4');
  }
  return H + 0.11;
}
