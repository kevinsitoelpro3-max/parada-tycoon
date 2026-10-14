import { game } from '../../state.js';
import { ctx } from '../../utils.js';
import { P, poly, box, winX, winY, shade, circle, line } from '../iso.js';

/* ---------- Lavado de tráileres ---------- */
// Dibuja el negocio en la casilla (x, y) y devuelve la altura del techo (para poner el ícono encima).
// t.lvl es el nivel (1 a 3) y t.off > 0 significa que está sin luz.
// Túnel de lavado con techo de bóveda azul cielo y boca abierta al frente (+y): adentro se ven los
// cepillos giratorios, la cortina de tiras y la espuma. Piso de concreto mojado con charcos.
// Nivel 2: tanque de agua sobre patas con tubo al túnel. Nivel 3: túnel más ancho con dos carriles.
// Siempre: hidrolavadora con manguera en la esquina del frente.
const SKY = '#1B8FC4', SKY_D = '#13729F', WALL = '#F1F5F8';
// Bóveda: puntos del arco cada 30° (el tramo de 0° a 30° no se ve desde esta vista)
const COS = [1, 0.866, 0.5, 0, -0.5, -0.866, -1], SIN = [0, 0.5, 0.866, 1, 0.866, 0.5, 0];

export default function draw(x, y, t) {
  const lvl = Math.max(1, Math.min(3, t.lvl | 0 || 1));
  const off = t.off > 0, lit = game.dark && !off;
  const Q = (pts, c) => poly(pts.map(([a, b, z = 0]) => P(x + a, y + b, z)), c);
  const flat = (x0, y0, x1, y1, c) => Q([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], c);
  const FY = (a, b, v, z0, z1, c) => winY(x + a, x + b, y + v, z0, z1, c);
  const FX = (u, a, b, z0, z1, c) => winX(x + u, y + a, y + b, z0, z1, c);
  const BX = (x0, y0, x1, y1, z0, z1, top, l, r) => box(x + x0, y + y0, x + x1, y + y1, z0, z1, top, l, r);

  // Medidas del túnel y de sus bocas (carriles)
  const two = lvl >= 3;
  const X0 = two ? 0.06 : 0.12, X1 = two ? 0.76 : 0.6, Y0 = 0.1, Y1 = 0.72;
  const zo = 0.33, H = 0.37;                          // alto de las bocas y arranque de la bóveda
  const cx = (X0 + X1) / 2, rx = (X1 - X0) / 2 + 0.03, rz = two ? 0.26 : 0.22, R = H + rz;
  const lanes = two ? [[0.14, 0.37], [0.45, 0.68]] : [[0.2, 0.52]];

  // Colores del interior según luz
  const inWall = off ? '#5A626C' : lit ? '#F3E2A9' : '#8197A5';
  const inFloor = off ? '#454C55' : lit ? '#D8C17E' : '#5D7685';
  const farEnd = off || game.dark ? '#2E3E49' : '#B9D6E5';
  const glass = off ? '#5E6670' : lit ? '#FFE08A' : '#9CCFE6';
  const puddle = lit ? '#BDE9FA' : '#95BED5';

  // 1) Piso de concreto mojado, carriles brillosos frente a cada boca, charcos y rejilla
  flat(0.04, 0.05, 0.96, 0.96, off ? '#B3BEC5' : '#BED0DA');
  for (const [a, b] of lanes) flat(a - 0.01, Y1, b + 0.01, 0.96, lit ? '#A6DCF2' : '#A3C6D9');
  Q([[0.62, 0.9], [0.7, 0.86], [0.8, 0.89], [0.74, 0.94], [0.64, 0.94]], puddle);
  Q([[0.05, 0.8], [0.1, 0.77], [0.15, 0.82], [0.09, 0.87]], puddle);
  flat(X0 + 0.04, 0.86, (two ? X1 : 0.56) - 0.02, 0.885, '#6E7F8A');

  // 2) Túnel por piezas, de izquierda a derecha: pilar, interior del carril, pilar...
  const pillar = (a, b) => BX(a, Y0, b, Y1, 0, zo, WALL, shade(WALL, -0.06), inWall);
  let px = X0;
  for (const [a, b] of lanes) {
    pillar(px, a);
    flat(a, Y0, b, Y1, inFloor);
    FY(a, b, Y0, 0, zo, farEnd);
    brush(a + 0.075, Y1 - 0.09);
    brush(b - 0.06, Y1 - 0.05);
    // espuma en el piso de la boca
    Q([[a + 0.02, Y1 - 0.02], [a + 0.12, Y1 - 0.05], [a + 0.2, Y1 - 0.01], [a + 0.16, Y1 + 0.05], [a + 0.05, Y1 + 0.05]], off ? '#C9CED3' : '#F4FAFD');
    const [fx, fy] = P(x + a + 0.12, y + Y1 + 0.02, 0);
    circle(fx + 3, fy - 2.5, 1.5, '#FFFFFF'); circle(fx - 4, fy - 1, 1.1, '#FFFFFF');
    curtain(a, b);
    px = b;
  }
  pillar(px, X1);

  // 3) Muro sobre las bocas, zoclo y franja azul, ventanal del costado (+x)
  BX(X0, Y0, X1, Y1, zo, H, WALL, shade(WALL, -0.06), shade(WALL, -0.24));
  FY(X0, X1, Y1, 0, 0.05, SKY);
  FX(X1, Y0, Y1, 0, 0.05, SKY_D);
  FY(X0, X1, Y1, zo, H, SKY_D);
  FX(X1, Y0, Y1, zo, H, shade(SKY_D, -0.2));
  FX(X1, Y0 + 0.08, Y1 - 0.08, 0.12, 0.29, glass);
  if (!off) {
    FX(X1, Y0 + 0.17, Y0 + 0.23, 0.12, 0.29, lit ? '#5CB8E6' : '#3D8FC0');
    FX(X1, Y1 - 0.23, Y1 - 0.17, 0.12, 0.29, lit ? '#5CB8E6' : '#3D8FC0');
  }

  // 4) Bóveda: franjas de techo de izquierda (clara) a derecha (oscura), con alero atrás
  const arc = (i, rr, zz, d = 0) => [cx - (rx + d) * COS[i], 0, H + (rz + zz) * SIN[i]];
  const tone = [0.3, 0.2, 0.06, -0.1, -0.24];
  for (let i = 1; i < 6; i++) {
    const a = arc(i, 0, 0), b = arc(i + 1, 0, 0);
    Q([[a[0], Y0 - 0.03, a[2]], [b[0], Y0 - 0.03, b[2]], [b[0], Y1, b[2]], [a[0], Y1, a[2]]], shade(SKY, tone[i - 1]));
  }
  // nervaduras de la lámina que siguen el arco
  for (const k of [0.33, 0.66]) {
    const v = Y0 + (Y1 - Y0) * k;
    ctx.beginPath();
    for (let i = 1; i < 7; i++) { const a = arc(i, 0, 0), q = P(x + a[0], y + v, a[2]); if (i === 1) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]); }
    ctx.lineWidth = 0.9; ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.stroke();
  }

  // 5) Frontón en arco (blanco) con gota de agua y orilla azul gruesa
  const gable = [];
  for (let i = 0; i < 7; i++) gable.push([cx - (rx - 0.03) * COS[i], Y1, H + (rz - 0.02) * SIN[i]]);
  Q(gable, shade(WALL, -0.06));
  drop(cx, Y1, H + 0.075, 0.75, off ? '#8A939B' : lit ? '#4FC3F7' : SKY);
  const rim = [];
  for (let i = 0; i < 7; i++) rim.push([cx - rx * COS[i], Y1 + 0.004, H + rz * SIN[i]]);
  for (let i = 6; i >= 0; i--) rim.push([cx - (rx - 0.045) * COS[i], Y1 + 0.004, H + (rz - 0.045) * SIN[i]]);
  Q(rim, SKY);

  // 6) Lámparas sobre cada boca
  for (const [a, b] of lanes) {
    const m = (a + b) / 2;
    FY(m - 0.06, m + 0.06, Y1, zo + 0.005, zo + 0.035, off ? '#7D868F' : lit ? '#FFE08A' : '#DDE6EC');
  }

  // 7) Tanque de agua sobre patas (nivel 2+), con tubo al túnel
  if (lvl >= 2) {
    const tx = two ? 0.87 : 0.81, ty = two ? 0.22 : 0.27, tr = two ? 0.075 : 0.1, zl = 0.28;
    BX(X1, ty - 0.015, tx, ty + 0.015, H - 0.05, H - 0.02, '#C3CBD2', '#AAB4BC', '#8E98A1');
    for (const [i, j] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) {
      line(P(x + tx + i * tr, y + ty + j * tr, 0), P(x + tx + i * tr, y + ty + j * tr, zl), 1.6, '#5E6670');
    }
    line(P(x + tx - 0.6 * tr, y + ty + 0.6 * tr, 0.04), P(x + tx + 0.6 * tr, y + ty + 0.6 * tr, zl - 0.04), 1, '#5E6670');
    cyl(tx, ty, zl, zl + 0.3, tr, '#4AA8D8', '#8ED0EE');
    cyl(tx, ty, zl + 0.12, zl + 0.155, tr * 1.03, SKY_D, '#4AA8D8');
    cyl(tx, ty, zl + 0.3, zl + 0.34, tr * 0.35, '#E6EEF3', '#FFFFFF');
  }

  // 8) Hidrolavadora con manguera (esquina del frente)
  const gx = 0.86, gy = 0.8;
  BX(gx - 0.04, gy - 0.035, gx + 0.04, gy + 0.035, 0, 0.26, shade(SKY, 0.14), SKY, SKY_D);
  FY(gx - 0.025, gx + 0.025, gy + 0.035, 0.16, 0.21, off ? '#5E6670' : lit ? '#BFF0C8' : '#E9F4FA');
  const h0 = P(x + gx - 0.04, y + gy, 0.12), h1 = P(x + gx - 0.2, y + gy + 0.16, -0.02), h2 = P(x + gx - 0.02, y + gy + 0.13, 0);
  ctx.beginPath(); ctx.moveTo(h0[0], h0[1]); ctx.quadraticCurveTo(h1[0], h1[1], h2[0], h2[1]);
  ctx.lineWidth = 1.1; ctx.strokeStyle = '#22262B'; ctx.stroke();

  // Luz de noche que sale de las bocas
  if (lit) for (const [a, b] of lanes) flat(a, Y1, b, Y1 + 0.16, 'rgba(255,214,110,.35)');
  return R;

  // Cepillo giratorio: rodillo vertical con anillo amarillo
  function brush(u, v) {
    const c = off ? '#6D7680' : lit ? '#5CC6F2' : '#2FA3DD';
    cyl(u, v, 0.02, zo - 0.03, 0.062, c, shade(c, 0.3));
    cyl(u, v, 0.12, 0.16, 0.064, off ? '#7D868F' : '#F2C230', off ? '#9AA2AA' : '#F7D86A');
  }
  // Cortina de tiras: fondo azul y tiras blancas en un solo trazo
  function curtain(a, b) {
    const v = Y1 - 0.04, z0 = zo - 0.12;
    FY(a + 0.01, b - 0.01, v, z0, zo, off ? '#6D7680' : SKY);
    const n = Math.round((b - a) / 0.08), w = (b - a - 0.02) / (n * 2);
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const u0 = a + 0.01 + w * (2 * i + 1), u1 = u0 + w;
      const p = [P(x + u0, y + v, z0 + 0.02), P(x + u1, y + v, z0 + 0.02), P(x + u1, y + v, zo), P(x + u0, y + v, zo)];
      ctx.moveTo(p[0][0], p[0][1]); for (let k = 1; k < 4; k++) ctx.lineTo(p[k][0], p[k][1]); ctx.closePath();
    }
    ctx.fillStyle = off ? '#9AA2AA' : '#F4FAFD'; ctx.fill();
  }
  // Gota de agua sobre el plano del frente (y = v), centrada en (u, z)
  function drop(u, v, z, k, c) {
    Q([[0, 0.085], [0.045, -0.01], [0.05, -0.04], [0.035, -0.07], [0, -0.085], [-0.035, -0.07], [-0.05, -0.04], [-0.045, -0.01]]
      .map(([du, dz]) => [u + du * k, v, z + dz * k]), c);
  }
  // Cilindro vertical con su lado derecho en sombra
  function cyl(u, v, z0, z1, r, c, top) {
    const [bx, by] = P(x + u, y + v, z0), [tx, ty] = P(x + u, y + v, z1), ex = r * 45.25, ey = r * 22.63;
    ctx.fillStyle = shade(c, -0.04);
    ctx.beginPath(); ctx.ellipse(bx, by, ex, ey, 0, 0, Math.PI); ctx.lineTo(tx - ex, ty); ctx.lineTo(tx + ex, ty); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(c, -0.24);
    ctx.beginPath(); ctx.ellipse(bx, by, ex, ey, 0, 0, Math.PI * 0.4); ctx.lineTo(tx + ex * 0.31, ty); ctx.lineTo(tx + ex, ty); ctx.closePath(); ctx.fill();
    ctx.fillStyle = top;
    ctx.beginPath(); ctx.ellipse(tx, ty, ex, ey, 0, 0, Math.PI * 2); ctx.fill();
  }
}
