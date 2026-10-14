import { game } from '../../state.js';
import { P, poly, box, cbox, winX, winY, shade, circle } from '../iso.js';

/* ---------- Comedor ---------- */
// Fonda de carretera: paredes naranjas, techo de teja a dos aguas, toldo a rayas y letrero en el techo.
// Nivel 2 agrega una terraza al frente con mesas y sombrillas; nivel 3, un ala más y otra mesa.
// Dibuja el negocio en la casilla (x, y) y devuelve la altura del techo (para poner el ícono encima).
// t.lvl es el nivel (1 a 3) y t.off > 0 significa que está sin luz.

const WALL = '#EE9438';   // naranja de identidad (KINDS.food)
const ROOF = '#B4462E';   // teja
const TRIM = '#FFF3E0';   // marcos y toldo
const RED = '#D62828';
const WOOD = '#6B3B22';

// Mesa con sombrilla (centro u, v en la casilla); la sombrilla es una pirámide baja sombreada como las cajas
function table(x, y, u, v, c) {
  const r = 0.11, z = 0.28;
  box(x + u - 0.05, y + v - 0.05, x + u + 0.05, y + v + 0.05, 0.11, 0.14, '#FFFFFF', '#D8D2C6', '#B9B2A4');
  box(x + u - 0.012, y + v - 0.012, x + u + 0.012, y + v + 0.012, 0.14, z, '#8A8F98', '#8A8F98', '#6E737B');
  const A = P(x + u - r, y + v - r, z), B = P(x + u + r, y + v - r, z);
  const C = P(x + u + r, y + v + r, z), D = P(x + u - r, y + v + r, z), E = P(x + u, y + v, z + 0.12);
  poly([A, B, C, D], shade(c, 0.22));
  poly([D, C, E], c);
  poly([B, C, E], shade(c, -0.24));
  box(x + u - 0.012, y + v - 0.012, x + u + 0.012, y + v + 0.012, z + 0.11, z + 0.15, '#FFFFFF', '#E6E1D8', '#C9C3B8');
}

