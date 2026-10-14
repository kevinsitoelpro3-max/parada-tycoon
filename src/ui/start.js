import { MODES } from '../config.js';
import { $, money } from '../utils.js';
import { game, save } from '../state.js';
import { unlock } from '../audio/sound.js';
import { closeSheet } from './sheet.js';
import { menuEl, startNew } from './menu.js';

/* ---------- Pantalla de inicio ---------- */
// Mientras está abierta el juego queda en pausa (game.paused). El primer toque
// en Continuar o en un modo también desbloquea el audio del celular.
const startEl = $('#start');
const modeBtns = [...document.querySelectorAll('#startModes .btn')];
let onContinue = null, armed = null, armTimer = null;

// Hay algo que perder si ya se jugó algo y la partida no terminó en quiebra
const hasProgress = () => {
  const S = game.S;
  return !S.over && (S.day > 1 || S.served > 0 || S.lost > 0 || S.tiles.some(t => t.t === 'road' || t.t === 'bld'));
};

function disarm() {
  clearTimeout(armTimer);
  if (armed) { armed.classList.remove('armed'); armed.textContent = MODES[armed.dataset.mode].name; armed = null; }
}
function renderStart() {
  const S = game.S, keep = hasProgress();
  disarm();
  $('#startCont').hidden = !keep;
  if (keep) {
    $('#startSave').textContent = `Día ${S.day} · Caja ${money(S.money)} · ★ ${S.rep.toFixed(1)} · ${MODES[S.mode].name}`;
  }
  $('#startNewTitle').textContent = keep ? 'O empieza otra partida' : 'Elige la dificultad';
  $('#startHint').textContent = keep
    ? 'Empezar de nuevo borra tu partida actual: toca el modo dos veces.'
    : 'Fácil: más dinero y gastos bajos. Difícil: quiebras al primer cierre en rojo.';
  for (const b of modeBtns) b.classList.toggle('primary', !keep && b.dataset.mode === 'normal');
}

// onFirstContinue: lo que se muestra al seguir la partida (por ejemplo, un aviso de bienvenida)
export function openStart(onFirstContinue = null) {
  onContinue = onFirstContinue;
  game.paused = true;
  closeSheet(); menuEl.hidden = true;
  renderStart();
  startEl.hidden = false;
}
export const isStartOpen = () => !startEl.hidden;
function closeStart() {
  disarm();
  startEl.hidden = true;
  game.paused = false;
}

export function setupStart() {
  $('#startContinue').addEventListener('click', () => {
    unlock();
    closeStart();
    const fn = onContinue; onContinue = null;
    if (fn) fn();
  });
  for (const b of modeBtns) {
    b.addEventListener('click', () => {
      unlock();
      if (hasProgress() && armed !== b) {
        disarm();
        armed = b; b.classList.add('armed'); b.textContent = 'Toca otra vez';
        armTimer = setTimeout(disarm, 3000);
        return;
      }
      onContinue = null;
      closeStart();
      startNew(b.dataset.mode);
    });
  }
  $('#toStart').addEventListener('click', () => { save(); openStart(); });
}
