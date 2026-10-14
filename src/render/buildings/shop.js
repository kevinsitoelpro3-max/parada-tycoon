import { game } from '../../state.js';
import { ctx } from '../../utils.js';
import { P, poly, box, cbox, winX, winY, shade } from '../iso.js';

/* ---------- Tiendita ---------- */
// Dibuja el negocio en la casilla (x, y) y devuelve la altura del techo (para poner el ícono encima).
// t.lvl es el nivel (1 a 3) y t.off > 0 significa que está sin luz.
// Tiendita de esquina: muros claros con zoclo verde, toldo a rayas sobre la vitrina, letrero en la
// azotea y tinaco. Nivel 2: hielera afuera y toldo más profundo. Nivel 3: local más ancho con
// segunda puerta, toldo más largo y refrigerador de refrescos afuera.
const GREEN = '#2A9D5C', WHITE = '#F7F7F4', WALL = '#F3EDDF';

export default function draw(x, y, t) {
  const lvl = Math.max(1, Math.min(3, t.lvl | 0 || 1));
  const off = t.off > 0, lit = game.dark && !off;
  const glass = off ? '#5E6670' : lit ? '#FFE08A' : '#A6D6EA';
  const door = off ? '#4A5058' : lit ? '#FFF1BF' : '#6FA9C4';
  const B = (x0, y0, x1, y1, z0, z1, c, top) => cbox(x + x0, y + y0, x + x1, y + y1, z0, z1, c, top);
  const Q = (pts, c) => poly(pts.map(([a, b, z]) => P(x + a, y + b, z)), c);

  // Medidas del local según nivel
  const x0 = 0.08, y0 = 0.1, x1 = lvl >= 3 ? 0.8 : 0.78, y1 = 0.66, h = 0.5;

  // Cuerpo, zoclo verde y azotea con pretil
  B(x0, y0, x1, y1, 0, h, WALL);
  winY(x + x0, x + x1, y + y1, 0, 0.06, GREEN);
  winX(x + x1, y + y0, y + y1, 0, 0.06, shade(GREEN, -0.2));
  box(x + x0 - 0.01, y + y0 - 0.01, x + x1 + 0.01, y + y1 + 0.01, h, h + 0.07, '#D6D0C2', GREEN, shade(GREEN, -0.24));

  // Frente: puerta(s) y vitrina con repisas
  winY(x + x0 + 0.05, x + x0 + 0.15, y + y1, 0.06, 0.38, '#1F6E43');
  winY(x + x0 + 0.065, x + x0 + 0.135, y + y1, 0.06, 0.36, door);
  const vx0 = x0 + 0.19, vx1 = lvl >= 3 ? x1 - 0.2 : x1 - 0.05;
  winY(x + vx0, x + vx1, y + y1, 0.1, 0.37, glass);
  if (!off) {
    winY(x + vx0 + 0.02, x + vx1 - 0.02, y + y1, 0.15, 0.175, lit ? '#E8A93A' : '#E8892B');
    winY(x + vx0 + 0.02, x + vx1 - 0.02, y + y1, 0.23, 0.255, lit ? '#D9534F' : '#D62828');
  }
  if (lvl >= 3) {
    winY(x + x1 - 0.16, x + x1 - 0.06, y + y1, 0.06, 0.38, '#1F6E43');
    winY(x + x1 - 0.145, x + x1 - 0.075, y + y1, 0.06, 0.36, door);
  }
  // Ventana lateral
  winX(x + x1, y + y0 + 0.12, y + y1 - 0.14, 0.16, 0.38, glass);

  // Tinaco y letrero en la azotea
  cyl(x + x1 - 0.14, y + y0 + 0.11, h + 0.07, h + 0.21, 0.065, '#2F3439', '#4C535B');
  const sx0 = x0 + 0.1, sx1 = sx0 + 0.3 + lvl * 0.06;
  const sign = off ? '#C9C2A4' : lit ? '#FFE27A' : '#F2C230';
  box(x + sx0, y + y1 - 0.06, x + sx1, y + y1 - 0.02, h + 0.07, h + 0.24, shade(sign, 0.2), sign, shade(sign, -0.26));
  winY(x + sx0 + 0.04, x + sx1 - 0.04, y + y1 - 0.02, h + 0.135, h + 0.175, off ? '#7E8A80' : '#1F7A47');

  // Toldo a rayas verdes y blancas sobre el frente (más profundo desde el nivel 2)
  const d = lvl >= 2 ? 0.12 : 0.1, ta = h - 0.03, tb = h - 0.1, n = lvl >= 3 ? 7 : 5;
  const ax0 = x0 + 0.03, ax1 = x1 - 0.03, w = (ax1 - ax0) / n;
  for (let i = 0; i < n; i++) {
    const a = ax0 + i * w, b = a + w, c = i % 2 ? WHITE : GREEN;
    Q([[a, y1, ta], [b, y1, ta], [b, y1 + d, tb], [a, y1 + d, tb]], shade(c, 0.06));
    Q([[a, y1 + d, tb], [b, y1 + d, tb], [b, y1 + d, tb - 0.05], [a, y1 + d, tb - 0.05]], shade(c, -0.08));
  }
  Q([[ax1, y1, ta], [ax1, y1 + d, tb], [ax1, y1 + d, tb - 0.05]], shade(GREEN, -0.3));

  // Afuera: refrigerador de refrescos (nivel 3) y hielera (nivel 2+)
  if (lvl >= 3) {
    B(x1 + 0.03, 0.36, x1 + 0.13, 0.5, 0, 0.34, '#D62828');
    winX(x + x1 + 0.13, y + 0.38, y + 0.48, 0.05, 0.29, off ? '#5E6670' : lit ? '#FFF1BF' : '#BFE3F2');
  }
  if (lvl >= 2) {
    B(0.78, 0.74, 0.94, 0.86, 0, 0.17, '#F4F6F8');
    winY(x + 0.78, x + 0.94, y + 0.86, 0.08, 0.12, '#3D6FB0');
    winX(x + 0.94, y + 0.74, y + 0.86, 0.08, 0.12, shade('#3D6FB0', -0.2));
  }
  return h + 0.07;
}

// Tinaco: cilindro vertical (cuerpo, base redonda y tapa)
function cyl(cx, cy, z0, z1, r, body, top) {
  const [bx, by] = P(cx, cy, z0), [tx, ty] = P(cx, cy, z1), rx = r * 45.3, ry = r * 22.6;
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.ellipse(bx, by, rx, ry, 0, 0, Math.PI); ctx.lineTo(tx - rx, ty); ctx.lineTo(tx + rx, ty); ctx.closePath(); ctx.fill();
  ctx.fillStyle = top;
  ctx.beginPath(); ctx.ellipse(tx, ty, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}
