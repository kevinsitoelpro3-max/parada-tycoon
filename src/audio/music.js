import { audioCtx, musicOut, musicOn, onPrefsChange } from './sound.js';

/* ---------- Música ---------- */
// Melodía de carretera de 8 compases que se repite, en Do mayor (Do–Sol–Lam–Fa).
// Se programa un poco por adelantado con el reloj del audio para que no se trabe.

const BPM = 96, RUSH_TEMPO = 1.15;  // en hora pico la música va 15 % más rápido
const H = -1, R = 0;               // H: sostener la nota anterior; R: silencio
// Una nota MIDI por corchea, 8 por compás
const MELODY = [
  72, H, 76, H, 79, H, 76, 74,   74, H, 71, H, 67, H, 71, 74,
  72, H, 69, H, 72, 76, H, 74,   72, H, 69, H, 65, H, R, R,
  76, H, 79, H, 81, 79, 76, H,   74, H, 79, H, 74, 71, 67, H,
  72, 74, 76, H, 72, H, 69, H,   65, H, 69, H, 72, H, R, R
];
const CHORDS = [  // [bajo, acorde] por compás
  [48, [60, 64, 67]], [43, [59, 62, 67]], [45, [57, 60, 64]], [41, [57, 60, 65]],
  [48, [60, 64, 67]], [43, [59, 62, 67]], [45, [57, 60, 64]], [41, [57, 60, 65]]
];
const hz = m => 440 * Math.pow(2, (m - 69) / 12);

let mode = 'off';     // 'off' | 'normal' | 'rush'
let step = 0, nextT = 0, timer = null;

function note(m, t, dur, type, vol, cutoff) {
  const ac = audioCtx();
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.value = hz(m);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(vol * 0.5, t + dur * 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  if (cutoff) {
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff;
    o.connect(f); f.connect(g);
  } else o.connect(g);
  g.connect(musicOut());
  o.start(t); o.stop(t + dur + 0.02);
}
function tick(t, eighth) {
  const i = step % MELODY.length, inBar = i % 8;
  const [bass, chord] = CHORDS[Math.floor(i / 8)];
  // Melodía: cuenta cuántas corcheas se sostiene la nota
  const m = MELODY[i];
  if (m > 0) {
    let len = 1;
    while (MELODY[(i + len) % MELODY.length] === H) len++;
    note(m, t, eighth * len * 0.95, 'triangle', 0.22);
  }
  // Bajo "bum" en 1 y quinta en 3; acorde "chas" en los contratiempos
  if (inBar === 0) note(bass, t, eighth * 1.8, 'triangle', 0.3);
  if (inBar === 4) note(bass + 7, t, eighth * 1.8, 'triangle', 0.26);
  if (inBar === 2 || inBar === 6) for (const c of chord) note(c, t, eighth * 0.7, 'square', 0.035, 1400);
  step++;
}
function schedule() {
  const ac = audioCtx();
  if (!ac || mode === 'off' || !musicOn()) return;
  const eighth = 60 / (BPM * (mode === 'rush' ? RUSH_TEMPO : 1)) / 2;
  if (nextT < ac.currentTime) nextT = ac.currentTime + 0.05;  // tras una pausa, retoma sin amontonar notas
  while (nextT < ac.currentTime + 0.25) { tick(nextT, eighth); nextT += eighth; }
}
function run() {
  if (timer || mode === 'off' || !audioCtx() || !musicOn()) return;
  schedule();
  timer = setInterval(() => { try { schedule(); } catch (e) { /* nada */ } }, 60);
}
function halt() { clearInterval(timer); timer = null; }

// 'off' detiene la música; 'normal' o 'rush' la tocan (si está encendida en las preferencias)
// Se llama en cada cuadro: también arranca la música en cuanto el audio se desbloquea.
export function setMusicMode(m) {
  if (mode === 'off' && m !== 'off') { step = 0; nextT = 0; }
  mode = m;
  if (mode === 'off') halt(); else run();
}
onPrefsChange(() => { if (musicOn()) run(); else halt(); });
