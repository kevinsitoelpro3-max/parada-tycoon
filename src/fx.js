import { mulberry32, clamp } from './utils.js';
import { game } from './state.js';

/* ---------- Efectos que hacen sentir el juego (sin cambiar la partida) ---------- */
// Rebote al construir o mejorar, polvo, monedas que vuelan a la caja, confeti y vibración.
// Todo usa su propio azar (fxRng) y el reloj de la pantalla: nunca toca Math.random ni game.S.
const fxRng = mulberry32(4242);
const R = (a, b) => a + fxRng() * (b - a);
game.fx = [];

// Rebote del edificio: al construir crece desde 0 (from = 0); al mejorar, desde un poco más chico
export function pop(t, from = 0) { t.pop = { t0: performance.now(), from }; }
// Escala [ancho, alto] del rebote, o null si ya terminó (resorte que se calma en medio segundo)
export function popScale(t) {
  if (!t.pop) return null;
  const s = (performance.now() - t.pop.t0) / 1000;
  if (s >= 0.6) { delete t.pop; return null; }
  const e = Math.exp(-7 * s), w = 1 - (1 - t.pop.from) * e * Math.cos(16 * s);
  return [w * (1 - 0.1 * e * Math.sin(16 * s)), w * (1 + 0.14 * e * Math.sin(16 * s))];
}

// Polvo al construir o demoler, en el suelo de la casilla (x, y)
export function dust(x, y, n = 10, color = '#D8CBB0') {
  for (let i = 0; i < n; i++) {
    const a = R(0, Math.PI * 2), v = R(0.6, 1.4);
    game.fx.push({ k: 'dust', x: x + 0.5, y: y + 0.5, z: 0.05, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: R(0.4, 1.1), t: 0, life: R(0.45, 0.75), r: R(3, 6), c: color });
  }
}
// Capa fija encima de todo (monedas y confeti cruzan el marcador)
const layer = document.createElement('div');
layer.className = 'fx-layer'; layer.setAttribute('aria-hidden', 'true');
document.body.appendChild(layer);
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Monedas que salen del punto (px, py) de la pantalla y vuelan al letrero de la caja
export function coinsFrom(px, py, n = 5) {
  if (reduced()) { bump(); return; }
  const r = moneySign.getBoundingClientRect(), tx = r.left + r.width * 0.55, ty = r.top + r.height * 0.55;
  for (let i = 0; i < n; i++) {
    const el = document.createElement('i');
    el.className = 'coin';
    layer.appendChild(el);
    const sx = px + R(-14, 14), sy = py + R(-10, 6), mx = (sx + tx) / 2 + R(-60, 60), my = Math.min(sy, ty) - R(30, 90);
    const an = el.animate([
      { transform: `translate(${sx}px,${sy}px) scale(.4)`, opacity: 0 },
      { transform: `translate(${sx}px,${sy - 24}px) scale(1.15)`, opacity: 1, offset: 0.18 },
      { transform: `translate(${mx}px,${my}px) scale(1)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${tx}px,${ty}px) scale(.6)`, opacity: 0.9 },
    ], { duration: 720, delay: i * 55, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'backwards' });
    an.onfinish = () => { el.remove(); bump(); };
  }
}
// Confeti en toda la pantalla (meta cumplida, nivel nuevo, premio)
export function confetti(n = 50) {
  if (reduced()) return;
  const C = ['#F2C230', '#E63946', '#2A9D5C', '#3D6FB0', '#F28FAD', '#FFFFFF'], W = innerWidth, H = innerHeight;
  for (let i = 0; i < n; i++) {
    const el = document.createElement('i');
    el.className = 'conf';
    el.style.background = C[i % C.length];
    el.style.width = R(6, 10) + 'px'; el.style.height = R(10, 16) + 'px';
    layer.appendChild(el);
    const x = R(0, W), dx = R(-80, 80), r0 = R(0, 360), r1 = r0 + R(-540, 540);
    const an = el.animate([
      { transform: `translate(${x}px,-20px) rotate(${r0}deg)` },
      { transform: `translate(${x + dx}px,${H + 20}px) rotate(${r1}deg)` },
    ], { duration: R(1500, 2400), delay: R(0, 250), easing: 'cubic-bezier(.3,.6,.6,1)', fill: 'backwards' });
    an.onfinish = () => el.remove();
  }
}
// Vibración del celular (la pone native.js en la app; en el navegador no hace nada)
let haptic = null;
export function setHaptic(f) { haptic = f; }
export function buzz(kind) { if (haptic) haptic(kind); }

// Late el letrero de la caja cuando llegan monedas
let bumpAt = 0;
const moneySign = document.getElementById('moneySign');
function bump() {
  const now = performance.now();
  if (now - bumpAt < 120) return;
  bumpAt = now;
  moneySign.classList.remove('bump'); void moneySign.offsetWidth; moneySign.classList.add('bump');
}

export function tickFx(rdt) {
  for (const p of game.fx) {
    p.t += rdt;
    if (p.k === 'dust') { p.x += p.vx * rdt * 0.6; p.y += p.vy * rdt * 0.6; p.z += p.vz * rdt; p.vz -= 2.2 * rdt; if (p.z < 0) p.z = 0; }
  }
  game.fx = game.fx.filter(p => p.t < p.life);
}
export const easeOut = f => 1 - Math.pow(1 - clamp(f, 0, 1), 3);
