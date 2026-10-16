import { canvas, ctx, setCtx } from '../utils.js';
import { game } from '../state.js';
import { cam } from '../camera.js';
import { P } from './iso.js';
import { drawBld } from './buildings/index.js';
import { popScale } from '../fx.js';

/* ---------- Caché de negocios ---------- */
// Cada negocio lleva unas 60 figuras y un mapa lleno tiene cientos, así que se dibuja una vez
// en un lienzo chico y en cada cuadro solo se pega. Se vuelve a dibujar cuando cambia algo
// de lo que depende su dibujo: tipo, nivel, sin luz, tema, casilla o zoom.
// Mientras el zoom cambia (pellizco) y con mucho acercamiento se dibujan directo, sin guardar nada.
const BX = -34, BY = -52, BW = 68, BH = 88;   // rectángulo del dibujo respecto a P(x, y), con margen
const MAXD = 4;                               // escala máxima (zoom × densidad) que se guarda
const BUDGET = 8e6;                           // píxeles guardados como máximo (unos 32 MB)
const cache = new Map();                      // casilla → { sig, cv, top, used }
const tops = {};                              // altura del techo por tipo y nivel, para los que no se dibujan
let pixels = 0, frame = 0, lastD = 0, zooming = false, owner = null;

// Al empezar cada cuadro
export function bldFrame() {
  frame++;
  const D = game.dpr * cam.z;
  zooming = D !== lastD; lastD = D;
  if (owner !== game.S) { owner = game.S; cache.clear(); pixels = 0; }   // partida nueva o cargada
}

// Tira lo que no se usó ni en este cuadro ni en el anterior (lo visible que aún no se pega en
// este cuadro se usó en el anterior). Si lo visible no cabe en BUDGET, se queda: el límite es blando.
function evict() {
  for (const [k, e] of cache) {
    if (pixels <= BUDGET) break;
    if (e.used < frame - 1) { pixels -= e.cv.width * e.cv.height; cache.delete(k); }
  }
}

export function drawBldCached(x, y, t) {
  const D = game.dpr * cam.z, [ax, ay] = P(x, y), ox = ax + BX, oy = ay + BY;
  const dx = Math.round(D * ox + game.dpr * cam.x), dy = Math.round(D * oy + game.dpr * cam.y);
  const w = Math.ceil(BW * D) + 1, h = Math.ceil(BH * D) + 1;
  // Fuera de la pantalla: no se dibuja, pero su ícono necesita la altura del techo
  if (dx > canvas.width || dy > canvas.height || dx + w < 0 || dy + h < 0) {
    if (t.top === undefined) t.top = tops[t.k + t.lvl];
    return;
  }
  if (zooming || D > MAXD) { drawBld(x, y, t); tops[t.k + t.lvl] = t.top; return; }
  const sig = `${t.k}${t.lvl}${t.off > 0 ? 'x' : ''}${game.dark ? 'n' : ''}${x},${y}@${D}`;
  let e = cache.get(t);
  if (!e || e.sig !== sig) {
    if (!e) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 0;               // nace de 300 × 150: así la cuenta de píxeles empieza en cero
      e = { sig: '', cv, top: undefined, used: 0 };
      cache.set(t, e);
    }
    const cv = e.cv;
    if (cv.width !== w || cv.height !== h) { pixels += w * h - cv.width * cv.height; cv.width = w; cv.height = h; }
    const c = cv.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h);
    c.setTransform(D, 0, 0, D, -D * ox, -D * oy);
    c.lineCap = 'round';
    const prev = setCtx(c);
    try { drawBld(x, y, t); } finally { setCtx(prev); }
    tops[t.k + t.lvl] = e.top = t.top;
    e.sig = sig;
    e.used = frame;
    if (pixels > BUDGET) evict();
  }
  e.used = frame;
  t.top = e.top;                              // demoler borra t.top y al reconstruir igual se reusa el dibujo
  // Se pega con la transformación del mundo puesta (sin cambiarla: setTransform por cada negocio
  // costaba mucho), en la posición que cae justo en el píxel entero (dx, dy) del lienzo
  const X = (dx - game.dpr * cam.x) / D, Y = (dy - game.dpr * cam.y) / D;
  const ps = popScale(t);
  if (ps) {
    // rebote: escala desde el centro del piso de la casilla
    const [px, py] = P(x + 0.5, y + 0.5);
    ctx.drawImage(e.cv, px + (X - px) * ps[0], py + (Y - py) * ps[1], w / D * ps[0], h / D * ps[1]);
  } else ctx.drawImage(e.cv, X, Y, w / D, h / D);
}
