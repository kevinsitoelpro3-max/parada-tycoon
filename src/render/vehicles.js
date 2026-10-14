import { clamp, ctx } from '../utils.js';
import { game } from '../state.js';
import { P, poly, cbox, shade, circle } from './iso.js';

/* ---------- Tráileres ---------- */
// Tractocamión de cofre largo con caja seca. Se dibuja en coordenadas locales:
//   a = a lo largo del tráiler (positivo hacia el frente; va de -0.4 a 0.34),
//   b = de lado (positivo hacia el costado que se ve: +y si va en x, +x si va en y),
//   z = altura.
const HW = 0.12;                    // medio ancho de la caja y la cabina (con llantas, ~0.26)
const CHASSIS = '#2A2D33', TIRE = '#1C1F24', HUB = '#9AA1AA', CHROME = '#C9CED6';
const GLASS = '#1F2C38', GLASS_SIDE = '#2C3D4C', GRILLE = '#30343B';
const WHEELS = [-0.33, -0.2, 0.005, 0.25], WR = 0.058;   // centros de las llantas y su radio
const RIM = Array.from({ length: 10 }, (_, k) => [Math.cos((k + 0.5) * Math.PI / 5), Math.sin((k + 0.5) * Math.PI / 5)]);
const STRIPE_LIGHT = '#F4F4F2', STRIPE_DARK = '#2A2D33';

// Luminancia de un color #RRGGBB en la escala 0–255
const luma = hex => {
  const n = parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255);
};
// Color de la franja de la caja: el de la cabina, salvo que casi no contraste con la caja;
// entonces una franja clara sobre caja oscura u oscura sobre caja clara (sin azar)
const stripeCache = {};
function stripeColor(cab, trl) {
  const key = cab + trl;
  if (stripeCache[key]) return stripeCache[key];
  const lt = luma(trl);
  const c = Math.abs(luma(cab) - lt) < 40 ? (lt < 128 ? STRIPE_LIGHT : STRIPE_DARK) : cab;
  return (stripeCache[key] = c);
}

