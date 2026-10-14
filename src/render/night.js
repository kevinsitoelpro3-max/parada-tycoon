import { ctx } from '../utils.js';
import { game, T } from '../state.js';
import { cam } from '../camera.js';
import { scr } from './iso.js';

/* ---------- Noche ---------- */
// Un velo azul oscuro sobre el mapa, más fuerte con la noche cerrada (game.night), y encima un
// resplandor cálido alrededor de cada negocio con luz, para que sus ventanas se vean encendidas.
let glow = null;
function glowSprite() {
  if (glow) return glow;
  glow = document.createElement('canvas');
  glow.width = glow.height = 64;
  const c = glow.getContext('2d'), g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,196,110,.55)');
  g.addColorStop(0.5, 'rgba(255,170,80,.22)');
  g.addColorStop(1, 'rgba(255,150,60,0)');
  c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  return glow;
}

// Fondo del mapa: el color del tema se va hacia azul marino al anochecer (con el tema oscuro ya lo es)
const NIGHT_SKY = [14, 26, 43];
let skyKey = '', skyStr = '';
export function skyColor() {
  const f = game.themeDark ? 0 : Math.round(game.night * 0.75 * 40) / 40;
  const key = game.sky + f;
  if (key !== skyKey) {
    skyKey = key;
    const m = /^#([0-9a-f]{6})$/i.exec(game.sky);
    if (!m || !f) skyStr = game.sky;
    else {
      const n = parseInt(m[1], 16), c = [n >> 16, n >> 8 & 255, n & 255];
      skyStr = `rgb(${c.map((v, i) => Math.round(v + (NIGHT_SKY[i] - v) * f)).join(',')})`;
    }
  }
  return skyStr;
}

// Se dibuja en coordenadas de pantalla, después de los objetos y antes de la lluvia y los íconos
export function drawNight(vw, vh) {
  const veil = game.themeDark ? 0.22 + game.night * 0.16 : game.night * 0.4;
  if (veil <= 0) return;
  ctx.fillStyle = `rgba(8,18,32,${veil.toFixed(3)})`;
  ctx.fillRect(0, 0, vw, vh);
  if (!game.dark) return;                        // al atardecer, antes de prender las luces
  const img = glowSprite(), rx = 40 * cam.z, ry = 26 * cam.z;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = Math.max(game.themeDark ? 0.6 : 0, game.night);
  for (let y = 0; y < game.H; y++) for (let x = 1; x < game.W; x++) {
    const t = T(x, y);
    if (t.t !== 'bld' || t.off > 0) continue;
    const [sx, sy] = scr(x + 0.5, y + 0.5, 0.3);
    if (sx < -rx || sy < -ry || sx > vw + rx || sy > vh + ry) continue;
    ctx.drawImage(img, sx - rx, sy - ry, rx * 2, ry * 2);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}
