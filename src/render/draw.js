import { W } from '../config.js';
import { canvas, ctx, clamp } from '../utils.js';
import { game, T } from '../state.js';
import { cam } from '../camera.js';
import { drawGround, drawHighlights, drawTree, drawBld, drawTruck, drawRain, outerTrees, truckAlpha } from './scene.js';
import { drawOverlays } from './overlays.js';

/* ---------- Dibujo de un cuadro completo ---------- */
export function draw() {
  const H = game.H;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = game.sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(game.dpr * cam.z, 0, 0, game.dpr * cam.z, game.dpr * cam.x, game.dpr * cam.y);
  ctx.lineCap = 'round';
  drawGround();
  drawHighlights();

  // Se dibuja de atrás hacia adelante para que lo cercano tape a lo lejano
  const objs = [];
  for (let y = 0; y < H; y++) for (let x = 1; x < W; x++) {
    const t = T(x, y);
    if (t.t === 'tree') objs.push({ d: x + y + 1, a: 1, f: () => drawTree(x, y, 1) });
    else if (t.t === 'bld') objs.push({ d: x + y + 1, a: 1, f: () => drawBld(x, y, t) });
  }
  for (const [x, y, s] of outerTrees) {
    const d = Math.max(0, -x, x - (W - 1), -y, y - (H - 1));
    const a = clamp(1 - d * 0.3, 0, 1);
    if (a > 0) objs.push({ d: x + y + 1, a, f: () => drawTree(x, y, s) });
  }
  for (const tr of game.trucks) {
    const a = truckAlpha(tr);
    if (a > 0) objs.push({ d: tr.x + tr.ox + tr.y + tr.oy, a, f: () => drawTruck(tr) });
  }
  objs.sort((p, q) => p.d - q.d);
  for (const o of objs) { ctx.globalAlpha = o.a; o.f(); }
  ctx.globalAlpha = 1;

  ctx.setTransform(game.dpr, 0, 0, game.dpr, 0, 0);
  const vw = canvas.width / game.dpr, vh = canvas.height / game.dpr;
  if (game.dark) { ctx.fillStyle = 'rgba(8,18,32,.22)'; ctx.fillRect(0, 0, vw, vh); }
  if (game.ev.rain) drawRain(vw, vh);
  drawOverlays();
}
