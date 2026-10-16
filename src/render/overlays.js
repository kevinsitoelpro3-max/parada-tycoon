import { KINDS, NEED_EMOJI, EMOJI_FONT, UI_FONT } from '../config.js';
import { ctx, clamp, setCtx, canvas } from '../utils.js';
import { game, T, serviceTime } from '../state.js';
import { cam } from '../camera.js';
import { scr, circle, rrect } from './iso.js';
import { truckAlpha } from './scene.js';
import { tutoTile } from '../ui/tuto.js';
import { hapFace } from '../city.js';

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
// Se dibuja una vez en un lienzo chico (badgeSprite) y en cada cuadro solo se pega: con cientos de
// negocios, armar cada letrerito (marco, emoji y estrellas) en cada cuadro era de lo más lento.
function paintBadge(t, kb, n) {
  const off = t.off > 0, col = off ? '#5E6670' : KINDS[t.k].color, sx = 0;
  const s = (20 + 4 * n) * kb, tip = -(5 - 3 * n) * kb, bot = tip - 6 * kb, sy = bot - s / 2;
  ctx.beginPath(); ctx.moveTo(sx - 5 * kb, bot - 1); ctx.lineTo(sx, tip); ctx.lineTo(sx + 5 * kb, bot - 1); ctx.closePath();
  ctx.fillStyle = col; ctx.fill();
  rrect(sx - s / 2, sy - s / 2, s, s, 6 * kb);
  ctx.fillStyle = off ? '#C9CDD2' : '#FFFFFF'; ctx.fill();
  ctx.lineWidth = 2.5 * kb; ctx.strokeStyle = col; ctx.stroke();
  ctx.font = `${14 * kb}px ${EMOJI_FONT}`;
  ctx.fillStyle = '#000'; ctx.fillText(off ? '🔌' : KINDS[t.k].emoji, sx, sy);
  // Surtido de la zona de descarga: cajita café en la esquina del letrerito
  if (t.stock > 0 && !off) {
    const bx = sx + s / 2 - 1 * kb, by = sy - s / 2 + 1 * kb;
    rrect(bx - 5.5 * kb, by - 5.5 * kb, 11 * kb, 11 * kb, 3 * kb); ctx.fillStyle = '#C9954F'; ctx.fill();
    ctx.lineWidth = 1.5 * kb; ctx.strokeStyle = '#6B4A22'; ctx.stroke();
    ctx.fillStyle = '#6B4A22'; ctx.fillRect(bx - 1 * kb, by - 5.5 * kb, 2 * kb, 11 * kb);
  }
  if (cam.z < 0.4) return;            // muy lejos: solo el ícono
  const r = (3.6 + 0.6 * n) * kb, gap = r * 1.9;
  ctx.lineWidth = 1.6 * kb; ctx.strokeStyle = '#3B2F00'; ctx.fillStyle = '#F2C230';
  for (let i = 0; i < t.lvl; i++) {
    star(sx + (i - (t.lvl - 1) / 2) * gap, bot, r);
    ctx.stroke(); ctx.fill();
  }
}
// Letreritos ya dibujados, por tipo, nivel, sin luz y surtido. Se tiran al cambiar el tamaño (zoom o
// densidad); mientras el zoom cambia de un cuadro a otro se dibujan directo.
const badges = new Map();
let badgeKey = '', direct = false;
function badgeFrame(kb, n) {
  const k = `${kb.toFixed(3)}|${n.toFixed(3)}|${game.dpr}|${cam.z < 0.4 ? 1 : 0}`;
  direct = k !== badgeKey;
  if (direct) { badges.clear(); badgeKey = k; }
}
function drawBadge(x, y, t, kb, n, vw, vh) {
  const [sx, ay] = scr(x + 0.5, y + 0.5, t.top || 0.6);
  const s = (20 + 4 * n) * kb, tip = ay - (5 - 3 * n) * kb, bot = tip - 6 * kb, sy = bot - s / 2;
  if (sx < -60 || sx > vw + 60 || ay < -20 || ay > vh + 120) return;   // fuera de la pantalla
  if (direct) { ctx.save(); ctx.translate(sx, ay); paintBadge(t, kb, n); ctx.restore(); }
  else {
    const off = t.off > 0, key = `${t.k}${t.lvl}${off ? 'x' : ''}${t.stock > 0 && !off ? 's' : ''}`;
    let e = badges.get(key);
    if (!e) {
      const D = game.dpr, hw = s / 2 + 9 * kb, top = -(5 - 3 * n) * kb - 6 * kb - s - 9 * kb, bottom = 4 * kb + 2;
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(2 * hw * D); cv.height = Math.ceil((bottom - top) * D);
      const c = cv.getContext('2d');
      c.setTransform(D, 0, 0, D, hw * D, -top * D);
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      const prev = setCtx(c);
      try { paintBadge(t, kb, n); } finally { setCtx(prev); }
      e = { cv, hw, top };
      badges.set(key, e);
    }
    const D = game.dpr;
    ctx.drawImage(e.cv, Math.round((sx - e.hw) * D) / D, Math.round((ay + e.top) * D) / D, e.cv.width / D, e.cv.height / D);
  }
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
}

