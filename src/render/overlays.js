import { KINDS, NEED_EMOJI, EMOJI_FONT, UI_FONT } from '../config.js';
import { ctx, clamp } from '../utils.js';
import { game, T } from '../state.js';
import { cam } from '../camera.js';
import { scr, circle, rrect } from './iso.js';
import { truckAlpha } from './scene.js';

/* ---------- Encima del mapa: íconos de negocios, burbujas de tráileres y números flotantes ---------- */
export function drawOverlays() {
  const k = clamp(cam.z, 0.85, 1.35);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let y = 0; y < game.H; y++) for (let x = 1; x < game.W; x++) {
    const t = T(x, y);
    if (t.t !== 'bld') continue;
    const off = t.off > 0;
    const [sx, sy] = scr(x + 0.5, y + 0.5, (t.top || 0.6) + 0.5);
    const s = 24 * k;
    rrect(sx - s / 2, sy - s / 2, s, s, 6 * k);
    ctx.fillStyle = off ? '#C9CDD2' : '#FFFFFF'; ctx.fill();
    ctx.lineWidth = 2.5 * k; ctx.strokeStyle = off ? '#5E6670' : KINDS[t.k].color; ctx.stroke();
    ctx.font = `${14 * k}px ${EMOJI_FONT}`;
    ctx.fillStyle = '#000'; ctx.fillText(off ? '🔌' : KINDS[t.k].emoji, sx, sy + 1);
    ctx.font = `800 ${11 * k}px ${UI_FONT}`;
    const st = '★'.repeat(t.lvl);
    ctx.lineWidth = 3 * k; ctx.strokeStyle = '#3B2F00'; ctx.strokeText(st, sx, sy + s / 2 + 8 * k);
    ctx.fillStyle = '#F2C230'; ctx.fillText(st, sx, sy + s / 2 + 8 * k);
  }
  for (const tr of game.trucks) {
    let em = null, bg = '#FFFFFF';
    if (tr.angry) { em = '😠'; bg = '#FFD6D1'; }
    else if (tr.need) em = NEED_EMOJI[tr.need];
    else if (tr.happy > 0) em = '😊';
    if (!em) continue;
    const a = truckAlpha(tr);
    if (a <= 0) continue;
    ctx.globalAlpha = a;
    const [sx, sy] = scr(tr.x + tr.ox, tr.y + tr.oy, 1.3);
    const r = 12 * k;
    circle(sx, sy, r, bg);
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.stroke();
    if (tr.state === 'service') {
      const b = T(tr.bx, tr.by);
      const f = b && b.t === 'bld' ? clamp(tr.t / KINDS[b.k].time, 0, 1) : 1;
      ctx.beginPath(); ctx.arc(sx, sy, r + 3 * k, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2);
      ctx.lineWidth = 3.5 * k; ctx.strokeStyle = b && b.off > 0 ? '#8A929B' : '#1B998B'; ctx.stroke();
    }
    ctx.font = `${13 * k}px ${EMOJI_FONT}`; ctx.fillStyle = '#000';
    ctx.fillText(em, sx, sy + 1);
  }
  ctx.globalAlpha = 1;
  for (const f of game.floats) {
    const [sx, sy] = scr(f.x, f.y, f.z);
    ctx.globalAlpha = clamp(1 - f.t / 1.6, 0, 1);
    ctx.font = `800 ${(f.neg ? 12 : 15) * k}px ${UI_FONT}`;
    ctx.lineWidth = 3.5; ctx.strokeStyle = '#FFFFFF'; ctx.strokeText(f.text, sx, sy);
    ctx.fillStyle = f.neg ? '#B3261E' : '#16794A'; ctx.fillText(f.text, sx, sy);
  }
  for (const p of game.puffs) {
    const [sx, sy] = scr(p.x + 0.5, p.y + 0.5, 0.1);
    ctx.globalAlpha = clamp(1 - p.t / 0.5, 0, 1);
    ctx.beginPath(); ctx.arc(sx, sy, (10 + p.t * 70) * cam.z, 0, Math.PI * 2);
    ctx.lineWidth = 3; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
