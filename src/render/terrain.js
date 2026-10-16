import { WMAX, HMAX, TW, TH, ZU } from '../config.js';
import { canvas, ctx, mulberry32 } from '../utils.js';
import { game, T, isRoad } from '../state.js';
import { check } from '../tools.js';
import { P, poly, tile, cbox, circle } from './iso.js';

/* ---------- Terreno: pasto, calles, carretera, agua, árboles y resaltado de herramientas ---------- */

// Azar fijo por casilla (no usa Math.random): el mismo (x, y, s) da siempre el mismo número en [0, 1)
function hash(x, y, s = 0) {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(s | 0, 0x2545f491);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/* ---------- Pintor por capas ----------
   El suelo se dibuja cada cuadro con cientos de casillas. Las figuras se agrupan por capa, color y
   transparencia y se pintan al final: así el color se cambia una vez por grupo y todas las rayas de
   un mismo color salen en un solo stroke(). Los rellenos van uno por uno porque una figura convexa
   suelta se pinta más rápido que un trazo enorme con cientos de piezas.
   Las capas van de abajo hacia arriba; dentro de una casilla nada se tapa con lo de otra casilla. */
const HX = TW / 2, HY = TH / 2;
const sx = (x, y) => (x - y) * HX;
const sy = (x, y, z = 0) => (x + y) * HY - z * ZU;
const ALPHA = [1, 0.7, 0.4, 0.1];          // transparencia según la distancia al terreno comprado
const LAYERS = Array.from({ length: 9 }, () => new Map());
let lvl = 0;                               // nivel de transparencia de la casilla que se está armando
function grp(layer, style, kind, w, cap) {
  const m = LAYERS[layer];
  let g = m.get(style);
  if (!g) m.set(style, g = { kind, w, cap, it: [[], [], [], []] });
  return g.it[lvl];
}
const F = (layer, style) => grp(layer, style, 'f');                           // polígonos rellenos
const L = (layer, style, w, cap = 'butt') => grp(layer, style, 's', w, cap);  // segmentos de línea (puntas rectas o redondas)
const E = (layer, style) => grp(layer, style, 'e');                           // elipses rellenas
// cuadrilátero sobre el suelo, de (x0, y0) a (x1, y1)
function quad(a, x0, y0, x1, y1) {
  a.push(4, sx(x0, y0), sy(x0, y0), sx(x1, y0), sy(x1, y0), sx(x1, y1), sy(x1, y1), sx(x0, y1), sy(x0, y1));
}
// Casilla base un poquito más grande hacia los lados indicados, para que no se vea la rayita clara
// (el antialias) entre dos casillas iguales. Solo en casillas opacas: con transparencia se notaría el empalme.
const EPS = 0.012;
function base(a, x, y, w, n, e, s) {
  const k = lvl ? 0 : EPS;
  quad(a, x - (w ? k : 0), y - (n ? k : 0), x + 1 + (e ? k : 0), y + 1 + (s ? k : 0));
}
// cara vertical a lo largo de y (x fija) o a lo largo de x (y fija), entre las alturas z0 y z1
function faceX(a, x, y0, y1, z0, z1) {
  a.push(4, sx(x, y0), sy(x, y0, z0), sx(x, y1), sy(x, y1, z0), sx(x, y1), sy(x, y1, z1), sx(x, y0), sy(x, y0, z1));
}
function faceY(a, x0, x1, y, z0, z1) {
  a.push(4, sx(x0, y), sy(x0, y, z0), sx(x1, y), sy(x1, y, z0), sx(x1, y), sy(x1, y, z1), sx(x0, y), sy(x0, y, z1));
}
function seg(a, x0, y0, x1, y1, z = 0) { a.push(sx(x0, y0), sy(x0, y0, z), sx(x1, y1), sy(x1, y1, z)); }
function flush() {
  const cap0 = ctx.lineCap;
  for (const m of LAYERS) for (const [style, g] of m) for (let d = 0; d < 4; d++) {
    const a = g.it[d];
    if (!a.length) continue;
    ctx.globalAlpha = ALPHA[d];
    if (g.kind === 'f') {
      ctx.fillStyle = style;
      for (let i = 0; i < a.length;) {
        const n = a[i++];
        ctx.beginPath(); ctx.moveTo(a[i], a[i + 1]); i += 2;
        for (let k = 1; k < n; k++, i += 2) ctx.lineTo(a[i], a[i + 1]);
        ctx.fill();
      }
    } else if (g.kind === 's') {
      ctx.beginPath();
      for (let i = 0; i < a.length; i += 4) { ctx.moveTo(a[i], a[i + 1]); ctx.lineTo(a[i + 2], a[i + 3]); }
      ctx.lineWidth = g.w; ctx.strokeStyle = style; ctx.lineCap = g.cap; ctx.stroke();
    } else {
      ctx.fillStyle = style;
      for (let i = 0; i < a.length; i += 4) { ctx.beginPath(); ctx.ellipse(a[i], a[i + 1], a[i + 2], a[i + 3], 0, 0, 6.2832); ctx.fill(); }
    }
    a.length = 0;
  }
  ctx.globalAlpha = 1;
  ctx.lineCap = cap0;
}

/* Pasto: dos tonos en damero (para leer la cuadrícula), tres variantes suaves de cada uno y algún detalle */
const GRASS = [['#86BC5F', '#83B85B', '#8ABF62'], ['#8CC265', '#88BE60', '#90C569']];
const GRASS_OUT = [['#95C16E', '#92BD6A', '#99C472'], ['#9AC673', '#97C26F', '#9ECA77']];
const FLOWERS = ['#FFFFFF', '#F6D44A', '#F29AB8', '#C9B2EE'];
const SAND = [['#E3CD98', '#DEC690', '#E7D3A2'], ['#DBC28A', '#E0C994', '#D6BC84']];
function grass(x, y, inLot, detail, sand = false) {
  const pal = sand ? SAND : inLot ? GRASS : GRASS_OUT;
  base(F(0, pal[(x + y) & 1][(hash(x, y) * 3) | 0]), x, y, 1, 1, 1, 1);
  if (sand) {
    // desierto: piedritas y, a veces, un nopal chico
    if (!detail) return;
    const d = hash(x, y, 1), u = x + 0.3 + hash(x, y, 2) * 0.4, v = y + 0.3 + hash(x, y, 3) * 0.4, px = sx(u, v), py = sy(u, v);
    if (d < 0.18) { E(7, '#4F8A3C').push(px, py - 4, 2.2, 4.2); E(8, '#4F8A3C').push(px + 3, py - 5, 1.5, 2.6); }
    else if (d < 0.4) E(7, '#B79F6E').push(px, py, 2.6, 1.6);
    return;
  }
  if (!detail) return;
  const d = hash(x, y, 1);
  if (d > 0.36) return;
  // punto donde va el detalle, lejos de las orillas para no invadir a los vecinos
  const u = x + 0.28 + hash(x, y, 2) * 0.44, v = y + 0.28 + hash(x, y, 3) * 0.44;
  const px = sx(u, v), py = sy(u, v);
  if (d < 0.08) {                 // florecitas: tres puntos de un color
    const a = E(7, FLOWERS[(hash(x, y, 4) * FLOWERS.length) | 0]);
    a.push(px, py, 1.7, 1.7, px + 4.5, py + 1.5, 1.7, 1.7, px + 1, py - 2.6, 1.7, 1.7);
  } else if (d < 0.12) {          // piedra con su brillo
    E(7, '#9E9C92').push(px, py, 3.6, 2.2);
    E(8, '#C4C1B5').push(px - 0.8, py - 0.8, 2, 1.1);
  } else {                        // matas de pasto: abanicos de tres hojitas más oscuras
    const a = L(7, inLot ? '#70A64C' : '#80AE5C', 1.1, 'round');
    a.push(px, py, px - 2.4, py - 2.8, px, py, px - 0.2, py - 4, px, py, px + 2.4, py - 3);
    if (d > 0.22) a.push(px + 5.6, py + 1.6, px + 4, py - 0.6, px + 5.6, py + 1.6, px + 5.6, py - 1.4, px + 5.6, py + 1.6, px + 7.4, py - 0.4);
  }
}

/* Calles: asfalto, banqueta con bordillo donde no hay salida y raya central discontinua */
const ASPH = '#4B4F57', WALK = '#D9D3C3', CURB = '#A1998A', SW = 0.13;
const roadish = (nx, ny) => nx === 0 || isRoad(nx, ny);
const NOOP = { push() {} };
function road(x, y, detail) {
  const e = isRoad(x + 1, y), w = isRoad(x - 1, y) || x === 1, s = isRoad(x, y + 1), n = isRoad(x, y - 1) || (y === 1 && !!game.S.hwy2);
  base(F(1, ASPH), x, y, w, n, e, s);
  const x0 = x, x1 = x + 1, y0 = y, y1 = y + 1;
  if (T(x, y).br) {
    // puente: barandal en los lados que dan al agua
    const rail = L(8, '#C9CED6', 1.6), z = 0.12;
    if (!n) seg(rail, x0, y0 + 0.06, x1, y0 + 0.06, z);
    if (!s) seg(rail, x0, y1 - 0.06, x1, y1 - 0.06, z);
    if (!w) seg(rail, x0 + 0.06, y0, x0 + 0.06, y1, z);
    if (!e) seg(rail, x1 - 0.06, y0, x1 - 0.06, y1, z);
    return;
  }
  // Curva: la calle sigue por dos lados que forman esquina (y no sale a una carretera). En vez de una
  // esquina en escuadra, el asfalto dobla en un cuarto de círculo con su banqueta curva y pasto afuera.
  const re = isRoad(x + 1, y), rw = isRoad(x - 1, y), rs = isRoad(x, y + 1), rn = isRoad(x, y - 1);
  if (e + w + s + n === 2 && (n || s) && (e || w) && re === e && rw === w && rs === s && rn === n) {
    curve(x, y, e ? x1 : x0, n ? y0 : y1, e ? -1 : 1, n ? 1 : -1, detail);
    return;
  }
  // Banquetas en los lados sin salida. El bordillo (la cara de la banqueta que da a la calle) solo se ve
  // en las banquetas de atrás (lados -x y -y), que le dan la cara a la cámara; se arma solo si el mapa se ve de cerca.
  const walk = F(2, WALK), curb = detail ? L(6, CURB, 1.5) : NOOP;
  const ya = n ? y0 : y0 + SW, xb = e ? x1 : x1 - SW, xa = w ? x0 : x0 + SW, yb = s ? y1 : y1 - SW;
  if (!n) { quad(walk, x0, y0, x1, y0 + SW); seg(curb, xa, y0 + SW, xb, y0 + SW); }
  if (!w) { quad(walk, x0, y0, x0 + SW, y1); seg(curb, x0 + SW, ya, x0 + SW, yb); }
  if (!s) quad(walk, x0, y1 - SW, x1, y1);
  if (!e) quad(walk, x1 - SW, y0, x1, y1);
  // esquinas: si la calle sigue por los dos lados pero la diagonal no es calle, queda una esquina de banqueta
  if (n && w && !roadish(x - 1, y - 1)) { quad(walk, x0, y0, x0 + SW, y0 + SW); seg(curb, x0 + SW, y0, x0 + SW, y0 + SW); seg(curb, x0 + SW, y0 + SW, x0, y0 + SW); }
  if (n && e && !isRoad(x + 1, y - 1)) { quad(walk, x1 - SW, y0, x1, y0 + SW); seg(curb, x1 - SW, y0 + SW, x1, y0 + SW); }
  if (s && w && !roadish(x - 1, y + 1)) { quad(walk, x0, y1 - SW, x0 + SW, y1); seg(curb, x0 + SW, y1 - SW, x0 + SW, y1); }
  if (s && e && !isRoad(x + 1, y + 1)) quad(walk, x1 - SW, y1 - SW, x1, y1);
  // raya central en tramos rectos, curvas y calles cerradas; los cruces quedan limpios
  const conns = e + w + s + n;
  if (!conns || conns > 2) return;
  const lane = L(6, 'rgba(255,255,255,.75)', 1.6), cx = x + 0.5, cy = y + 0.5;
  if (e) seg(lane, cx + 0.12, cy, cx + 0.38, cy);
  if (w) seg(lane, cx - 0.12, cy, cx - 0.38, cy);
  if (s) seg(lane, cx, cy + 0.12, cx, cy + 0.38);
  if (n) seg(lane, cx, cy - 0.12, cx, cy - 0.38);
  // de vez en cuando un parche de asfalto más oscuro
  if (detail && hash(x, y, 5) < 0.12) {
    const u = x + 0.3 + hash(x, y, 6) * 0.4, v = y + 0.3 + hash(x, y, 7) * 0.4;
    E(3, 'rgba(30,32,38,.16)').push(sx(u, v), sy(u, v), 4.5, 2.2);
  }
}

// Curva con centro en la esquina (cx, cy) de la casilla; (ux, uy) apuntan hacia los lados sin salida
function curve(x, y, cx, cy, ux, uy, detail) {
  const N = 9, arc = (r, a = 0, b = Math.PI / 2) => {
    const out = [];
    for (let i = 0; i <= N; i++) { const q = a + (b - a) * i / N; out.push([cx + r * Math.cos(q) * ux, cy + r * Math.sin(q) * uy]); }
    return out;
  };
  const ring = (pts, a) => { a.push(pts.length); for (const [u, v] of pts) a.push(sx(u, v), sy(u, v)); };
  // pasto en la esquina de afuera, banqueta curva y bordillo
  const t = T(x, y), pal = t.sand ? SAND : GRASS;
  ring([...arc(1), [cx + ux, cy + uy]], F(2, pal[(x + y) & 1][(hash(x, y) * 3) | 0]));
  ring([...arc(1), ...arc(1 - SW).reverse()], F(2, WALK));
  if (detail) { const c = arc(1 - SW), a = L(6, CURB, 1.5); for (let i = 0; i < N; i++) seg(a, c[i][0], c[i][1], c[i + 1][0], c[i + 1][1]); }
  // banqueta chica en la esquina de adentro, si la diagonal no es calle
  if (!isRoad(cx === x ? x - 1 : x + 1, cy === y ? y - 1 : y + 1)) ring([[cx, cy], ...arc(SW)], F(2, WALK));
  // raya central curva, discontinua
  const lane = L(6, 'rgba(255,255,255,.75)', 1.6), m = arc(0.5, 0.12, Math.PI / 2 - 0.12);
  for (let i = 0; i < N; i += 2) seg(lane, m[i][0], m[i][1], m[i + 1][0], m[i + 1][1]);
}

/* Carretera principal (x = 0): acotamientos, rayas blancas en la orilla, raya central amarilla y valla */
const HS = 0.15;
// Carretera de arriba: va a lo largo de x en la fila 0; abajo se junta con las calles de la fila 1
function highwayTop(x, detail) {
  const jn = x >= 1 && x < game.W && isRoad(x, 1), x1 = x + 1;
  quad(F(1, '#3A3D43'), x, 0, x1, 1);
  quad(F(2, '#4E5259'), x, 0, x1, HS);
  quad(F(2, jn ? ASPH : '#4E5259'), x, 1 - HS, x1, 1);
  const edge = L(6, 'rgba(255,255,255,.85)', 1.4);
  seg(edge, x, HS, x1, HS);
  if (!jn) seg(edge, x, 1 - HS, x1, 1 - HS);
  seg(L(6, '#F2C230', 1.9), x + 0.14, 0.5, x + 0.62, 0.5);
  if (game.dark) {
    const r = E(8, '#FFE9A0');
    r.push(sx(x + 0.5, HS), sy(x + 0.5, HS), 1.7, 1.7);
    if (!jn) r.push(sx(x + 0.5, 1 - HS), sy(x + 0.5, 1 - HS), 1.7, 1.7);
  }
}
function highway(y, detail) {
  const jn = isRoad(1, y), y1 = y + 1;
  base(F(1, '#3A3D43'), 0, y, 0, 1, 0, 1);
  quad(F(2, '#4E5259'), 0, y, HS, y1);
  quad(F(2, jn ? ASPH : '#4E5259'), 1 - HS, y, 1, y1);
  const edge = L(6, 'rgba(255,255,255,.85)', 1.4);
  seg(edge, HS, y, HS, y1);
  if (!jn) seg(edge, 1 - HS, y, 1 - HS, y1);
  seg(L(6, '#F2C230', 1.9), 0.5, y + 0.14, 0.5, y + 0.62);
  // valla de contención del lado izquierdo: se ve la cara que mira a la carretera y su borde de arriba
  faceX(F(7, '#A3AAB3'), 0.05, y, y1, 0.05, 0.12);
  seg(L(8, '#D5DAE0', 1.2), 0.04, y, 0.04, y1, 0.12);
  if (detail) {
    const post = L(8, '#6E747D', 1.3, 'round');
    post.push(sx(0.04, y + 0.25), sy(0.04, y + 0.25), sx(0.04, y + 0.25), sy(0.04, y + 0.25, 0.06));
    post.push(sx(0.04, y + 0.75), sy(0.04, y + 0.75), sx(0.04, y + 0.75), sy(0.04, y + 0.75, 0.06));
  }
  // de noche brillan los reflejantes de las orillas
  if (game.dark) {
    const r = E(8, '#FFE9A0');
    r.push(sx(HS, y + 0.5), sy(HS, y + 0.5), 1.7, 1.7);
    if (!jn) r.push(sx(1 - HS, y + 0.5), sy(1 - HS, y + 0.5), 1.7, 1.7);
  }
}

/* Estanque: orilla de arena, talud de tierra al fondo, agua somera al frente, brillos y nenúfares */
const isWater = (nx, ny) => { const t = T(nx, ny); return !!t && t.t === 'water'; };
const RIM = 0.07, LILY = [];
for (let i = 0; i <= 6; i++) { const t = 0.5 + i * 0.9; LILY.push(Math.cos(t) * 4.4, Math.sin(t) * 2.3); }
function water(x, y, detail) {
  const n = isWater(x, y - 1), w = isWater(x - 1, y), s = isWater(x, y + 1), e = isWater(x + 1, y);
  const x0 = x, x1 = x + 1, y0 = y, y1 = y + 1;
  base(F(1, '#4C9CC4'), x, y, w, n, e, s);
  // agua más clara (poco honda) junto a las orillas del frente; sombra del talud junto a las de atrás
  if (!s) quad(F(2, '#6DB4D6'), x0, y1 - 0.22, x1, y1);
  if (!e) quad(F(2, '#6DB4D6'), x1 - 0.22, y0, x1, y1);
  if (!n) quad(F(3, '#3F88B0'), x0, y0, x1, y0 + 0.2);
  if (!w) quad(F(3, '#3F88B0'), x0, y0, x0 + 0.2, y1);
  // talud de tierra: la pared de la orilla de atrás que baja hasta el agua
  if (!n) faceY(F(4, '#9B8458'), x0, x1, y0 + RIM, 0, -0.1);
  if (!w) faceX(F(4, '#86704A'), x0 + RIM, y0, y1, 0, -0.1);
  // orilla de arena en todos los lados que no son agua
  const sand = F(5, '#D6CA9C');
  if (!n) quad(sand, x0, y0, x1, y0 + RIM);
  if (!w) quad(sand, x0, y0, x0 + RIM, y1);
  if (!s) quad(sand, x0, y1 - RIM, x1, y1);
  if (!e) quad(sand, x1 - RIM, y0, x1, y1);
  if (!detail) return;
  // brillos: rayitas horizontales en pantalla
  const gl = L(7, 'rgba(255,255,255,.62)', 1.5, 'round');
  for (let i = 0; i < 2; i++) {
    const u = x + 0.3 + hash(x, y, 10 + i) * 0.4, v = y + 0.3 + hash(x, y, 20 + i) * 0.4, l = 0.05 + i * 0.03;
    seg(gl, u - l, v + l, u + l, v - l);
  }
  // un nenúfar (hoja con su muesca) en algunas casillas, a veces con flor
  if (hash(x, y, 30) < 0.5) {
    const u = x + 0.35 + hash(x, y, 31) * 0.3, v = y + 0.35 + hash(x, y, 32) * 0.3, px = sx(u, v), py = sy(u, v);
    const a = F(7, '#4E9A45');
    a.push(8, px, py);
    for (let i = 0; i < LILY.length; i += 2) a.push(px + LILY[i], py + LILY[i + 1]);
    if (hash(x, y, 33) < 0.5) E(8, '#F29AB8').push(px - 1.5, py - 0.8, 1.3, 1.3);
  }
}

export function drawGround() {
  const W = game.W, H = game.H;
  // Solo se arman las casillas que caen en pantalla; el detalle fino se salta cuando el mapa se ve muy chico
  const m = ctx.getTransform(), cw = canvas.width, ch = canvas.height;
  const detail = m.a / (game.dpr || 1) >= 0.45;
  for (let y = -4; y <= H + 3; y++) for (let x = -3; x <= W + 2; x++) {
    const inLot = x >= 0 && x < W && y >= 0 && y < H;
    const d = inLot ? 0 : Math.max(0, -x, x - (W - 1), -y, y - (H - 1));
    if (d > 3) continue;
    const px = m.a * sx(x, y) + m.e, py = m.d * sy(x, y) + m.f;
    if (px + m.a * (HX + 2) < 0 || px - m.a * (HX + 2) > cw || py + m.d * (TH + 6) < 0 || py - m.d * 8 > ch) continue;
    lvl = d;
    if (x === 0) highway(y, detail);
    else if (game.S.hwy2 && y === 0 && x >= 1) highwayTop(x, detail);
    else if (!inLot) grass(x, y, false, detail && d < 3);
    else {
      const t = T(x, y);
      if (t.t === 'road') road(x, y, detail);
      else if (t.t === 'water') water(x, y, detail);
      else if (t.t === 'bld') quad(F(1, '#CEC9BD'), x, y, x + 1, y + 1);   // concreto bajo los negocios
      else grass(x, y, true, detail && t.t !== 'tree' && t.t !== 'rock', !!t.sand);
    }
  }
  lvl = 0;
  flush();
  // borde del terreno comprado
  ctx.beginPath();
  const c = [P(1, 0), P(W, 0), P(W, H), P(1, H)];
  ctx.moveTo(c[0][0], c[0][1]); for (let i = 1; i < 4; i++) ctx.lineTo(c[i][0], c[i][1]);
  ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.stroke(); ctx.setLineDash([]);
}
export function drawHighlights() {
  const tool = game.tool, sel = game.sel;
  if (tool !== 'none' && !game.S.over) {
    // De noche o con el tema oscuro el velo las apaga: van más opacas para que se sigan viendo
    const fill = tool === 'demo' ? 'rgba(230,57,70,.34)' : game.dark ? 'rgba(255,238,140,.7)' : 'rgba(255,238,140,.45)';
    for (let y = 0; y < game.H; y++) for (let x = 1; x < game.W; x++) if (check(tool, x, y).ok) tile(x, y, fill);
  }
  if (sel) {
    const p = [P(sel.x, sel.y), P(sel.x + 1, sel.y), P(sel.x + 1, sel.y + 1), P(sel.x, sel.y + 1)];
    ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < 4; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.closePath();
    ctx.lineWidth = 3; ctx.strokeStyle = '#F2C230'; ctx.stroke();
  }
}

/* ---------- Árboles: frondoso, pino y álamo, según la casilla ----------
   Dentro del terreno el pino y el álamo llegan a la misma altura que el frondoso (cerca de 1), para no
   taparle la fachada a un negocio que quede detrás; afuera pueden ser más altos y dan más paisaje. */
function blob(x, y, rx, ry, c) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 6.2832); ctx.fillStyle = c; ctx.fill(); }
// medidas del pino y del álamo: [0] afuera, [1] dentro del terreno
const PINE = [
  { trunk: 0.22, z0: 0.2, dz: 0.3, h: 0.58, w: 12, dw: 2.8 },     // punta en 1.38
  { trunk: 0.18, z0: 0.16, dz: 0.22, h: 0.44, w: 10.5, dw: 2.3 }, // punta en 1.04
];
const POPLAR = [
  { trunk: 0.3, z: 0.8, rx: 8, ry: 14.5, rx2: 7, ry2: 13.5, hx: 3.2, hy: 6.5, hdy: 5 },
  { trunk: 0.24, z: 0.62, rx: 7.2, ry: 12.6, rx2: 6.5, ry2: 12, hx: 3, hy: 5.8, hdy: 4.4 },
];
export function drawTree(x, y, s) {
  const v = hash(x, y, 40);
  s *= 0.92 + hash(x, y, 41) * 0.16;
  const low = x >= 0 && x < game.W && y >= 0 && y < game.H ? 1 : 0;
  const cx = x + 0.5, cy = y + 0.5, g = P(cx, cy);
  // la copa se mece despacio con el viento (con el reloj de la pantalla, cada árbol a su ritmo)
  const sw = Math.sin(performance.now() / 950 + v * 40) * 1.3 * s;
  if (v < 0.5) {                  // frondoso: copa redonda con sombra abajo a la derecha y brillo arriba
    blob(g[0] + 3, g[1] + 1, 13 * s, 6.5 * s, 'rgba(0,0,0,.16)');
    cbox(cx - 0.035, cy - 0.035, cx + 0.035, cy + 0.035, 0, 0.32 * s, '#7A5230');
    const p = P(cx, cy, 0.62 * s); p[0] += sw;
    circle(p[0] + 1.5 * s, p[1] + 1.5 * s, 12 * s, '#2E7438');
    circle(p[0] - 0.8 * s, p[1] - 0.6 * s, 11 * s, '#3E8F46');
    circle(p[0] + 4.5 * s, p[1] - 6 * s, 6 * s, '#3E8F46');
    circle(p[0] - 4 * s, p[1] - 4.5 * s, 5.5 * s, '#5BAA52');
  } else if (v < 0.8) {           // pino: tres pisos de cono, cara iluminada y cara en sombra
    const m = PINE[low];
    blob(g[0] + 3, g[1] + 1, (m.w - 2) * s, (m.w - 2) * 0.5 * s, 'rgba(0,0,0,.16)');
    cbox(cx - 0.03, cy - 0.03, cx + 0.03, cy + 0.03, 0, m.trunk * s, '#6B4628');
    for (let i = 0; i < 3; i++) {
      const z = m.z0 + i * m.dz, b = P(cx, cy, z * s), t = P(cx, cy, (z + m.h) * s), w = (m.w - i * m.dw) * s, f = w * 0.42;
      b[0] += sw * i / 3; t[0] += sw * (i + 1) / 3;
      poly([[b[0] - w, b[1]], [b[0], b[1] + f], t], '#3B8A50');
      poly([[b[0], b[1] + f], [b[0] + w, b[1]], t], '#26663A');
    }
  } else {                        // álamo: copa alta y angosta, de un verde más claro
    const m = POPLAR[low];
    blob(g[0] + 3, g[1] + 1, (m.rx + 1) * s, (m.rx + 1) * 0.5 * s, 'rgba(0,0,0,.16)');
    cbox(cx - 0.03, cy - 0.03, cx + 0.03, cy + 0.03, 0, m.trunk * s, '#7A5230');
    const p = P(cx, cy, m.z * s); p[0] += sw;
    blob(p[0] + 1.2 * s, p[1] + 1 * s, m.rx * s, m.ry * s, '#4D8C33');
    blob(p[0] - 0.6 * s, p[1] - 0.4 * s, m.rx2 * s, m.ry2 * s, '#6AA845');
    blob(p[0] - 2.6 * s, p[1] - m.hdy * s, m.hx * s, m.hy * s, '#86C05A');
  }
}
export let outerTrees = [];
export function buildOuterTrees() {
  outerTrees = [];
  const r = mulberry32(99);
  // la cuadrícula del sorteo es fija (hasta el tamaño máximo), así los árboles de afuera no se
  // mueven al ampliar el terreno: solo desaparecen los que quedan dentro
  for (let y = -4; y <= HMAX + 3; y++) for (let x = -3; x <= WMAX + 2; x++) {
    const roll = r(), size = 0.75 + r() * 0.4;
    const inLot = x >= 0 && x < game.W && y >= 0 && y < game.H;
    if (inLot || x === 0 || y > game.H + 3 || x > game.W + 2) continue;
    if (roll < 0.2) outerTrees.push([x, y, size]);
  }
}