// Dónde quedó cada bolsa 💰 en la pantalla en el último cuadro, para cobrarla al tocarla (input.js)
export const cashSpots = [];
export function cashAt(px, py) {
  let best = null, bd = Infinity;
  for (const c of cashSpots) { const d = Math.hypot(px - c.sx, py - c.sy); if (d < c.r && d < bd) { bd = d; best = c; } }
  return best;
}

// Casa: pastilla con la carita del barrio y cuántos viven ahí (solo de cerca)
function drawHomeBadge(x, y, t, kb) {
  if (cam.z < 0.5) return;
  const [sx, ay] = scr(x + 0.5, y + 0.5, (t.top || 0.5) + 0.12);
  const w = 34 * kb, h = 17 * kb, sy = ay - h / 2;
  rrect(sx - w / 2, sy - h / 2, w, h, h / 2); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill();
  ctx.lineWidth = 1.5 * kb; ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.stroke();
  ctx.font = `${11 * kb}px ${EMOJI_FONT}`; ctx.fillStyle = '#000';
  ctx.fillText(hapFace(), sx - 7 * kb, sy + 0.5);
  ctx.font = `800 ${10.5 * kb}px ${UI_FONT}`; ctx.fillStyle = '#13261C';
  ctx.fillText(String(t.res), sx + 8 * kb, sy + 1);
}

export function drawOverlays() {
  cashSpots.length = 0;
  const k = clamp(cam.z, 0.85, 1.35);
  const kb = clamp(cam.z * 1.1, 0.55, 1.2), kt = clamp(cam.z * 1.15, 0.7, 1.3);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const nb = clamp((cam.z - 0.7) / 0.1, 0, 1), vw = canvas.width / game.dpr, vh = canvas.height / game.dpr;
  badgeFrame(kb, nb);
  // De atrás hacia adelante, para que el ícono de un negocio cercano quede encima del de atrás
  for (let d = 1; d < game.W + game.H - 1; d++) {
    for (let x = Math.max(1, d - game.H + 1); x <= Math.min(game.W - 1, d); x++) {
      const t = T(x, d - x);
      if (t.t === 'bld') drawBadge(x, d - x, t, kb, nb, vw, vh);
      else if (t.t === 'home') drawHomeBadge(x, d - x, t, kb);
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
  // Polvo de construir y demoler
  for (const p of game.fx) {
    if (p.k !== 'dust') continue;
    const [sx, sy] = scr(p.x, p.y, p.z), f = p.t / p.life;
    ctx.globalAlpha = clamp(0.8 * (1 - f), 0, 1);
    circle(sx, sy, p.r * (0.6 + f) * cam.z, p.c);
  }
  ctx.globalAlpha = 1;
  // Coches de ciudadanos: burbuja chica con lo que van a comprar, o la carita al volver
  for (const c of cam.z < 0.5 ? [] : game.cars) {
    const em = c.happy > 0 ? '😊' : c.sad ? '😟' : c.state === 'go' ? NEED_EMOJI[c.need] : null;
    if (!em) continue;
    const [sx, sy] = scr(c.x + c.ox, c.y + c.oy, 0.75), r = 8.5 * kt;
    circle(sx, sy, r, '#FFFFFF');
    ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.stroke();
    ctx.font = `${9.5 * kt}px ${EMOJI_FONT}`; ctx.fillStyle = '#000'; ctx.fillText(em, sx, sy + 1);
  }
  for (const f of game.floats) {
    const [sx, sy] = scr(f.x, f.y, f.z);
    ctx.globalAlpha = clamp(1 - f.t / 1.6, 0, 1);
    // salta al aparecer: crece de más y se acomoda (easeOutBack en 0.25 s)
    const q = Math.min(1, f.t / 0.25), pop = 0.5 + 0.5 * (1 + 2.7 * Math.pow(q - 1, 3) + 1.7 * Math.pow(q - 1, 2));
    ctx.font = `800 ${(f.neg ? 12 : 15) * k * pop}px ${UI_FONT}`;
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
