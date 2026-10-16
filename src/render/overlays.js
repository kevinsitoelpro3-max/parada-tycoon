import { KINDS, NEED_EMOJI, EMOJI_FONT, UI_FONT } from '../config.js';
import { ctx, clamp } from '../utils.js';
import { game, T, serviceTime } from '../state.js';
import { cam } from '../camera.js';
import { scr, circle, rrect } from './iso.js';
import { truckAlpha } from './scene.js';
import { tutoTile } from '../ui/tuto.js';

/* ---------- Encima del mapa: íconos de negocios, burbujas de tráileres y números flotantes ---------- */
// Estrella de 5 puntas centrada en (x, y), de radio r
function star(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
}

// Ícono de un negocio: un letrerito flotando encima del techo, con una punta que lo señala
// y las estrellas del nivel en el borde de abajo. Se achica al alejar la cámara para no tapar el edificio.
// Con el zoom normal del celular (cam.z < 0.8) el letrerito es más chico y flota un poco más alto,
// para no tapar los letreros de azotea que identifican cada negocio. Entre 0.7 y 0.8 pasa poco a poco
// de un tamaño al otro, para que no brinque al pellizcar.
function drawBadge(x, y, t, kb) {
  const off = t.off > 0, col = off ? '#5E6670' : KINDS[t.k].color;
  const [sx, ay] = scr(x + 0.5, y + 0.5, t.top || 0.6);
  const n = clamp((cam.z - 0.7) / 0.1, 0, 1);   // 0 = zoom de celular, 1 = cerca (como antes)
  const s = (20 + 4 * n) * kb, tip = ay - (5 - 3 * n) * kb, bot = tip - 6 * kb, sy = bot - s / 2;
  ctx.beginPath(); ctx.moveTo(sx - 5 * kb, bot - 1); ctx.lineTo(sx, tip); ctx.lineTo(sx + 5 * kb, bot - 1); ctx.closePath();
  ctx.fillStyle = col; ctx.fill();
  rrect(sx - s / 2, sy - s / 2, s, s, 6 * kb);
  ctx.fillStyle = off ? '#C9CDD2' : '#FFFFFF'; ctx.fill();
  ctx.lineWidth = 2.5 * kb; ctx.strokeStyle = col; ctx.stroke();
  ctx.font = `${14 * kb}px ${EMOJI_FONT}`;
  ctx.fillStyle = '#000'; ctx.fillText(off ? '🔌' : KINDS[t.k].emoji, sx, sy);
  // Propina 💰 por cobrar: bolsa dorada que rebota encima del letrerito (late más cuando se va a acabar)
  if (t.cash) {
    const now = performance.now() / 1000, fast = t.cash.ttl < 3 ? 9 : 4.5, kc = Math.max(kb, 0.95);
    const cr = 14 * kc, cy = sy - s / 2 - cr - 6 * kc - Math.abs(Math.sin(now * fast)) * 5 * kc;
    circle(sx, cy, cr, '#F2C230');
    ctx.lineWidth = 2.5 * kc; ctx.strokeStyle = '#8C6B0A'; ctx.stroke();
    ctx.font = `${17 * kc}px ${EMOJI_FONT}`; ctx.fillStyle = '#000';
    ctx.fillText('💰', sx, cy + 1);
    cashSpots.push({ x, y, sx, sy: cy, r: Math.max(26, cr * 1.7) });
  }
  if (cam.z < 0.4) return;            // muy lejos: solo el ícono
  const r = (3.6 + 0.6 * n) * kb, gap = r * 1.9;
  ctx.lineWidth = 1.6 * kb; ctx.strokeStyle = '#3B2F00'; ctx.fillStyle = '#F2C230';
  for (let i = 0; i < t.lvl; i++) {
    star(sx + (i - (t.lvl - 1) / 2) * gap, bot, r);
    ctx.stroke(); ctx.fill();
  }
}

// Dónde quedó cada bolsa 💰 en la pantalla en el último cuadro, para cobrarla al tocarla (input.js)
export const cashSpots = [];
export function cashAt(px, py) {
  let best = null, bd = Infinity;
  for (const c of cashSpots) { const d = Math.hypot(px - c.sx, py - c.sy); if (d < c.r && d < bd) { bd = d; best = c; } }
  return best;
}

export function drawOverlays() {
  cashSpots.length = 0;
  const k = clamp(cam.z, 0.85, 1.35);
  const kb = clamp(cam.z * 1.1, 0.55, 1.2), kt = clamp(cam.z * 1.15, 0.7, 1.3);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  // De atrás hacia adelante, para que el ícono de un negocio cercano quede encima del de atrás
  for (let d = 1; d < game.W + game.H - 1; d++) {
    for (let x = Math.max(1, d - game.H + 1); x <= Math.min(game.W - 1, d); x++) {
      const t = T(x, d - x);
      if (t.t === 'bld') drawBadge(x, d - x, t, kb);
    }
  }
  ctx.lineJoin = 'miter';
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
    const r = 12 * kt;
    circle(sx, sy, r, bg);
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.stroke();
    if (tr.state === 'service') {
      const b = T(tr.bx, tr.by);
      const f = b && b.t === 'bld' ? clamp(tr.t / serviceTime(b.k), 0, 1) : 1;
      ctx.beginPath(); ctx.arc(sx, sy, r + 3 * kt, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2);
      ctx.lineWidth = 3.5 * kt; ctx.strokeStyle = b && b.off > 0 ? '#8A929B' : '#1B998B'; ctx.stroke();
    }
    ctx.font = `${13 * kt}px ${EMOJI_FONT}`; ctx.fillStyle = '#000';
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

// Marca de la guía de Lupe: rombo amarillo en la casilla sugerida y una flecha ▼ que rebota encima.
// Solo dibuja; la casilla la elige ui/tuto.js al cambiar de paso. Fuera de la pantalla no pasa nada.
export function drawTutoMark() {
  const m = tutoTile();
  if (!m) return;
  const { x, y } = m, k = clamp(cam.z, 0.7, 1.4);
  const pts = [scr(x, y), scr(x + 1, y), scr(x + 1, y + 1), scr(x, y + 1)];
  ctx.save();
  ctx.beginPath();
  for (const [px, py] of pts) ctx.lineTo(px, py);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 3 * k + 2; ctx.stroke();   // contorno para la noche
  ctx.strokeStyle = '#F2C230'; ctx.lineWidth = 3 * k; ctx.stroke();
  // Flecha: rebota con el reloj de la pantalla (sin azar)
  const [ax, ay0] = scr(x + 0.5, y + 0.5, m.z || 0.6);
  const ay = ay0 - 6 * k + Math.sin(performance.now() / 180) * 4, w = 9 * k, h = 11 * k;
  ctx.beginPath(); ctx.moveTo(ax - w, ay - h); ctx.lineTo(ax + w, ay - h); ctx.lineTo(ax, ay); ctx.closePath();
  ctx.fillStyle = '#F2C230'; ctx.fill();
  ctx.lineWidth = 1.5; ctx.strokeStyle = '#3B2F00'; ctx.stroke();
  ctx.restore();
}
