import { clamp } from '../utils.js';
import { game } from '../state.js';
import { P, poly, cbox, winX, winY } from './iso.js';

/* ---------- Tráileres ---------- */
export function drawTruck(tr) {
  const d = tr.dir, cx = tr.x + tr.ox, cy = tr.y + tr.oy, hw = 0.13;
  const seg = (a, b) => {
    if (d[0] !== 0) { const p = cx + d[0] * a, q = cx + d[0] * b; return [Math.min(p, q), cy - hw, Math.max(p, q), cy + hw]; }
    const p = cy + d[1] * a, q = cy + d[1] * b; return [cx - hw, Math.min(p, q), cx + hw, Math.max(p, q)];
  };
  const s = seg(-0.4, 0.34);
  poly([P(s[0] + 0.03, s[1] + 0.03), P(s[2] + 0.06, s[1] + 0.03), P(s[2] + 0.06, s[3] + 0.06), P(s[0] + 0.03, s[3] + 0.06)], 'rgba(0,0,0,.22)');
  const tb = seg(-0.38, 0.06), cb = seg(0.1, 0.34);
  const trailer = () => cbox(tb[0], tb[1], tb[2], tb[3], 0.08, 0.52, tr.trailer);
  const cab = () => {
    cbox(cb[0], cb[1], cb[2], cb[3], 0.08, 0.44, tr.cab);
    if (d[0] === 1) winX(cb[2], cb[1] + 0.03, cb[3] - 0.03, 0.27, 0.4, '#1F2B36');
    else if (d[1] === 1) winY(cb[0] + 0.03, cb[2] - 0.03, cb[3], 0.27, 0.4, '#1F2B36');
  };
  if (d[0] + d[1] > 0) { trailer(); cab(); } else { cab(); trailer(); }
}
export function truckAlpha(tr) {
  const d = Math.max(0, -tr.y, tr.y - game.H);
  return clamp(1 - d * 0.42, 0, 1);
}
