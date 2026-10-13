import { TW, TH, ZU } from '../config.js';
import { ctx } from '../utils.js';
import { cam } from '../camera.js';

/* ---------- Primitivas isométricas ---------- */
export const P = (x, y, z = 0) => [(x - y) * TW / 2, (x + y) * TH / 2 - z * ZU];
export const scr = (x, y, z = 0) => { const [wx, wy] = P(x, y, z); return [wx * cam.z + cam.x, wy * cam.z + cam.y]; };
export function poly(pts, fill) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}
export function tile(x, y, fill) { poly([P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)], fill); }
export function line(a, b, w, c) {
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
  ctx.lineWidth = w; ctx.strokeStyle = c; ctx.stroke();
}
export function box(x0, y0, x1, y1, z0, z1, top, left, right) {
  poly([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)], left);
  poly([P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)], right);
  poly([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], top);
}
const shadeCache = {};
export function shade(hex, f) {
  const key = hex + f;
  if (shadeCache[key]) return shadeCache[key];
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = n >> 8 & 255, b = n & 255;
  if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
  else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
  return (shadeCache[key] = `rgb(${r | 0},${g | 0},${b | 0})`);
}
export function cbox(x0, y0, x1, y1, z0, z1, c, top) {
  box(x0, y0, x1, y1, z0, z1, top || shade(c, 0.16), shade(c, -0.06), shade(c, -0.26));
}
export function winY(x0, x1, y, z0, z1, c) { poly([P(x0, y + 0.003, z0), P(x1, y + 0.003, z0), P(x1, y + 0.003, z1), P(x0, y + 0.003, z1)], c); }
export function winX(x, y0, y1, z0, z1, c) { poly([P(x + 0.003, y0, z0), P(x + 0.003, y1, z0), P(x + 0.003, y1, z1), P(x + 0.003, y0, z1)], c); }
export function circle(x, y, r, c) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); }
export function rrect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
