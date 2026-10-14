import { game } from '../../state.js';
import { ctx } from '../../utils.js';
import { P, poly, box, cbox, winX, winY, shade } from '../iso.js';

/* ---------- Tiendita ---------- */
// Dibuja el negocio en la casilla (x, y) y devuelve la altura del techo (para poner el ícono encima).
// t.lvl es el nivel (1 a 3) y t.off > 0 significa que está sin luz.
// Tiendita de esquina: muros claros con zoclo verde, toldo a rayas sobre la vitrina, letrero en la
// azotea y tinaco. Nivel 2: letrero alto que cubre casi todo el frente, toldo a rayas sobre la ventana
// del costado y hielera grande afuera. Nivel 3: local mucho más ancho con segunda puerta, toldo más
// largo y refrigerador de refrescos al frente derecho (dentro de la casilla).
const GREEN = '#2A9D5C', WHITE = '#F7F7F4', WALL = '#F3EDDF';

export default function draw(x, y, t) {
  const lvl = Math.max(1, Math.min(3, t.lvl | 0 || 1));
  const off = t.off > 0, lit = game.dark && !off;
  const glass = off ? '#5E6670' : lit ? '#FFE08A' : '#A6D6EA';
  const door = off ? '#4A5058' : lit ? '#FFF1BF' : '#6FA9C4';
  const B = (x0, y0, x1, y1, z0, z1, c, top) => cbox(x + x0, y + y0, x + x1, y + y1, z0, z1, c, top);
  const Q = (pts, c) => poly(pts.map(([a, b, z]) => P(x + a, y + b, z)), c);

  // Medidas del local según nivel (el nivel 3 crece de verdad hacia +x)
  const x0 = 0.08, y0 = 0.1, x1 = lvl >= 3 ? 0.88 : 0.78, y1 = 0.66, h = 0.5;

  // Cuerpo, zoclo verde y azotea con pretil
  B(x0, y0, x1, y1, 0, h, WALL);
  winY(x + x0, x + x1, y + y1, 0, 0.06, GREEN);
  winX(x + x1, y + y0, y + y1, 0, 0.06, shade(GREEN, -0.2));
  box(x + x0 - 0.01, y + y0 - 0.01, x + x1 + 0.01, y + y1 + 0.01, h, h + 0.07, '#D6D0C2', GREEN, shade(GREEN, -0.24));

  // Frente: puerta(s) y vitrina(s) con repisas; en el nivel 3 la segunda puerta va en medio,
  // donde no la tapan la hielera ni el refrigerador
  const doorAt = dx => {
    winY(x + dx, x + dx + 0.1, y + y1, 0.06, 0.38, '#1F6E43');
    winY(x + dx + 0.015, x + dx + 0.085, y + y1, 0.06, 0.36, door);
  };
  const vitrine = (vx0, vx1) => {
    winY(x + vx0, x + vx1, y + y1, 0.1, 0.37, glass);
    if (off) return;
    winY(x + vx0 + 0.02, x + vx1 - 0.02, y + y1, 0.15, 0.175, lit ? '#E8A93A' : '#E8892B');
    winY(x + vx0 + 0.02, x + vx1 - 0.02, y + y1, 0.23, 0.255, lit ? '#D9534F' : '#D62828');
  };
  doorAt(x0 + 0.05);
  if (lvl >= 3) { vitrine(x0 + 0.19, 0.49); doorAt(0.53); vitrine(0.67, x1 - 0.05); }
  else vitrine(x0 + 0.19, x1 - 0.05);

  // Ventana lateral y, desde el nivel 2, su toldo a rayas (sale hacia +x)
  const wy0 = y0 + 0.12, wy1 = y1 - 0.14;
  winX(x + x1, y + wy0, y + wy1, 0.16, 0.38, glass);
  if (lvl >= 2) {
    const sd = 0.09, sa = h - 0.05, sb = h - 0.13, ay0 = wy0 - 0.03, ay1 = wy1 + 0.03, sw = (ay1 - ay0) / 3;
    for (let i = 0; i < 3; i++) {
      const a = ay0 + i * sw, b = a + sw, c = i % 2 ? WHITE : GREEN;
      Q([[x1, a, sa], [x1, b, sa], [x1 + sd, b, sb], [x1 + sd, a, sb]], shade(c, -0.04));
      Q([[x1 + sd, a, sb], [x1 + sd, b, sb], [x1 + sd, b, sb - 0.05], [x1 + sd, a, sb - 0.05]], shade(c, -0.24));
    }
    Q([[x1, ay1, sa], [x1 + sd, ay1, sb], [x1 + sd, ay1, sb - 0.05]], shade(GREEN, -0.3));
  }

  // Tinaco y letrero en la azotea (desde el nivel 2, alto y casi tan ancho como el frente)
  cyl(x + x1 - 0.14, y + y0 + 0.11, h + 0.07, h + 0.21, 0.065, '#2F3439', '#4C535B');
  const big = lvl >= 2;
  const sx0 = big ? x0 + 0.05 : x0 + 0.1, sx1 = big ? x1 - 0.1 : sx0 + 0.36, sz = big ? h + 0.3 : h + 0.24;
  const sign = off ? '#C9C2A4' : lit ? '#FFE27A' : '#F2C230';
  const band = off ? '#7E8A80' : '#1F7A47';
  box(x + sx0, y + y1 - 0.06, x + sx1, y + y1 - 0.02, h + 0.07, sz, shade(sign, 0.2), sign, shade(sign, -0.26));
  if (big) {
    winY(x + sx0 + 0.035, x + sx1 - 0.035, y + y1 - 0.02, h + 0.12, sz - 0.05, band);
    winY(x + sx0 + 0.08, x + sx1 - 0.08, y + y1 - 0.02, h + 0.17, sz - 0.1, off ? '#B9C0B8' : lit ? '#FFF6D0' : WHITE);
  } else {
    winY(x + sx0 + 0.04, x + sx1 - 0.04, y + y1 - 0.02, h + 0.135, h + 0.175, band);
  }

  // Nivel 3: refrigerador de refrescos al frente derecho, junto a la esquina (pasa justo a un lado del toldo)
  if (lvl >= 3) {
    box(x + 0.84, y + 0.72, x + 0.95, y + 0.86, 0, 0.34, '#E04848', '#D62828', '#A81F1F');
    winY(x + 0.855, x + 0.935, y + 0.86, 0.05, 0.28, off ? '#5E6670' : lit ? '#FFF1BF' : '#BFE3F2');
  }

  // Toldo a rayas verdes y blancas sobre el frente (más profundo y largo en cada nivel)
  const d = lvl >= 3 ? 0.13 : lvl >= 2 ? 0.12 : 0.1, ta = h - 0.03, tb = h - 0.1, n = lvl >= 3 ? 7 : 5;
  const ax0 = x0 + 0.03, ax1 = x1 - 0.03, w = (ax1 - ax0) / n;
  for (let i = 0; i < n; i++) {
    const a = ax0 + i * w, b = a + w, c = i % 2 ? WHITE : GREEN;
    Q([[a, y1, ta], [b, y1, ta], [b, y1 + d, tb], [a, y1 + d, tb]], shade(c, 0.06));
    Q([[a, y1 + d, tb], [b, y1 + d, tb], [b, y1 + d, tb - 0.05], [a, y1 + d, tb - 0.05]], shade(c, -0.08));
  }
  Q([[ax1, y1, ta], [ax1, y1 + d, tb], [ax1, y1 + d, tb - 0.05]], shade(GREEN, -0.3));

  // Afuera: hielera grande (nivel 2+); en el nivel 3 se recorre a la izquierda del refrigerador
  if (lvl >= 2) {
    const hx0 = lvl >= 3 ? 0.58 : 0.76, hy0 = lvl >= 3 ? 0.8 : 0.76;
    B(hx0, hy0, hx0 + 0.2, hy0 + 0.16, 0, 0.24, '#F4F6F8');
    winY(x + hx0, x + hx0 + 0.2, y + hy0 + 0.16, 0.12, 0.17, '#3D6FB0');
    winX(x + hx0 + 0.2, y + hy0, y + hy0 + 0.16, 0.12, 0.17, shade('#3D6FB0', -0.2));
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