export default function draw(x, y, t) {
  const lvl = t.lvl || 1, off = t.off > 0, night = game.dark && !off;
  const glass = off ? '#5E6670' : night ? '#FFD27A' : '#A6D6EA';
  const X = u => x + u, Y = v => y + v;

  // Medidas del cuerpo principal
  const u0 = 0.12, u1 = 0.7, v0 = 0.14, v1 = 0.58, h = 0.4;
  const rv = 0.36, rz = 0.64;                 // cumbrera
  const slope = (rz - h) / (v1 - rv);
  const ze = h - slope * 0.05, zb = h - slope * 0.04;

  // Terraza al frente (nivel 2+): piso de loseta
  if (lvl >= 2) {
    poly([P(X(0.08), Y(0.68)), P(X(lvl >= 3 ? 0.96 : 0.82), Y(0.68)), P(X(lvl >= 3 ? 0.96 : 0.82), Y(0.96)), P(X(0.08), Y(0.96))], '#E2C9A4');
  }

  // Paredes
  cbox(X(u0), Y(v0), X(u1), Y(v1), 0, h, WALL);
  // zoclo oscuro
  winY(X(u0), X(u1), Y(v1), 0, 0.05, shade(WALL, -0.38));
  winX(X(u1), Y(v0), Y(v1), 0, 0.05, shade(WALL, -0.5));
  // Puerta y ventanal al frente (+y)
  winY(X(0.16), X(0.29), Y(v1), 0, 0.3, TRIM);
  winY(X(0.175), X(0.275), Y(v1), 0, 0.28, off ? '#4A3A30' : night ? '#E9A94F' : WOOD);
  winY(X(0.33), X(0.66), Y(v1), 0.1, 0.32, TRIM);
  winY(X(0.345), X(0.645), Y(v1), 0.115, 0.305, glass);
  winY(X(0.49), X(0.5), Y(v1), 0.115, 0.305, TRIM);
  // Ventana del costado (+x)
  winX(X(u1), Y(0.2), Y(0.52), 0.1, 0.32, TRIM);
  winX(X(u1), Y(0.215), Y(0.505), 0.115, 0.305, glass);

  // Techo de teja a dos aguas (cumbrera a lo largo de x)
  const ra = X(u0 - 0.03), rb = X(u1 + 0.03);
  poly([P(ra, Y(v0 - 0.04), zb), P(rb, Y(v0 - 0.04), zb), P(rb, Y(rv), rz), P(ra, Y(rv), rz)], shade(ROOF, -0.22));
  // chimenea del comal
  cbox(X(0.48), Y(0.2), X(0.58), Y(0.3), 0.45, 0.84, '#A35A3F');
  poly([P(X(0.495), Y(0.215), 0.84), P(X(0.565), Y(0.215), 0.84), P(X(0.565), Y(0.285), 0.84), P(X(0.495), Y(0.285), 0.84)], '#3A2A25');
  // agua del frente con dos hileras de teja
  poly([P(ra, Y(rv), rz), P(rb, Y(rv), rz), P(rb, Y(v1 + 0.05), ze), P(ra, Y(v1 + 0.05), ze)], ROOF);
  const row = (k, c) => {
    const va = rv + (v1 + 0.05 - rv) * k, vb = va + 0.035;
    poly([P(ra, Y(va), rz - slope * (va - rv)), P(rb, Y(va), rz - slope * (va - rv)),
          P(rb, Y(vb), rz - slope * (vb - rv)), P(ra, Y(vb), rz - slope * (vb - rv))], c);
  };
  row(0.36, shade(ROOF, -0.14));
  row(0.7, shade(ROOF, -0.14));
  // hastial (+x) y borde del techo
  poly([P(X(u1), Y(v0), h), P(X(u1), Y(v1), h), P(X(u1), Y(rv), rz)], shade(WALL, -0.3));
  poly([P(rb, Y(v0 - 0.04), zb), P(rb, Y(rv), rz), P(rb, Y(v1 + 0.05), ze),
        P(rb, Y(v1 + 0.05), ze - 0.045), P(rb, Y(rv), rz - 0.045), P(rb, Y(v0 - 0.04), zb - 0.045)], shade(ROOF, -0.42));
  poly([P(ra, Y(v1 + 0.05), ze), P(rb, Y(v1 + 0.05), ze), P(rb, Y(v1 + 0.05), ze - 0.045), P(ra, Y(v1 + 0.05), ze - 0.045)], shade(ROOF, -0.3));

  // Letrero sobre la cumbrera: tablero rojo con un plato al centro
  const sz0 = rz - 0.04, sz1 = rz + 0.24;
  box(X(0.2), Y(rv - 0.02), X(0.5), Y(rv + 0.02), sz0, sz1, shade(RED, -0.2), RED, shade(RED, -0.3));
  winY(X(0.22), X(0.48), Y(rv + 0.02), sz0 + 0.03, sz1 - 0.03, off ? '#B9A97A' : night ? '#FFE680' : '#F2C230');
  // plato con comida al centro
  const [px, py] = P(X(0.35), Y(rv + 0.02), (sz0 + sz1) / 2);
  circle(px, py, 2.9, off ? '#D9D3C3' : '#FFFFFF');
  circle(px, py, 1.6, off ? '#B59A6A' : '#E8892B');

  // Toldo a rayas sobre el ventanal (frente)
  const az0 = 0.37, az1 = 0.29, av = v1 + 0.12;
  poly([P(X(0.15), Y(v1), az0), P(X(0.68), Y(v1), az0), P(X(0.68), Y(av), az1), P(X(0.15), Y(av), az1)], TRIM);
  for (let i = 0; i < 4; i++) {
    const a = 0.15 + i * 0.1325 + 0.033, b = a + 0.066;
    poly([P(X(a), Y(v1), az0), P(X(b), Y(v1), az0), P(X(b), Y(av), az1), P(X(a), Y(av), az1)], RED);
  }
  box(X(0.15), Y(av - 0.005), X(0.68), Y(av), az1 - 0.05, az1, RED, RED, shade(RED, -0.3));

  // Ala lateral (nivel 3): comedor extra con techo plano y ventanal
  if (lvl >= 3) {
    cbox(X(0.73), Y(0.22), X(0.95), Y(0.62), 0, 0.32, WALL, shade(ROOF, -0.05));
    poly([P(X(0.75), Y(0.24), 0.32), P(X(0.93), Y(0.24), 0.32), P(X(0.93), Y(0.6), 0.32), P(X(0.75), Y(0.6), 0.32)], shade(ROOF, 0.12));
    winY(X(0.76), X(0.92), Y(0.62), 0.09, 0.25, TRIM);
    winY(X(0.775), X(0.905), Y(0.62), 0.105, 0.235, glass);
    winX(X(0.95), Y(0.27), Y(0.57), 0.09, 0.25, TRIM);
    winX(X(0.95), Y(0.285), Y(0.555), 0.105, 0.235, glass);
    // toldito del ala
    box(X(0.95), Y(0.25), X(0.98), Y(0.59), 0.25, 0.29, TRIM, RED, shade(RED, -0.3));
  }

  // Frente: macetas (nivel 1) o terraza con mesas y sombrillas (nivel 2+)
  if (lvl >= 2) {
    box(X(0.08), Y(0.93), X(lvl >= 3 ? 0.96 : 0.82), Y(0.96), 0, 0.07, '#5E9E4A', '#4C8A3B', '#3B6E2E');
    const spots = lvl >= 3 ? [[0.22, 0.81], [0.5, 0.81], [0.79, 0.8]] : [[0.25, 0.81], [0.57, 0.81]];
    spots.forEach(([u, v], i) => table(x, y, u, v, i % 2 ? '#F2C230' : RED));
  } else {
    cbox(X(0.34), Y(0.66), X(0.44), Y(0.74), 0, 0.07, '#9C5B3B');
    poly([P(X(0.35), Y(0.67), 0.07), P(X(0.43), Y(0.67), 0.07), P(X(0.43), Y(0.73), 0.07), P(X(0.35), Y(0.73), 0.07)], '#4E9A3E');
    cbox(X(0.56), Y(0.66), X(0.66), Y(0.74), 0, 0.07, '#9C5B3B');
    poly([P(X(0.57), Y(0.67), 0.07), P(X(0.65), Y(0.67), 0.07), P(X(0.65), Y(0.73), 0.07), P(X(0.57), Y(0.73), 0.07)], '#4E9A3E');
  }
  return sz1;
}
