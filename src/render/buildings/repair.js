import { game } from '../../state.js';
import { ctx } from '../../utils.js';
import { P, poly, box, winX, winY, shade, line } from '../iso.js';

/* ---------- Taller mecánico ---------- */
// Dibuja el negocio en la casilla (x, y) y devuelve la altura del techo (para poner el ícono encima).
// t.lvl es el nivel (1 a 3) y t.off > 0 significa que está sin luz.
// Nave de lámina gris a dos aguas con el frontón al frente (+y): cortina enrollable a medio subir,
// marco amarillo, franja de seguridad en el piso y un engrane en el frontón. Afuera, llantas
// apiladas. Nivel 1: caja de herramientas y tambos de aceite. Nivel 2: rampa amarilla para subir
// tráileres y tragaluces. Nivel 3: nave más alta, extractor en el techo y grúa de pluma con un motor.
const GRAY = '#6B7280', WALL = '#C3C8CF', YEL = '#F2C230', INK = '#22262B';

export default function draw(x, y, t) {
  const lvl = Math.max(1, Math.min(3, t.lvl | 0 || 1));
  const off = t.off > 0, lit = game.dark && !off;
  const Q = (pts, c) => poly(pts.map(([a, b, z = 0]) => P(x + a, y + b, z)), c);
  const flat = (x0, y0, x1, y1, c) => Q([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], c);
  const FY = (a, b, v, z0, z1, c) => winY(x + a, x + b, y + v, z0, z1, c);
  const FX = (u, a, b, z0, z1, c) => winX(x + u, y + a, y + b, z0, z1, c);
  const BX = (x0, y0, x1, y1, z0, z1, top, l, r) => box(x + x0, y + y0, x + x1, y + y1, z0, z1, top, l, r);
  const CB = (x0, y0, x1, y1, z0, z1, c) => BX(x0, y0, x1, y1, z0, z1, shade(c, 0.16), shade(c, -0.06), shade(c, -0.26));
  // Varias tiras en un solo trazo: cada tira es una lista de puntos [u, v, z]
  const multi = (shapes, c) => {
    ctx.beginPath();
    for (const s of shapes) s.forEach(([a, b, z], i) => { const p = P(x + a, y + b, z); if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
    ctx.fillStyle = c; ctx.fill();
  };

  // Medidas de la nave
  const big = lvl >= 3;
  const X0 = 0.08, X1 = 0.62, Y0 = 0.1, Y1 = 0.68;
  const h = big ? 0.44 : 0.4, rz = h + 0.21, xm = (X0 + X1) / 2, e = 0.035;
  const ze = h - (rz - h) / (xm - X0) * e;                 // altura del alero
  const dx0 = X0 + 0.07, dx1 = X1 - 0.07, dz = 0.32;      // vano de la cortina
  const half = 0.15;                                       // hasta dónde está subida la cortina
  const inside = off ? '#2A2E33' : lit ? '#FFD98A' : '#363B43';
  const glass = off ? '#5E6670' : lit ? '#FFE08A' : '#9FC3D6';

  // 1) Patio de concreto, mancha de aceite y franja de seguridad frente a la cortina
  flat(0.03, 0.04, 0.97, 0.97, '#BDB9AF');
  ctx.beginPath();
  const [ox, oy] = P(x + 0.47, y + 0.87, 0);
  ctx.ellipse(ox, oy, 4, 1.7, 0, 0, Math.PI * 2); ctx.ellipse(ox + 3.5, oy + 1.2, 2.2, 1, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(30,32,40,.2)'; ctx.fill();
  if (lit) flat(dx0, Y1, dx1, Y1 + 0.18, 'rgba(255,214,110,.4)');
  const sy0 = Y1 + 0.03, sy1 = Y1 + 0.08;
  flat(dx0, sy0, dx1, sy1, YEL);
  const st = [];
  for (let u = dx0 + 0.01; u < dx1 - 0.03; u += 0.07) st.push([[u, sy1], [u + 0.035, sy1], [u + 0.065, sy0], [u + 0.03, sy0]]);
  multi(st, INK);

  // 2) Nave: muros de lámina, frontón y vano de la cortina
  // (el techo de la caja queda bajo el de lámina: solo frente, costado y frontón)
  Q([[X0, Y1, 0], [X1, Y1, 0], [X1, Y1, h], [xm, Y1, rz], [X0, Y1, h]], shade(WALL, -0.04));
  Q([[X1, Y0, 0], [X1, Y1, 0], [X1, Y1, h], [X1, Y0, h]], shade(WALL, -0.24));
  // zoclo oscuro y estrías verticales de la lámina en el costado
  FY(X0, X1, Y1, 0, 0.04, shade(GRAY, -0.2));
  FX(X1, Y0, Y1, 0, 0.04, shade(GRAY, -0.38));
  const rib = [];
  for (let v = Y0 + 0.06; v < Y1 - 0.02; v += 0.07) rib.push([[X1 + 0.003, v, 0.04], [X1 + 0.003, v + 0.012, 0.04], [X1 + 0.003, v + 0.012, h], [X1 + 0.003, v, h]]);
  multi(rib, shade(WALL, -0.32));
  // ventanas del costado (de noche encendidas)
  multi([[[X1 + 0.004, Y0 + 0.08, 0.2], [X1 + 0.004, Y0 + 0.24, 0.2], [X1 + 0.004, Y0 + 0.24, 0.32], [X1 + 0.004, Y0 + 0.08, 0.32]],
         [[X1 + 0.004, Y0 + 0.32, 0.2], [X1 + 0.004, Y0 + 0.48, 0.2], [X1 + 0.004, Y0 + 0.48, 0.32], [X1 + 0.004, Y0 + 0.32, 0.32]]], glass);
  // vano: interior con carro de herramientas rojo, cortina a medio subir con su barra de seguridad
  FY(dx0, dx1, Y1, 0, dz, inside);
  FY(dx0 + 0.03, dx0 + 0.12, Y1, 0, 0.12, off ? '#6E3030' : '#D62828');
  FY(dx0 + 0.04, dx0 + 0.11, Y1, 0.075, 0.085, off ? '#8A5A5A' : '#F2B8B8');
  FY(dx0, dx1, Y1, half, dz, '#9AA1AA');
  const sl = [];
  for (let z = half + 0.035; z < dz - 0.01; z += 0.04) sl.push([[dx0, Y1, z], [dx1, Y1, z], [dx1, Y1, z + 0.012], [dx0, Y1, z + 0.012]]);
  multi(sl, '#7C838D');
  FY(dx0, dx1, Y1, half, half + 0.03, YEL);
  const bar = [];
  for (let u = dx0 + 0.02; u < dx1 - 0.02; u += 0.06) bar.push([[u, Y1, half], [u + 0.025, Y1, half], [u + 0.04, Y1, half + 0.03], [u + 0.015, Y1, half + 0.03]]);
  multi(bar, INK);
  // marco amarillo y caja de la cortina
  multi([
    [[dx0 - 0.03, Y1, 0], [dx0, Y1, 0], [dx0, Y1, dz], [dx0 - 0.03, Y1, dz]],
    [[dx1, Y1, 0], [dx1 + 0.03, Y1, 0], [dx1 + 0.03, Y1, dz], [dx1, Y1, dz]]
  ], YEL);
  BX(dx0 - 0.03, Y1 - 0.01, dx1 + 0.03, Y1 + 0.03, dz, dz + 0.05, '#8E959E', '#7C838D', '#5F666F');
  // lámpara sobre la cortina
  BX(xm - 0.035, Y1, xm + 0.035, Y1 + 0.035, dz + 0.065, dz + 0.09, '#4B5563', off ? '#5E6670' : lit ? '#FFF3C4' : '#D9DDE2', '#3A414C');

  // 4) Techo a dos aguas de lámina, con estrías, tragaluces (nivel 2+) y orillas
  const RL = shade(GRAY, 0.18), RR = shade(GRAY, -0.2);
  Q([[X0 - e, Y0 - e, ze], [xm, Y0 - e, rz], [xm, Y1 + e, rz], [X0 - e, Y1 + e, ze]], RL);
  Q([[xm, Y0 - e, rz], [X1 + e, Y0 - e, ze], [X1 + e, Y1 + e, ze], [xm, Y1 + e, rz]], RR);
  const zAt = u => u < xm ? ze + (rz - ze) * (u - X0 + e) / (xm - X0 + e) : rz - (rz - ze) * (u - xm) / (X1 + e - xm);
  if (lvl >= 2) {
    const sk = off ? '#7D8792' : lit ? '#FFE9A8' : '#A9D4E6';
    const ua = X0 + 0.04, ub = xm - 0.04;
    multi([[Y0 + 0.06, Y0 + 0.2], [Y0 + 0.32, Y0 + 0.46]].map(([v0, v1]) =>
      [[ua, v0, zAt(ua)], [ub, v0, zAt(ub)], [ub, v1, zAt(ub)], [ua, v1, zAt(ua)]]), sk);
  }
  const rr = [];
  for (let v = Y0 + 0.02; v < Y1; v += 0.09) {
    rr.push([[xm, v, rz], [X1 + e, v, ze], [X1 + e, v + 0.012, ze], [xm, v + 0.012, rz]]);
  }
  multi(rr, shade(GRAY, -0.3));
  Q([[X0 - e, Y1 + e, ze], [xm, Y1 + e, rz], [X1 + e, Y1 + e, ze], [X1 + e, Y1 + e, ze - 0.04], [xm, Y1 + e, rz - 0.04], [X0 - e, Y1 + e, ze - 0.04]], shade(GRAY, -0.08));
  Q([[X1 + e, Y0 - e, ze], [X1 + e, Y1 + e, ze], [X1 + e, Y1 + e, ze - 0.04], [X1 + e, Y0 - e, ze - 0.04]], shade(GRAY, -0.4));
  // letrero redondo con engrane, colgado al frente del frontón
  gear(xm, Y1 + e + 0.006, h + 0.075, 0.062, off ? '#A89A6A' : lit ? '#FFD84A' : YEL);
  // extractor de aire en la cumbrera (nivel 3)
  if (big) {
    cyl(xm, Y0 + 0.12, rz - 0.03, rz + 0.09, 0.05, '#A7AEB7', '#C9CED4', true);
  }

  // 5) Afuera, a la derecha: tambos y caja (nivel 1) o rampa (nivel 2+); grúa con motor (nivel 3)
  if (big) {
    // poste de la grúa (su punta queda bajo la pluma)
    FY(0.84, 0.885, 0.175, 0, 0.74, shade(YEL, -0.06));
    FX(0.885, 0.13, 0.175, 0, 0.74, shade(YEL, -0.26));
    FY(0.84, 0.885, 0.175, 0, 0.06, INK);
  } else {
    cyl(0.86, 0.19, 0, 0.2, 0.055, '#3D6FB0', '#6F95C8', true);
    if (lvl < 2) cyl(0.76, 0.27, 0, 0.2, 0.055, '#D62828', '#E86A6A', true);
  }
  if (lvl >= 2) {
    ramps([[0.7, 0.77], [0.86, 0.93]]);
  } else {
    CB(0.72, 0.44, 0.84, 0.56, 0, 0.26, '#D62828');                // caja de herramientas
    multi([[[0.72, 0.56, 0.08], [0.84, 0.56, 0.08], [0.84, 0.56, 0.095], [0.72, 0.56, 0.095]],
           [[0.72, 0.56, 0.16], [0.84, 0.56, 0.16], [0.84, 0.56, 0.175], [0.72, 0.56, 0.175]]], '#8E1B1B');
  }
  if (big) {
    CB(0.84, 0.13, 0.885, 0.62, 0.74, 0.79, YEL);                   // pluma
    line(P(x + 0.862, y + 0.175, 0.56), P(x + 0.862, y + 0.36, 0.74), 1.6, '#C99A1E');
    line(P(x + 0.862, y + 0.56, 0.74), P(x + 0.862, y + 0.56, 0.38), 1, INK);
    CB(0.82, 0.51, 0.905, 0.61, 0.25, 0.37, '#4B5563');             // motor colgando
    FY(0.835, 0.89, 0.61, 0.29, 0.31, '#9AA1AA');
  }

  // 6) Llantas apiladas (al frente a la izquierda); en nivel 2+ dos pilas
  tires(0.12, 0.85, lvl >= 2 ? 4 : 3);
  if (lvl >= 2) tires(0.24, 0.92, 2);
  return big ? rz + 0.1 : rz;

  // Rampa de dos rieles: plataforma atrás y tramo inclinado al frente, amarilla con orilla negra
  function ramps(rails) {
    const zt = 0.13, ya = 0.3, yb = 0.62, yc = 0.88;
    for (const [r0, r1] of rails) {
      Q([[r0, ya, zt], [r1, ya, zt], [r1, yb, zt], [r0, yb, zt]], shade(YEL, 0.16));
      Q([[r0, yb, zt], [r1, yb, zt], [r1, yc, 0], [r0, yc, 0]], shade(YEL, 0.04));
      Q([[r1, ya, 0], [r1, yc, 0], [r1, yb, zt], [r1, ya, zt]], shade(YEL, -0.28));
      FX(r1, ya, yb + 0.06, 0, 0.035, INK);
    }
  }
  // Pila de llantas: cilindro negro con ranuras y hoyo arriba
  function tires(u, v, n) {
    const r = 0.068, th = 0.055, z1 = n * th;
    cyl(u, v, 0, z1, r, '#2E3238', '#4A4F57', false);
    const [bx, by] = P(x + u, y + v, 0), ex = r * 45.25, ey = r * 22.63;
    ctx.beginPath();
    for (let i = 1; i < n; i++) { const yy = by - i * th * 30; ctx.moveTo(bx - ex, yy); ctx.ellipse(bx, yy, ex, ey, 0, Math.PI, 0, true); }
    ctx.lineWidth = 0.8; ctx.strokeStyle = '#15171B'; ctx.stroke();
    const [tx, ty] = P(x + u, y + v, z1);
    ctx.beginPath(); ctx.ellipse(tx, ty, ex * 0.5, ey * 0.5, 0, 0, Math.PI * 2); ctx.fillStyle = '#15171B'; ctx.fill();
  }
  // Engrane dibujado sobre el plano del frente (y = v): 8 dientes y hoyo al centro
  function gear(u, v, z, r, c) {
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      for (const [da, rr] of [[-0.24, 0.72], [-0.15, 1], [0.15, 1], [0.24, 0.72]]) pts.push([u + Math.cos(a + da) * r * rr, v, z + Math.sin(a + da) * r * rr]);
    }
    Q(pts, c);
    const hole = [];
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; hole.push([u + Math.cos(a) * r * 0.36, v, z + Math.sin(a) * r * 0.36]); }
    Q(hole, INK);
  }
  // Cilindro vertical: cuerpo, (opcional) lado derecho en sombra y tapa
  function cyl(u, v, z0, z1, r, c, top, shadow) {
    const [bx, by] = P(x + u, y + v, z0), [tx, ty] = P(x + u, y + v, z1), ex = r * 45.25, ey = r * 22.63;
    ctx.fillStyle = shade(c, -0.04);
    ctx.beginPath(); ctx.ellipse(bx, by, ex, ey, 0, 0, Math.PI); ctx.lineTo(tx - ex, ty); ctx.lineTo(tx + ex, ty); ctx.closePath(); ctx.fill();
    if (shadow) {
      ctx.fillStyle = shade(c, -0.24);
      ctx.beginPath(); ctx.ellipse(bx, by, ex, ey, 0, 0, Math.PI * 0.4); ctx.lineTo(tx + ex * 0.31, ty); ctx.lineTo(tx + ex, ty); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = top;
    ctx.beginPath(); ctx.ellipse(tx, ty, ex, ey, 0, 0, Math.PI * 2); ctx.fill();
  }
}
