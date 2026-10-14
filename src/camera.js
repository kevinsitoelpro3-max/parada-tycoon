import { TW, TH, ZMIN, ZMAX } from './config.js';
import { canvas, stage, clamp } from './utils.js';
import { game } from './state.js';

/* ---------- Cámara ---------- */
export const cam = { x: 0, y: 0, z: 1 };

export function fit() {
  const W = game.W, H = game.H;
  const cw = stage.clientWidth, ch = stage.clientHeight;
  const mapW = (W + H) * TW / 2, mapH = (W + H) * TH / 2 + 50;
  cam.z = clamp(Math.min(cw / mapW, ch / mapH) * 1.12, ZMIN, 2.2);
  const midX = (W - H) * TW / 4, midY = (W + H) * TH / 4 - 14;
  cam.x = cw / 2 - midX * cam.z;
  cam.y = ch / 2 - midY * cam.z;
}
export function clampCam() {
  const W = game.W, H = game.H;
  const cw = stage.clientWidth, ch = stage.clientHeight;
  const cx = (cw / 2 - cam.x) / cam.z, cy = (ch / 2 - cam.y) / cam.z;
  const nx = clamp(cx, -H * TW / 2, W * TW / 2), ny = clamp(cy, -40, (W + H) * TH / 2);
  cam.x = cw / 2 - nx * cam.z;
  cam.y = ch / 2 - ny * cam.z;
}
export function zoomAt(sx, sy, nz) {
  nz = clamp(nz, ZMIN, ZMAX);
  const wx = (sx - cam.x) / cam.z, wy = (sy - cam.y) / cam.z;
  cam.z = nz; cam.x = sx - wx * nz; cam.y = sy - wy * nz;
  game.userCam = true;
  clampCam();
}
export function screenToTile(sx, sy) {
  const wx = (sx - cam.x) / cam.z, wy = (sy - cam.y) / cam.z;
  const a = wx / (TW / 2), b = wy / (TH / 2);
  return [Math.floor((a + b) / 2), Math.floor((b - a) / 2)];
}
export function resize() {
  game.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  canvas.width = Math.max(1, Math.round(stage.clientWidth * game.dpr));
  canvas.height = Math.max(1, Math.round(stage.clientHeight * game.dpr));
  if (!game.userCam) fit(); else clampCam();
}
