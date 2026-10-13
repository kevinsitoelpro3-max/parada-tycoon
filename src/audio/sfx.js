import { mulberry32 } from '../utils.js';
import { audioCtx, sfxOut, sfxOn } from './sound.js';

/* ---------- Efectos de sonido ---------- */
// Cada efecto se arma con osciladores y ruido. Si el audio no está listo o los
// efectos están apagados, las funciones no hacen nada.

// Evita que el mismo sonido se repita demasiado seguido (por ejemplo, cobros a ×3)
const lastAt = {};
function ready(name, gap) {
  if (!sfxOn()) return false;
  const now = performance.now();
  if (now - (lastAt[name] ?? -1e9) < gap) return false;
  lastAt[name] = now;
  return true;
}

// Tono con envolvente: sube rápido y se apaga; f2 hace un barrido de frecuencia
function tone(f, dur, { type = 'sine', vol = 0.3, at = 0, f2 = null, attack = 0.005, out = sfxOut() } = {}) {
  const ac = audioCtx(), t = ac.currentTime + at;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(out);
  o.start(t); o.stop(t + dur + 0.02);
}

// Ruido blanco filtrado (golpes, lluvia). El ruido sale de un azar propio, no de Math.random.
let noiseBuf = null;
function noiseBuffer() {
  if (noiseBuf) return noiseBuf;
  const ac = audioCtx(), r = mulberry32(2024);
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1;
  return noiseBuf;
}
function noise(dur, { vol = 0.3, at = 0, filter = 'lowpass', freq = 1200, q = 0.8 } = {}) {
  const ac = audioCtx(), t = ac.currentTime + at;
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuffer();
  f.type = filter; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(sfxOut());
  s.start(t); s.stop(t + dur + 0.02);
}

// Claxon de tráiler: dos tonos graves desafinados un poco, con filtro
function horn(dur, at = 0, vol = 0.16) {
  const ac = audioCtx(), t = ac.currentTime + at;
  const f = ac.createBiquadFilter(), g = ac.createGain();
  f.type = 'lowpass'; f.frequency.value = 1100;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.setValueAtTime(vol, t + dur - 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  for (const hz of [196, 233]) {
    const o = ac.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = hz;
    o.connect(f); o.start(t); o.stop(t + dur + 0.02);
  }
  f.connect(g); g.connect(sfxOut());
}

function safe(fn) { return (...a) => { try { fn(...a); } catch (e) { /* el sonido nunca debe romper el juego */ } }; }

export const sfx = {
  click: safe(() => { if (ready('click', 40)) tone(1300, 0.04, { type: 'triangle', vol: 0.07 }); }),
  road: safe(() => { if (ready('road', 60)) { noise(0.06, { vol: 0.22, filter: 'bandpass', freq: 900, q: 1.2 }); tone(220, 0.07, { type: 'triangle', vol: 0.18 }); } }),
  build: safe(() => {
    if (!ready('build', 120)) return;
    noise(0.12, { vol: 0.3, filter: 'lowpass', freq: 700 });
    tone(150, 0.16, { type: 'triangle', vol: 0.3, f2: 90 });
    tone(523, 0.12, { type: 'triangle', vol: 0.12, at: 0.08 });
    tone(784, 0.18, { type: 'triangle', vol: 0.12, at: 0.15 });
  }),
  demolish: safe(() => {
    if (!ready('demolish', 90)) return;
    noise(0.22, { vol: 0.45, filter: 'lowpass', freq: 500 });
    tone(110, 0.2, { type: 'square', vol: 0.12, f2: 50 });
  }),
  cash: safe(() => {
    if (!ready('cash', 110)) return;
    tone(1568, 0.09, { type: 'square', vol: 0.06 });
    tone(2093, 0.22, { type: 'triangle', vol: 0.14, at: 0.06 });
  }),
  angry: safe(() => { if (ready('angry', 450)) horn(0.28); }),
  nope: safe(() => {
    if (!ready('nope', 150)) return;
    tone(196, 0.09, { type: 'square', vol: 0.09 });
    tone(147, 0.14, { type: 'square', vol: 0.09, at: 0.09 });
  }),
  upgrade: safe(() => {
    if (!ready('upgrade', 200)) return;
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, { type: 'triangle', vol: 0.2, at: i * 0.07 }));
  }),
  goal: safe(() => {
    if (!ready('goal', 400)) return;
    [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.32]].forEach(([f, at]) => tone(f, 0.22, { type: 'square', vol: 0.08, at }));
    [523, 659, 784].forEach(f => tone(f * 2, 0.5, { type: 'triangle', vol: 0.12, at: 0.44 }));
  }),
  dayEnd: safe(red => {
    if (!ready('dayEnd', 500)) return;
    const notes = red ? [659, 523, 392] : [784, 1047];
    notes.forEach((f, i) => tone(f, 0.6, { type: 'sine', vol: 0.22, at: i * 0.16 }));
  }),
  rush: safe(() => {
    if (!ready('rush', 1000)) return;
    tone(700, 0.45, { type: 'triangle', vol: 0.12, f2: 1050 });
    tone(1050, 0.45, { type: 'triangle', vol: 0.12, f2: 700, at: 0.45 });
  }),
  caravan: safe(() => { if (ready('caravan', 1000)) { horn(0.22); horn(0.4, 0.3); } }),
  blackout: safe(() => {
    if (!ready('blackout', 800)) return;
    tone(120, 0.8, { type: 'sawtooth', vol: 0.1, f2: 40 });
    noise(0.12, { vol: 0.2, filter: 'highpass', freq: 3000, at: 0.02 });
  }),
  gameOver: safe(() => {
    if (!ready('gameOver', 1000)) return;
    [[392, 0], [370, 0.3], [349, 0.6], [330, 0.9]].forEach(([f, at]) => tone(f, at === 0.9 ? 1.1 : 0.32, { type: 'triangle', vol: 0.2, at }));
  })
};

// Lluvia: ruido suave continuo mientras dura el evento
let rainSrc = null, rainGain = null;
export const setRain = safe(on => {
  const ac = audioCtx();
  if (!ac) return;
  if (on && !rainSrc) {
    rainSrc = ac.createBufferSource(); rainSrc.buffer = noiseBuffer(); rainSrc.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.5;
    rainGain = ac.createGain(); rainGain.gain.setValueAtTime(0.0001, ac.currentTime);
    rainGain.gain.exponentialRampToValueAtTime(0.09, ac.currentTime + 1.2);
    rainSrc.connect(f); f.connect(rainGain); rainGain.connect(sfxOut());
    rainSrc.start();
  } else if (!on && rainSrc) {
    const s = rainSrc, t = ac.currentTime;
    rainGain.gain.setTargetAtTime(0.0001, t, 0.4);
    s.stop(t + 2);
    rainSrc = null; rainGain = null;
  }
});
