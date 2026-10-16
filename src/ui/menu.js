import { WMAX, HMAX, LAND_STEP, KEY, MODES, HWY2_W, HWY2_COST } from '../config.js';
import { $, fmt } from '../utils.js';
import { game, mode, landCost, newGame, emptyEvent, totalUpkeep, save } from '../state.js';
import { fit } from '../camera.js';
import { expandLand, openTopRoad } from '../days.js';
import { buildOuterTrees } from '../render/scene.js';
import { toast, toastQueue } from './toast.js';
import { hudCache, renderGoal } from './hud.js';
import { closeSheet } from './sheet.js';
import { setTool } from './dock.js';

/* ---------- Menú ☰, partida nueva y pantalla de quiebra ---------- */
export const menuEl = $('#menu'), overEl = $('#over');

export function renderMenu() {
  const W = game.W, H = game.H, c = landCost();
  const canDown = H + LAND_STEP <= HMAX, canRight = W + LAND_STEP <= WMAX;
  $('#landTxt').textContent = canDown || canRight
    ? `Tu terreno mide ${W - 1} × ${H} casillas, sin contar la carretera (máximo ${WMAX - 1} × ${HMAX}). Cada compra agrega ${LAND_STEP} filas o ${LAND_STEP} columnas y cuesta ${'$' + fmt(c)}; la siguiente cuesta más.`
    : `Tu terreno mide ${W - 1} × ${H} casillas, el máximo.`;
  const down = $('#landDown'), right = $('#landRight');
  down.textContent = canDown ? `⬇ ${LAND_STEP} filas abajo` : 'Abajo: al máximo';
  right.textContent = canRight ? `➡ ${LAND_STEP} columnas a la derecha` : 'Derecha: al máximo';
  down.disabled = !canDown || game.S.money < c || game.S.over;
  right.disabled = !canRight || game.S.money < c || game.S.over;
  // Carretera de arriba: se ofrece con el terreno ancho y desaparece al abrirla
  const topTxt = $('#topTxt'), openTop = $('#openTop'), showTop = !game.S.hwy2;
  topTxt.hidden = openTop.hidden = !showTop;
  if (showTop) {
    const ready = W >= HWY2_W;
    topTxt.textContent = ready
      ? `Abre la carretera de arriba: la fila de hasta arriba se vuelve carretera y por ella llegan más tráileres (como la mitad más).`
      : `Cuando tu terreno tenga ${HWY2_W - 1} columnas o más (amplía a la derecha) podrás abrir una carretera arriba con más tráileres.`;
    openTop.textContent = `🛣️ Abrir carretera de arriba ($${fmt(HWY2_COST)})`;
    openTop.hidden = !ready;
    openTop.disabled = game.S.money < HWY2_COST || game.S.over;
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
  $('#landDown').addEventListener('click', () => expandLand('down'));
  $('#landRight').addEventListener('click', () => expandLand('right'));
  $('#openTop').addEventListener('click', openTopRoad);
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
