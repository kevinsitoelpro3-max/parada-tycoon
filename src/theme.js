import { game } from './state.js';

/* ---------- Tema claro u oscuro ---------- */
// El mapa toma el color de fondo de la variable CSS --sky y oscurece la escena si el tema es oscuro.
export function readTheme() {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--sky').trim();
  game.sky = v || '#D2E4D8';
  const m = /^#([0-9a-f]{6})$/i.exec(game.sky);
  if (m) {
    const n = parseInt(m[1], 16);
    game.dark = (0.299 * (n >> 16) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) < 100;
  }
}
export function setupTheme() {
  try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readTheme); } catch (_) {}
  new MutationObserver(readTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}