export function drawTruck(tr) {
  const d = tr.dir, cx = tr.x + tr.ox, cy = tr.y + tr.oy;
  const ax = d[0] !== 0;                      // va a lo largo de x
  const sg = ax ? d[0] : d[1];                // sentido sobre ese eje
  const front = sg > 0;                       // se ve el frente (si no, se ve la parte trasera)
  const night = game.dark, cab = tr.cab, trl = tr.trailer;
  const stripe = stripeColor(cab, trl);       // franja de la caja
  const fF = ax ? -0.26 : -0.06;              // sombra de las caras frontal y trasera
  const sF = ax ? -0.06 : -0.26;              // sombra del costado visible

  // De local a pantalla
  const W = ax ? (a, b, z) => P(cx + sg * a, cy + b, z) : (a, b, z) => P(cx + b, cy + sg * a, z);
  const lbox = (a0, a1, b0, b1, z0, z1, c) => {
    const p = cx + sg * a0, q = cx + sg * a1, u = cy + sg * a0, v = cy + sg * a1;
    if (ax) cbox(Math.min(p, q), cy + b0, Math.max(p, q), cy + b1, z0, z1, c);
    else cbox(cx + b0, Math.min(u, v), cx + b1, Math.max(u, v), z0, z1, c);
  };
  // Rectángulo pegado a una cara frontal o trasera (plano a = constante)
  const face = (a, b0, b1, z0, z1, c) => {
    const e = a + (a > 0 ? 0.004 : -0.004);
    poly([W(e, b0, z0), W(e, b1, z0), W(e, b1, z1), W(e, b0, z1)], c);
  };
  // Rectángulo pegado al costado visible (plano b = constante)
  const side = (a0, a1, z0, z1, c, b = HW) => {
    const e = b + 0.004;
    poly([W(a0, e, z0), W(a1, e, z0), W(a1, e, z1), W(a0, e, z1)], c);
  };

  // Sombra en el piso (la luz viene de arriba a la izquierda)
  poly([W(-0.4, -0.13, 0), W(0.34, -0.13, 0), W(0.34, 0.13, 0), W(-0.4, 0.13, 0)].map(([x, y]) => [x + 2.5, y + 2.2]),
    'rgba(0,0,0,.22)');
  // De noche, los faros alumbran el piso de enfrente mientras va andando. Solo cuando se ve el
  // frente (+x o +y): así el cono cae en casillas que se dibujan después y los faros están a la vista.
  // Con 'lighter' aclara el piso en vez de teñirlo.
  if (night && front && tr.state !== 'service') {
    ctx.globalCompositeOperation = 'lighter';
    poly([W(0.33, -0.1, 0), W(0.33, 0.1, 0), W(0.62, 0.16, 0), W(0.62, -0.16, 0)], 'rgba(255,220,150,.12)');
    poly([W(0.33, -0.08, 0), W(0.33, 0.08, 0), W(0.48, 0.11, 0), W(0.48, -0.11, 0)], 'rgba(255,220,150,.16)');
    ctx.globalCompositeOperation = 'source-over';
  }
  // Chasis oscuro por debajo de todo
  lbox(-0.37, 0.32, -0.095, 0.095, 0.04, 0.12, CHASSIS);

  // --- Caja (remolque) ---
  const trailer = () => {
    lbox(-0.4, 0.04, -HW, HW, 0.12, 0.54, trl);
    side(-0.385, 0.025, 0.2, 0.27, shade(stripe, sF));            // franja (color de la cabina si contrasta)
    side(-0.385, 0.025, 0.47, 0.49, shade(trl, sF - 0.12));        // ceja del techo
    const amb = night ? '#FFC24A' : '#E8892B';                      // plafones laterales
    side(-0.36, -0.335, 0.135, 0.16, amb);
    side(-0.02, 0.005, 0.135, 0.16, amb);
    if (!front) {
      // Puertas traseras: franja, junta central, manijas, defensa y calaveras
      face(-0.4, -HW, HW, 0.2, 0.27, shade(stripe, fF));
      face(-0.4, -0.005, 0.005, 0.14, 0.52, shade(trl, fF - 0.3));
      face(-0.4, -0.045, -0.03, 0.15, 0.4, shade(trl, fF - 0.2));
      face(-0.4, 0.03, 0.045, 0.15, 0.4, shade(trl, fF - 0.2));
      face(-0.4, -HW + 0.01, HW - 0.01, 0.075, 0.11, CHASSIS);
      const tail = night ? '#FF5A47' : '#B3261E';
      face(-0.4, -HW + 0.012, -HW + 0.05, 0.135, 0.175, tail);
      face(-0.4, HW - 0.05, HW - 0.012, 0.135, 0.175, tail);
      if (night) {
        const g1 = W(-0.405, -HW + 0.031, 0.155), g2 = W(-0.405, HW - 0.031, 0.155);
        circle(g1[0], g1[1], 1.5, 'rgba(255,80,60,.4)');
        circle(g2[0], g2[1], 1.5, 'rgba(255,80,60,.4)');
      }
      const mk = night ? '#FF7A5C' : '#C0392B';
      face(-0.4, -0.06, -0.035, 0.505, 0.525, mk);
      face(-0.4, 0.035, 0.06, 0.505, 0.525, mk);
    }
  };

  // --- Tractor: escapes, cabina, cofre y defensa ---
  const stacks = () => {
    lbox(0.052, 0.074, HW - 0.028, HW - 0.004, 0.3, 0.62, CHROME);
    lbox(0.052, 0.074, -HW + 0.004, -HW + 0.028, 0.3, 0.62, CHROME);
  };
  const cabin = () => {
    lbox(0.08, 0.235, -HW, HW, 0.12, 0.48, cab);
    side(0.145, 0.222, 0.31, 0.43, night ? '#3C4E5E' : GLASS_SIDE);  // ventanilla
    side(0.09, 0.13, 0.17, 0.19, shade(cab, sF - 0.2));               // manija / escalón
    if (front) {
      face(0.235, -0.1, 0.1, 0.32, 0.44, GLASS);                       // parabrisas
      poly([W(0.24, -0.035, 0.44), W(0.24, 0.005, 0.44), W(0.24, -0.04, 0.32), W(0.24, -0.08, 0.32)], 'rgba(255,255,255,.16)');
      const mk = night ? '#FFC24A' : '#E8892B';                         // luces de gálibo
      face(0.235, -0.085, -0.055, 0.452, 0.47, mk);
      face(0.235, -0.015, 0.015, 0.452, 0.47, mk);
      face(0.235, 0.055, 0.085, 0.452, 0.47, mk);
    }
  };
  const hood = () => {
    lbox(0.235, 0.325, -0.1, 0.1, 0.12, 0.31, cab);
    if (front) {
      face(0.325, -0.058, 0.058, 0.14, 0.295, CHROME);                 // parrilla
      face(0.325, -0.042, 0.042, 0.16, 0.275, GRILLE);
      face(0.325, -0.042, 0.042, 0.21, 0.225, CHROME);
      const hl = night ? '#FFF6C8' : '#EDE6CC';                         // faros
      face(0.325, -0.097, -0.066, 0.2, 0.25, hl);
      face(0.325, 0.066, 0.097, 0.2, 0.25, hl);
      if (night) {
        const g1 = W(0.33, -0.082, 0.225), g2 = W(0.33, 0.082, 0.225);
        circle(g1[0], g1[1], 1.7, 'rgba(255,240,170,.5)');
        circle(g2[0], g2[1], 1.7, 'rgba(255,240,170,.5)');
      }
    }
  };
  const bumper = () => lbox(0.31, 0.34, -HW, HW, 0.07, 0.14, CHROME);

  // Se dibuja de lo más lejano a lo más cercano a lo largo del tráiler
  const parts = front ? [trailer, stacks, cabin, hood, bumper] : [bumper, hood, cabin, stacks, trailer];
  for (const f of parts) f();

  // Tanque de diésel y llantas del costado visible (van por fuera de la carrocería)
  lbox(0.095, 0.185, HW - 0.04, HW + 0.004, 0.05, 0.118, CHROME);
  for (const ac of WHEELS) {
    poly(RIM.map(([c, n]) => W(ac + WR * c, HW + 0.008, WR + WR * 1.1 * n)), TIRE);
    side(ac - 0.02, ac + 0.02, WR - 0.022, WR + 0.022, HUB, HW + 0.006);
  }
}
export function truckAlpha(tr) {
  const d = Math.max(0, -tr.y, tr.y - game.H);
  return clamp(1 - d * 0.42, 0, 1);
}
