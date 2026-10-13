import { $ } from '../utils.js';

/* ---------- Avisos (toast) ---------- */
const toastEl = $('#toast');
export const toastQueue = [];
let toastTimer = null, toastBusyUntil = 0, lastMsg = '', lastMsgT = 0;
function showToast(msg, ms) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  toastBusyUntil = performance.now() + ms;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
    if (toastQueue.length) setTimeout(() => { if (toastQueue.length) showToast(...toastQueue.shift()); }, 260);
  }, ms);
}
// queued = true: espera a que termine el aviso actual en vez de reemplazarlo
export function toast(msg, ms = 2300, queued = false) {
  const now = performance.now();
  if (queued) {
    if (now < toastBusyUntil || toastQueue.length) { toastQueue.push([msg, ms]); return; }
    showToast(msg, ms); return;
  }
  if (msg === lastMsg && now - lastMsgT < 1500) return;
  lastMsg = msg; lastMsgT = now;
  showToast(msg, ms);
}
