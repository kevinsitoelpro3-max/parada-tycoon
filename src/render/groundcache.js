import { canvas, ctx, setCtx } from '../utils.js';
import { game } from '../state.js';
import { cam } from '../camera.js';
import { drawGround } from './terrain.js';
import { worldXform } from './iso.js';

/* ---------- Caché del suelo ----------
   El suelo (pasto, calles, carretera, agua) son cientos de figuras y casi nunca cambia: solo al
   construir, al cambiar el zoom o al prender las luces. Se dibuja una vez en un lienzo un poco más
   grande que la pantalla (MARGIN de cada lado) y en cada cuadro solo se pega, recorrido según la cámara.
   Se vuelve a dibujar si cambia una casilla, el zoom, la luz o si la cámara se sale del margen.
   Mientras el zoom cambia (pellizco) se dibuja directo, sin guardar nada. */
const MARGIN = 0.35;
const gc = document.createElement('canvas');
const gctx = gc.getContext('2d');
let sig = '', ox = 0, oy = 0, lastD = 0;   // ox, oy: posición (px del lienzo) de la cámara cuando se dibujó

// Huella rápida de todo lo que cambia el suelo: tipo de cada casilla, arena y puentes
function tilesHash() {
  let h = game.W * 131 + game.H;
  for (const t of game.S.tiles) {
    const c = t.t.charCodeAt(0) + t.t.length * 7 + (t.sand ? 3 : 0) + (t.br ? 5 : 0);
    h = (Math.imul(h, 31) + c) | 0;
  }
  return h;
}

export function drawGroundCached() {
  const D = game.dpr * cam.z, zooming = D !== lastD;
  lastD = D;
  if (zooming) { sig = ''; drawGround(); return; }
  const cw = canvas.width, ch = canvas.height, mx = Math.round(cw * MARGIN), my = Math.round(ch * MARGIN);
  const cx = game.dpr * cam.x, cy = game.dpr * cam.y;
  const s = `${tilesHash()}|${D}|${game.dark ? 1 : 0}|${game.S.hwy2 ? 1 : 0}|${cw}x${ch}`;
  if (s !== sig || Math.abs(cx - ox) > mx || Math.abs(cy - oy) > my) {
    gc.width = cw + 2 * mx; gc.height = ch + 2 * my;
    const prev = setCtx(gctx);
    try {
      gctx.setTransform(D, 0, 0, D, cx + mx, cy + my);
      gctx.lineCap = 'round';
      drawGround();
    } finally { setCtx(prev); }
    sig = s; ox = cx; oy = cy;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(gc, Math.round(cx - ox - mx), Math.round(cy - oy - my));
  worldXform();
}
