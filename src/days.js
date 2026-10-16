import { WMAX, HMAX, LAND_STEP, DAY_SCALE, PERFECT_DAY_MIN, CLOSE_HOUR, HWY2_W, HWY2_COST } from './config.js';
import { $, pick, fmt, money } from './utils.js';
import { game, mode, totalUpkeep, landCost, emptyEvent, save } from './state.js';
import { fit, clampCam } from './camera.js';
import { buildOuterTrees } from './render/scene.js';
import { toast } from './ui/toast.js';
import { closeSheet } from './ui/sheet.js';
import { menuEl, overEl, renderMenu } from './ui/menu.js';
import { sfx } from './audio/sfx.js';
import { newContract } from './contracts.js';
import { finishService } from './trucks.js';
import { rollChoice } from './ui/choice.js';

/* ---------- Días, gastos y eventos ---------- */
export function rollEvent() {
  const ev = game.ev = emptyEvent();
  if (game.S.day < mode().eventsFrom || Math.random() > 0.6) return null;
  const k = pick(['lluvia', 'luz', 'diesel', 'caravana']);
  ev.type = k;
  if (k === 'lluvia') { ev.rain = true; ev.label = '🌧️ Lluvia'; return 'Hoy llueve: los tráileres van más despacio'; }
  if (k === 'luz') { ev.luzAt = (12 + Math.random() * 40) * DAY_SCALE; ev.label = '🔌 Apagón'; return 'Hoy anuncian un apagón: un negocio se quedará sin luz un rato'; }
  if (k === 'diesel') { ev.diesel = true; ev.label = '⛽ Más diésel'; return 'Hoy más tráileres vienen a cargar diésel'; }
  ev.caravanAt = (10 + Math.random() * 45) * DAY_SCALE; ev.label = '🚛 Caravana';
  return 'Hoy pasa una caravana de tráileres';
}
export function closeDay() {
  const S = game.S;
  // Amanece: los tráileres que pasaron la noche en la pensión pagan y se van
  const parked = game.trucks.filter(tr => tr.state === 'service' && tr.need === 'park');
  if (parked.length) {
    const before = S.money;
    for (const tr of parked) finishService(tr);
    toast(`🅿️ ${parked.length > 1 ? parked.length + ' tráileres pasaron' : 'Un tráiler pasó'} la noche en tu pensión: +$${fmt(S.money - before)}`, 3000, true);
  }
  const bill = totalUpkeep();
  S.money -= bill;
  if (S.dayLost === 0 && S.dayServed >= PERFECT_DAY_MIN) S.perfectDays++;
  S.bestDay = Math.max(S.bestDay, S.dayEarn);
  game.floats.push({ x: game.W / 2, y: game.H / 2, z: 2, text: '−$' + fmt(bill) + ' gastos', t: 0, neg: true });
  let msg = `Corte de caja de las ${CLOSE_HOUR}:00, día ${S.day}: vendiste $${fmt(S.dayEarn)} y pagaste $${fmt(bill)} de gastos.`;
  if (S.money < 0) {
    S.red++;
    const left = mode().redDays - S.red;
    if (left <= 0) { gameOver(); return; }
    msg += left === 1 ? ' Estás en rojo: si vuelves a cerrar en rojo, quiebras.' : ` Estás en rojo: ${left} cierres más en rojo y quiebras.`;
  } else S.red = 0;
  sfx.dayEnd(S.money < 0);
  S.day++; S.dayT = 0; S.dayEarn = 0; S.dayServed = 0; S.dayLost = 0;
  const em = rollEvent();
  toast(msg, 4200, true);
  toast(`Día ${S.day}` + (em ? `. ${em}.` : '.'), 3000, true);
  const cm = newContract();
  if (cm) toast(cm, 4200, true);
  rollChoice();
  save();
}
export function gameOver() {
  const S = game.S;
  S.over = true;
  sfx.gameOver();
  closeSheet(); menuEl.hidden = true;
  $('#overTxt').textContent = `Tu parada aguantó ${S.day} días en modo ${mode().name}, atendió ${fmt(S.served)} tráileres y terminó con ${S.rep.toFixed(1)} estrellas.`;
  overEl.hidden = false;
  save();
}
// Compra LAND_STEP filas hacia abajo ('down') o columnas hacia la derecha ('right')
export function expandLand(dir) {
  const S = game.S;
  const canDown = game.H + LAND_STEP <= HMAX, canRight = game.W + LAND_STEP <= WMAX;
  if ((dir === 'down' && !canDown) || (dir === 'right' && !canRight) || S.over) return;
  const c = landCost();
  if (S.money < c) { sfx.nope(); toast('Te faltan ' + money(c - S.money)); return; }
  S.money -= c;
  S.land = (S.land || 0) + 1;
  sfx.build();
  const newTile = x => ({ t: x === 0 ? 'hwy' : (x >= 2 && Math.random() < 0.2 ? 'tree' : 'grass') });
  if (dir === 'down') {
    const oldEnd = game.H + 2.6;
    for (let y = game.H; y < game.H + LAND_STEP; y++) for (let x = 0; x < game.W; x++) S.tiles.push(newTile(x));
    game.H += LAND_STEP; S.h = game.H;
    // los tráileres que iban a salir por el borde de abajo ahora salen por el nuevo borde
    for (const tr of game.trucks) for (const p of tr.path) if (Math.abs(p[1] - oldEnd) < 1e-6) p[1] = game.H + 2.6;
  } else {
    // rearmar la lista fila por fila: las casillas existentes son los mismos objetos y no cambian
    // de coordenadas, así que los tráileres en camino siguen igual
    const W = game.W, tiles = [];
    for (let y = 0; y < game.H; y++) {
      for (let x = 0; x < W; x++) tiles.push(S.tiles[y * W + x]);
      for (let x = W; x < W + LAND_STEP; x++) tiles.push(S.hwy2 && y === 0 ? { t: 'hwy2' } : newTile(x));
    }
    S.tiles = tiles;
    game.W += LAND_STEP; S.w = game.W;
  }
  buildOuterTrees();
  if (!game.userCam) fit(); else clampCam();
  toast(dir === 'down' ? 'Compraste 2 filas más de terreno hacia abajo' : 'Compraste 2 columnas más de terreno hacia la derecha');
  renderMenu();
  save();
}

