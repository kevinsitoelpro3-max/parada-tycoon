import { HMAX, KEY, MODES } from '../config.js';
import { $, fmt } from '../utils.js';
import { game, mode, landCost, newGame, emptyEvent, totalUpkeep, save } from '../state.js';
import { fit } from '../camera.js';
import { expandLand } from '../days.js';
import { buildOuterTrees } from '../render/scene.js';
import { toast, toastQueue } from './toast.js';
import { hudCache, renderGoal } from './hud.js';
import { closeSheet } from './sheet.js';
import { setTool } from './dock.js';

/* ---------- Menú ☰, partida nueva y pantalla de quiebra ---------- */
export const menuEl = $('#menu'), overEl = $('#over');

export function renderMenu() {
  const H = game.H;
  const landBtn = $('#landBtn');
  if (H >= HMAX) {
    $('#landTxt').textContent = `Tu terreno tiene ${H} filas, el máximo.`;
    landBtn.textContent = 'Terreno al máximo';
    landBtn.disabled = true;
  } else {
    $('#landTxt').textContent = `Tu terreno tiene ${H} filas. Puedes comprar 2 más hacia abajo, hasta ${HMAX}.`;
    landBtn.textContent = 'Ampliar por $' + fmt(landCost());
    landBtn.disabled = game.S.money < landCost() || game.S.over;
  }
  $('#modeTxt').textContent = `Estás jugando en ${mode().name}. ${MODES.dificil.desc} Empezar de nuevo borra tu partida actual.`;
  for (const b of document.querySelectorAll('#menuModes .btn')) b.classList.toggle('primary', b.dataset.mode === game.S.mode && !b.classList.contains('armed'));
}

export function startNew(modeKey) {
  try { localStorage.removeItem(KEY); } catch (_) {}
  newGame(modeKey);
  game.trucks = []; game.floats = []; game.puffs = []; game.ev = emptyEvent(); game.spawnT = 1.2;
  toastQueue.length = 0;
  for (const k in hudCache) delete hudCache[k];
  game.billCache = totalUpkeep();
  menuEl.hidden = true; overEl.hidden = true; closeSheet(); setTool('none'); renderGoal(false);
  buildOuterTrees();
  game.userCam = false; fit();
  save();
  toast(`Partida nueva en ${MODES[game.S.mode].name}: empieza trazando una calle`, 3000);
}

export function setupMenu() {
  $('#landBtn').addEventListener('click', expandLand);
  $('#menuBtn').addEventListener('click', () => {
    if (game.S.over) return;
    closeSheet();
    menuEl.hidden = !menuEl.hidden;
    if (!menuEl.hidden) renderMenu();
  });
  $('#closeMenu').addEventListener('click', () => { menuEl.hidden = true; });

  // En el menú hay que tocar dos veces el modo para no borrar la partida por accidente
  let armed = null, armTimer = null;
  for (const b of document.querySelectorAll('#menuModes .btn')) {
    b.addEventListener('click', () => {
      if (armed !== b) {
        if (armed) { armed.classList.remove('armed'); armed.textContent = MODES[armed.dataset.mode].name; }
        armed = b; b.classList.add('armed'); b.textContent = 'Toca otra vez';
        clearTimeout(armTimer);
        armTimer = setTimeout(() => { if (armed) { armed.classList.remove('armed'); armed.textContent = MODES[armed.dataset.mode].name; armed = null; renderMenu(); } }, 3000);
        renderMenu();
        return;
      }
      clearTimeout(armTimer);
      b.classList.remove('armed'); b.textContent = MODES[b.dataset.mode].name; armed = null;
      startNew(b.dataset.mode);
    });
  }
  for (const b of document.querySelectorAll('#overModes .btn')) b.addEventListener('click', () => startNew(b.dataset.mode));
}
