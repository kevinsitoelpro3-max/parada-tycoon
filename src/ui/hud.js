import { DAY_LEN } from '../config.js';
import { $, stage, clamp, fmt, money } from '../utils.js';
import { game, inRush, clockNow } from '../state.js';
import { GOALS } from '../goals.js';
import { cam, fit, zoomAt } from '../camera.js';
import { toolCost } from '../tools.js';
import { tools } from './dock.js';
import { sheetEl, renderSheet } from './sheet.js';
import { menuEl, renderMenu } from './menu.js';

/* ---------- Marcador (HUD), meta actual y botones de velocidad y zoom ---------- */
const moneyEl = $('#money'), moneySign = $('#moneySign'), moneyLabel = $('#moneyLabel');
const servedEl = $('#served'), lostEl = $('#lost'), repStars = $('#repStars'), repNum = $('#repNum');
const goalEl = $('#goal'), goalTag = $('#goalTag'), goalTxt = $('#goalTxt'), goalPrize = $('#goalPrize');
const dayName = $('#dayName'), dayDone = $('#dayDone'), dayMark = $('#dayMark'), dayChip = $('#dayChip'), dayBill = $('#dayBill');
// Últimos valores mostrados, para tocar el DOM solo cuando algo cambia
export const hudCache = {};

export function hud() {
  const S = game.S;
  if (hudCache.m !== S.money) {
    hudCache.m = S.money;
    moneyEl.textContent = money(S.money);
    const red = S.money < 0;
    moneySign.classList.toggle('red', red);
    moneyLabel.textContent = red ? 'En rojo' : 'Caja';
    for (const b of tools) {
      const c = toolCost(b.dataset.tool);
      b.classList.toggle('poor', c > 0 && S.money < c);
    }
    if (!sheetEl.hidden) renderSheet();
    if (!menuEl.hidden) renderMenu();
  }
  if (hudCache.s !== S.served) { hudCache.s = S.served; servedEl.textContent = fmt(S.served); }
  if (hudCache.l !== S.lost) { hudCache.l = S.lost; lostEl.textContent = fmt(S.lost); }
  const rr = Math.round(S.rep * 10) / 10;
  if (hudCache.r !== rr) {
    hudCache.r = rr;
    const n = clamp(Math.round(S.rep), 1, 5);
    repStars.textContent = '★'.repeat(n) + '☆'.repeat(5 - n);
    repNum.textContent = rr.toFixed(1);
  }
  const dayTxt = `Día ${S.day}\u00a0·\u00a0${clockNow()}`;
  if (hudCache.d !== dayTxt) { hudCache.d = dayTxt; dayName.textContent = dayTxt; }
  const f = clamp(S.dayT / DAY_LEN, 0, 1);
  dayDone.style.transform = `scaleX(${f.toFixed(4)})`;
  dayMark.style.left = (f * 100).toFixed(2) + '%';
  const rush = !S.over && inRush();
  const chip = rush ? '🚨 Hora pico' : game.ev.label;
  if (hudCache.c !== chip) {
    hudCache.c = chip;
    dayChip.textContent = chip;
    dayChip.hidden = !chip;
    dayChip.classList.toggle('rush', rush);
  }
  if (hudCache.b !== game.billCache) { hudCache.b = game.billCache; dayBill.textContent = 'Gastos $' + fmt(game.billCache); }
}
export function renderGoal(flash) {
  const S = game.S;
  const gl = GOALS[S.goal];
  if (gl) {
    goalTag.textContent = `Meta ${S.goal + 1}/${GOALS.length}`;
    goalTxt.textContent = gl.text;
    goalPrize.textContent = 'Premio $' + fmt(gl.prize);
    goalPrize.hidden = false;
  } else {
    goalTag.textContent = 'Listo';
    goalTxt.textContent = 'Eres leyenda de la carretera. Prueba el modo Difícil desde el menú ☰.';
    goalPrize.hidden = true;
  }
  if (flash) { goalEl.classList.remove('flash'); void goalEl.offsetWidth; goalEl.classList.add('flash'); }
}
export function setupHud() {
  $('#speed').addEventListener('click', e => {
    game.speed = game.speed === 1 ? 2 : game.speed === 2 ? 3 : 1;
    e.currentTarget.textContent = '×' + game.speed;
  });
  $('#zin').addEventListener('click', () => zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, cam.z * 1.25));
  $('#zout').addEventListener('click', () => zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, cam.z / 1.25));
  $('#zfit').addEventListener('click', () => { game.userCam = false; fit(); });
}
