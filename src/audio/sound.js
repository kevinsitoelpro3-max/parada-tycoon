/* ---------- Audio: contexto, volúmenes y preferencias ---------- */
// Todo el sonido se genera con Web Audio (sin archivos). Los celulares no dejan
// sonar nada hasta que la persona toca la pantalla, por eso unlock() se llama
// desde el botón de jugar de la pantalla de inicio.
// Ojo: aquí nunca se usa Math.random, para no alterar el azar del juego.

const PREFS_KEY = 'parada-tycoon-audio';
export const prefs = { music: true, sfx: true };
try {
  const p = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
  if (typeof p.music === 'boolean') prefs.music = p.music;
  if (typeof p.sfx === 'boolean') prefs.sfx = p.sfx;
} catch (e) { /* sin almacenamiento: valores por defecto */ }

const VOL = { master: 0.9, music: 0.32, sfx: 0.8 };
let ac = null, master = null, musicBus = null, sfxBus = null;
const listeners = [];

export const audioCtx = () => ac;
export const musicOut = () => musicBus;
export const sfxOut = () => sfxBus;
export const sfxOn = () => !!ac && prefs.sfx && ac.state === 'running';
export const musicOn = () => !!ac && prefs.music;

// Avisa a la música (y a quien lo necesite) cuando cambian las preferencias
export function onPrefsChange(fn) { listeners.push(fn); }

export function unlock() {
  try {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain(); master.gain.value = VOL.master; master.connect(ac.destination);
      musicBus = ac.createGain(); musicBus.connect(master);
      sfxBus = ac.createGain(); sfxBus.connect(master);
      applyGains();
      // Un sonido vacío dentro del toque termina de desbloquear el audio en iPhone
      const b = ac.createBuffer(1, 1, 22050), s = ac.createBufferSource();
      s.buffer = b; s.connect(ac.destination); s.start(0);
    }
    if (ac.state === 'suspended' && !document.hidden) ac.resume();
  } catch (e) { /* sin audio: el juego sigue */ }
}

function applyGains() {
  if (!ac) return;
  const t = ac.currentTime;
  musicBus.gain.setTargetAtTime(prefs.music ? VOL.music : 0, t, 0.05);
  sfxBus.gain.setTargetAtTime(prefs.sfx ? VOL.sfx : 0, t, 0.02);
}

export function setPref(k, on) {
  prefs[k] = on;
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { /* nada */ }
  applyGains();
  renderToggles();
  for (const fn of listeners) fn();
}

// Botones con data-audio="music" o data-audio="sfx" (pantalla de inicio y menú)
export function renderToggles() {
  for (const b of document.querySelectorAll('[data-audio]')) {
    const k = b.dataset.audio, on = prefs[k];
    b.setAttribute('aria-pressed', String(on));
    b.textContent = (k === 'music' ? '🎵 Música: ' : '🔊 Efectos: ') + (on ? 'sí' : 'no');
  }
}

// Pausar y retomar todo el audio (por ejemplo, cuando la app de Android pasa a segundo plano)
export function pauseAudio() { try { if (ac) ac.suspend(); } catch (e) { /* nada */ } }
export function resumeAudio() { try { if (ac && !document.hidden) ac.resume(); } catch (e) { /* nada */ } }

export function setupSound() {
  for (const b of document.querySelectorAll('[data-audio]')) {
    b.addEventListener('click', () => { unlock(); setPref(b.dataset.audio, !prefs[b.dataset.audio]); });
  }
  renderToggles();
  // Si cambias de app o bloqueas el celular, el audio se pausa
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseAudio(); else resumeAudio();
  });
}
