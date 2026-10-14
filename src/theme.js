import { game, hourNow, darkness } from './state.js';

/* ---------- Tema claro u oscuro, y luz del día ---------- */
// El mapa toma el color de fondo de la variable CSS --sky y oscurece la escena si el tema es oscuro.
export function readTheme() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--sky').trim();
  game.sky = v || '#D2E4D8';
  const m = /^#([0-9a-f]{6})$/i.exec(game.sky);
  if (m) {
    const n = parseInt(m[1], 16);
    game.themeDark = (0.299 * (n >> 16) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) < 100;
  }
}
export function setupTheme() {
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readTheme); } catch (_) {}
  new MutationObserver(readTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

// Cada cuadro: qué tan oscuro está según el reloj (game.night) y si van las luces encendidas
// (game.dark: de noche o con el tema oscuro). Las ventanas, faros y letreros siguen a game.dark.
export function updateLight() {
  game.night = game.S ? darkness(hourNow()) : 0;
  game.dark = game.themeDark || game.night >= 0.5;
}
