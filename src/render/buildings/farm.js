import { game } from '../../state.js';
import { ctx } from '../../utils.js';
import { P, poly, cbox, box, winY, shade } from '../iso.js';

/* ---------- Granja ---------- */
// Surcos de maíz al frente, granero rojo con techo a dos aguas al fondo y silo. El nivel agrega surcos
// y silos; de noche se prende la ventanita del granero.
const RED = '#B23A2E';
export default function draw(x, y, t) {
  const lvl = Math.max(1, Math.min(3, t.lvl | 0 || 1));
  const lit = game.dark && !(t.off > 0);
  const Q = (pts, c) => poly(pts.map(([a, b, z = 0]) => P(x + a, y + b, z)), c);
  Q([[0.04, 0.04, 0.005], [0.96, 0.04, 0.005], [0.96, 0.96, 0.005], [0.04, 0.96, 0.005]], '#9C7B4E');   // tierra
  // surcos con matas de maíz (a lo largo de x)
  const rows = 3 + lvl;
  for (let i = 0; i < rows; i++) {
    const v = 0.5 + i * (0.42 / rows);
    Q([[0.08, v, 0.01], [0.92, v, 0.01], [0.92, v + 0.035, 0.01], [0.08, v + 0.035, 0.01]], '#6E5634');
    for (let u = 0.12; u < 0.9; u += 0.11) cbox(x + u, y + v + 0.005, x + u + 0.03, y + v + 0.03, 0.01, 0.1 + 0.02 * ((i + Math.round(u * 10)) % 2), '#7DAF3A', '#E3C04B');
  }
  // granero
  const x0 = 0.1, y0 = 0.08, x1 = 0.56, y1 = 0.42, h = 0.36;
  box(x + x0, y + y0, x + x1, y + y1, 0, h, shade(RED, 0.15), RED, shade(RED, -0.25));
  winY(x + 0.25, x + 0.41, y + y1, 0, 0.24, '#F4EDE0');
  winY(x + 0.27, x + 0.39, y + y1, 0.02, 0.22, shade(RED, -0.15));
  winY(x + 0.3, x + 0.36, y + y1, 0.27, 0.33, lit ? '#FFE08A' : '#F4EDE0');
  const ym = (y0 + y1) / 2, rz = h + 0.18;
  Q([[x0 - 0.03, y0 - 0.03, h], [x1 + 0.03, y0 - 0.03, h], [x1 + 0.03, ym, rz], [x0 - 0.03, ym, rz]], '#5B5F66');
  Q([[x0 - 0.03, ym, rz], [x1 + 0.03, ym, rz], [x1 + 0.03, y1 + 0.03, h], [x0 - 0.03, y1 + 0.03, h]], '#70757D');
  Q([[x1 + 0.03, y0 - 0.03, h], [x1 + 0.03, y1 + 0.03, h], [x1 + 0.03, ym, rz]], shade(RED, -0.3));
  // silos
  for (let i = 0; i < Math.min(lvl, 2); i++) silo(x + 0.72 + i * 0.14 - (lvl > 1 ? 0.07 : 0), y + 0.22 - i * 0.05, 0.62 + i * 0.08);
  return rz;
}
function silo(cx, cy, top) {
  const [bx, by] = P(cx, cy, 0), [tx, ty] = P(cx, cy, top), rx = 0.075 * 45.3, ry = 0.075 * 22.6;
  ctx.fillStyle = '#C9CED6';
  ctx.beginPath(); ctx.ellipse(bx, by, rx, ry, 0, 0, Math.PI); ctx.lineTo(tx - rx, ty); ctx.lineTo(tx + rx, ty); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#E4E7EC'; ctx.beginPath(); ctx.ellipse(tx, ty, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8D949E'; ctx.beginPath(); ctx.ellipse(tx, ty - ry * 0.6, rx * 0.7, ry * 0.7, 0, Math.PI, Math.PI * 2); ctx.fill();
}
