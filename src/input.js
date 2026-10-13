import { ZMIN, ZMAX } from './config.js';
import { canvas, clamp } from './utils.js';
import { game } from './state.js';
import { cam, clampCam, zoomAt, screenToTile } from './camera.js';
import { applyTool } from './tools.js';

/* ---------- Entrada táctil y mouse ---------- */
const pts = new Map();
let g = null;   // gesto en curso: tap, paint (trazar calle), pan o pinch
const rel = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
function paintAt(sx, sy) {
  const [x, y] = screenToTile(sx, sy);
  const k = x + ',' + y;
  if (g.last === k) return;
  g.last = k;
  applyTool(x, y, true);
}
function endPointer(e) {
  if (!pts.has(e.pointerId)) return;
  const p = pts.get(e.pointerId);
  pts.delete(e.pointerId);
  if (g && g.type === 'tap' && e.type === 'pointerup') {
    const [x, y] = screenToTile(p.x, p.y);
    applyTool(x, y, false);
  }
  if (pts.size === 1 && g && g.type === 'pinch') {
    const q = [...pts.values()][0];
    g = { type: 'pan', sx: q.x, sy: q.y, cx: cam.x, cy: cam.y };
  } else if (pts.size === 0) g = null;
}

export function setupInput() {
  canvas.addEventListener('pointerdown', e => {
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    const p = rel(e);
    pts.set(e.pointerId, p);
    if (pts.size === 1) g = { type: 'tap', sx: p.x, sy: p.y, cx: cam.x, cy: cam.y, last: null };
    else if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      g = { type: 'pinch', d0: Math.max(10, dist(a, b)), z0: cam.z, m0: mid(a, b), cx: cam.x, cy: cam.y };
      game.userCam = true;
    }
  });
  canvas.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId) || !g) return;
    const p = rel(e);
    pts.set(e.pointerId, p);
    if (g.type === 'pinch') {
      if (pts.size < 2) return;
      const [a, b] = [...pts.values()];
      const m = mid(a, b), nz = clamp(g.z0 * dist(a, b) / g.d0, ZMIN, ZMAX);
      const wx = (g.m0.x - g.cx) / g.z0, wy = (g.m0.y - g.cy) / g.z0;
      cam.z = nz; cam.x = m.x - wx * nz; cam.y = m.y - wy * nz;
      clampCam();
      return;
    }
    const dx = p.x - g.sx, dy = p.y - g.sy;
    if (g.type === 'tap' && Math.hypot(dx, dy) > 7) {
      if (game.tool === 'road') { g.type = 'paint'; paintAt(g.sx, g.sy); }
      else { g.type = 'pan'; game.userCam = true; }
    }
    if (g.type === 'pan') { cam.x = g.cx + dx; cam.y = g.cy + dy; clampCam(); }
    else if (g.type === 'paint') paintAt(p.x, p.y);
  });
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const p = rel(e);
    zoomAt(p.x, p.y, cam.z * Math.exp(-e.deltaY * 0.0015));
  }, { passive: false });
}