// Carretera de arriba: la fila y = 0 (sin contar la principal) se vuelve carretera. Las calles que ya
// estaban ahí pasan a ser parte de ella; si hay un negocio o agua, primero hay que quitarlo.
export const canOpenTop = () => !game.S.hwy2 && game.W >= HWY2_W;
export function openTopRoad() {
  const S = game.S;
  if (!canOpenTop() || S.over) return;
  if (S.money < HWY2_COST) { sfx.nope(); toast('Te faltan ' + money(HWY2_COST - S.money)); return; }
  for (let x = 1; x < game.W; x++) {
    const t = S.tiles[x];
    if (t.t === 'bld' || t.t === 'water') { sfx.nope(); toast('Primero quita lo que hay en la fila de hasta arriba (negocios o agua)'); return; }
  }
  if (game.trucks.some(tr => tr.tiles && [...tr.tiles].some(k => k.endsWith(',0')))) { sfx.nope(); toast('Hay tráileres usando calles de la fila de arriba, espera tantito'); return; }
  S.money -= HWY2_COST;
  for (let x = 1; x < game.W; x++) { const t = S.tiles[x]; for (const k of Object.keys(t)) delete t[k]; t.t = 'hwy2'; }
  S.hwy2 = true;
  sfx.build();
  toast('🛣️ ¡Abriste la carretera de arriba! Traza calles que lleguen a ella: por ahí llegan más tráileres', 4200, true);
  renderMenu();
  save();
}
