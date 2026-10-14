/* ---------- Utilidades ---------- */
export const $ = s => document.querySelector(s);
export const canvas = $('#c'), stage = $('#stage');
// Lienzo donde dibuja todo el render. Es "let" para poder dibujar un rato en otro lienzo
// (la caché de negocios, en render/bldcache.js) con las mismas funciones; ver setCtx.
export let ctx = canvas.getContext('2d');
export function setCtx(c) { const prev = ctx; ctx = c; return prev; }
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const fmt = n => Math.round(n).toLocaleString('en-US');
export const money = n => (n < 0 ? '−$' : '$') + fmt(Math.abs(n));
export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
