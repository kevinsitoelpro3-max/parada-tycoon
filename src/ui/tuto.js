import { KINDS, DIRS } from '../config.js';
import { GOALS } from '../goals.js';
import { game, T } from '../state.js';
import { check } from '../tools.js';
import { $, fmt } from '../utils.js';
import { toast } from './toast.js';
import { isStartOpen } from './start.js';
import { menuEl, overEl } from './menu.js';
import { sheetEl } from './sheet.js';

/* ---------- Guía de Lupe (tutorial de primera partida) ----------
   Lupe, la encargada de la parada, explica las primeras 6 metas con un letrero abajo,
   un aro amarillo en el botón que toca usar y una marca en la casilla sugerida del mapa.
   Solo LEE la partida: nunca cambia la herramienta, el dinero, la pausa ni la velocidad,
   y no tapa toques (el letrero deja pasar los dedos; solo sus botones los reciben).
   El paso no se guarda: sale de la meta actual (game.S.goal) y de la herramienta elegida.
   Su estado vive en game.tuto y se guarda aparte, en localStorage 'parada-tycoon-tuto'. */
const KEY = 'parada-tycoon-tuto';
const tutoEl = $('#tuto'), txtEl = $('#tutoTxt'), liveEl = $('#tutoLive'), rowEl = $('#tutoRow'), nextEl = $('#tutoNext'), ringEl = $('#tutoRing');
const dockEl = document.querySelector('.dock'), toastEl = $('#toast'), stageEl = $('#stage'), upEl = $('#shUp');

// Textos de cada paso. {X} es lo que falta de dinero (redondeado a decenas)
const TXT = {
  calle1: '¡Hola! Soy Lupe, la encargada. Los tráileres necesitan por dónde entrar: toca 🛣️ Calle.',
  calle2: 'Arrastra desde la carretera, $20 por casilla. Guarda $250 para la gasolinera.',
  gas1: '¡Eso! Ahora abre una gasolinera: toca ⛽ Gasolina.',
  gas0: 'Te faltan {X} para la gasolinera. Ya no gastes en calles.',
  // Sin ningún negocio no entra dinero: esperar no sirve
  gasN: 'Sin negocios no entra dinero y te faltan {X}. Empieza otra partida desde ☰.',
  gas2: 'Ponla donde marca la flecha amarilla, pegada a tu calle.',
  serv: '¡Ya vendes diésel! Arriba ves 🚚 los que atiendes y 😠 los que se van. Atiende 10.',
  food1: 'Los que piden 🍗 se van enojados. Abre un comedor: toca 🍗 Comedor.',
  food0: 'Junta $400 para el comedor. Te faltan {X}: espera a que paguen los tráileres.',
  food2: 'Ponlo donde marca la flecha amarilla. Si ya no hay lugar, alarga tu calle.',
  sleep1: 'De noche muchos piden 💤. Abre un hotel de paso: toca 🛏️ Hotel.',
  sleep0: 'Junta $600 para el hotel de paso. Te faltan {X}.',
  sleep2: 'Ponlo donde marca la flecha amarilla. Si ya no hay lugar, alarga tu calle.',
  up1: 'Mejora un negocio para que atienda a más tráileres a la vez. Toca ✋ Ver.',
  up2: 'Ahora toca tu gasolinera (o cualquier negocio).',
  up3: 'Toca «Mejorar». Si te falta dinero, cierra la ficha y vuelve más tarde.',
  fin: '¡Ya sabes lo básico! Sigue las metas de arriba. Al cerrar el día pagas gastos: no quedes en rojo.',
  rev0: 'Repaso 1/4: Las calles salen de la carretera. Los negocios van pegados a una calle.',
  rev1: 'Repaso 2/4: Cada tráiler pide ⛽, 🍗 o 💤. Si no lo tienes o está lleno, se va enojado.',
  rev2: 'Repaso 3/4: Con ✋ Ver tocas un negocio para mejorarlo: atiende a más y cobra más.',
  rev3: 'Repaso 4/4: Las metas dan premios. Al cerrar el día pagas gastos: no quedes en rojo.'
};
// Botón de abajo (los demás pasos solo tienen ✕)
const BTN = { fin: '¡Listo!', rev0: 'Siguiente', rev1: 'Siguiente', rev2: 'Siguiente', rev3: '¡Listo!' };
// Elemento que rodea el aro en cada paso
const TOOL = k => `.tool[data-tool="${k}"]`;
const RING = {
  calle1: TOOL('road'), gas1: TOOL('gas'), gas0: '#moneySign', gasN: '#menuBtn', serv: '.hud .stats',
  food1: TOOL('food'), food0: '#moneySign', sleep1: TOOL('sleep'), sleep0: '#moneySign',
  up1: TOOL('none'), up3: '#shUp', fin: '#goal',
  rev0: TOOL('road'), rev1: '.hud .stats', rev2: TOOL('none'), rev3: '#goal'
};
// Pasos con faltante de dinero: qué negocio se quiere comprar
const SHORT = { gas0: 'gas', gasN: 'gas', food0: 'food', sleep0: 'sleep' };
// Pasos con marca en el mapa: qué casilla buscar
const MARK = { calle2: 'road', gas2: 'gas', food2: 'food', sleep2: 'sleep', up2: 'up' };

// Lo que se dibuja ahora: cache de lo último escrito en el DOM, para no tocarlo cada cuadro
const view = { shown: false, ring: '', top: '' };

/* ---------- Guardado aparte ---------- */
function readSt() {
  try {
    const o = JSON.parse(localStorage.getItem(KEY));
    return o && o.v === 1 && ['on', 'done', 'skip', 'vet'].includes(o.st) ? o.st : null;
  } catch (_) { return null; }
}
function writeSt(st) {
  try { localStorage.setItem(KEY, JSON.stringify({ v: 1, st })); } catch (_) {}
}

/* ---------- Paso actual (solo lee la partida) ---------- */
const prevId = () => game.tuto.key.split('|')[0];
const has = (t, k) => game.S.tiles.some(o => o.t === t && (!k || o.k === k));
function stepId() {
  const S = game.S, g = S.goal, tool = game.tool, tu = game.tuto;
  // El repaso es para quien ya pasó la guía; en una partida nueva vuelve la guía paso a paso
  if (tu.review >= 0 && g < 6) { tu.review = -1; tu.key = ''; }
  if (tu.review >= 0) return 'rev' + tu.review;
  if (g >= 6) return 'fin';
  // Meta cumplida pero sim.js aún no entrega el premio (hasta 0.4 s): se queda el paso de antes
  if (GOALS[g].ok() && prevId()) return prevId();
  const sheetOpen = !sheetEl.hidden && game.sel;
  // Sin ninguna calle (por ejemplo, si la demoliste) no hay dónde poner negocios: primero la calle
  if (g >= 1 && g <= 4 && !has('road')) return tool === 'road' ? 'calle2' : 'calle1';
  switch (g) {
    case 0: return tool === 'road' ? 'calle2' : 'calle1';
    case 2: if (has('bld', 'gas')) return 'serv';
    // Sin gasolinera (la demoliste) se vuelve a pedir, como en la meta 1
    // falls through
    case 1: return tool === 'gas' ? 'gas2' : S.money < KINDS.gas.cost ? (has('bld') ? 'gas0' : 'gasN') : 'gas1';
    case 3: return tool === 'food' ? 'food2' : S.money < KINDS.food.cost ? 'food0' : 'food1';
    case 4: return tool === 'sleep' ? 'sleep2' : S.money < KINDS.sleep.cost ? 'sleep0' : 'sleep1';
    default: {
      const t = sheetOpen ? T(game.sel.x, game.sel.y) : null;
      if (t && t.t === 'bld') return 'up3';
      return tool === 'none' ? 'up2' : 'up1';
    }
  }
}
// Lo que falta para comprar, redondeado a decenas para no reescribir el texto con cada peso
const shortBy = id => SHORT[id] ? Math.ceil((KINDS[SHORT[id]].cost - game.S.money) / 10) * 10 : null;

/* ---------- Casilla sugerida ---------- */
function findTile(kind) {
  const W = game.W, H = game.H;
  if (kind === 'road') {
    const h = Math.floor(H / 2);
    for (let i = 0; i < H * 2; i++) {
      // Orden h, h-1, h+1, h-2, h+2...
      const y = i % 2 ? h - Math.ceil(i / 2) : h + i / 2;
      if (y < 0 || y >= H) continue;
      if (check('road', 1, y).ok) return { x: 1, y, z: 0.6 };
    }
    return null;
  }
  if (kind === 'up') {
    let any = null;
    for (let y = 0; y < H; y++) for (let x = 1; x < W; x++) {
      const t = T(x, y);
      if (t.t !== 'bld') continue;
      if (t.k === 'gas') return { x, y, z: 1.6 };
      if (!any) any = { x, y, z: 1.6 };
    }
    return any;
  }
  for (let y = 0; y < H; y++) for (let x = 1; x < W; x++) {
    if (T(x, y).t !== 'road') continue;
    for (const [dx, dy] of DIRS) if (check(kind, x + dx, y + dy).ok) return { x: x + dx, y: y + dy, z: 0.6 };
  }
  return null;
}
// Firma del terreno: si cambia, la casilla sugerida se vuelve a buscar
function sigNow() {
  let roads = 0, blds = 0;
  for (const t of game.S.tiles) { if (t.t === 'road') roads++; else if (t.t === 'bld') blds++; }
  return game.W + ',' + game.H + ',' + roads + ',' + blds;
}
export const tutoTile = () => game.tuto.tile || null;

/* ---------- Aro sobre el botón del paso ---------- */
function hideRing() {
  if (!ringEl.hidden) ringEl.hidden = true;
  view.ring = '';
}
function placeRing(sel) {
  const el = sel && document.querySelector(sel);
  if (!el) return hideRing();
  const b = el.getBoundingClientRect();
  let l = b.left, r = b.right;
  if (b.width === 0 || b.height === 0) return hideRing();
  if (dockEl.contains(el)) {
    const d = dockEl.getBoundingClientRect();
    l = Math.max(l, d.left); r = Math.min(r, d.right);
    if (r - l < b.width / 2) return hideRing();
  }
  const box = [Math.round(l - 3), Math.round(b.top - 3), Math.round(r - l + 6), Math.round(b.height + 6)];
  const k = box.join(',');
  if (k !== view.ring) {
    const s = ringEl.style;
    s.left = box[0] + 'px'; s.top = box[1] + 'px'; s.width = box[2] + 'px'; s.height = box[3] + 'px';
    view.ring = k;
  }
  if (ringEl.hidden) ringEl.hidden = false;
}
// Desliza la barra de herramientas para que se vea el botón (una sola vez por paso)
function scrollDock(sel) {
  const el = sel && document.querySelector(sel);
  if (!el || !dockEl.contains(el)) return;
  const b = el.getBoundingClientRect(), d = dockEl.getBoundingClientRect();
  if (b.left >= d.left && b.right <= d.right) return;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  dockEl.scrollTo({ left: dockEl.scrollLeft + (b.left - d.left) - 8, behavior: reduce ? 'auto' : 'smooth' });
}

/* ---------- Mostrar y ocultar ---------- */
function hideAll() {
  if (view.shown) { tutoEl.hidden = true; view.shown = false; }
  hideRing();
  game.tuto.tile = null; game.tuto.sig = '';   // al volver a mostrarse se busca otra vez la casilla
}
function render(id, X, changed) {
  const txt = TXT[id].replace('{X}', '$' + fmt(X));
  txtEl.textContent = txt;
  // El lector de pantalla solo lee el paso nuevo, no cada cambio del faltante de dinero
  if (changed) liveEl.textContent = txt;
  const btn = BTN[id];
  rowEl.hidden = !btn;
  if (btn) nextEl.textContent = btn;
  tutoEl.classList.toggle('top', id === 'up3');
}
// Pone el letrero debajo del aviso amarillo cuando está arriba (paso up3) y hay aviso
function placeTop(id) {
  let top = '';
  // También mientras el aviso se desvanece, para que no se encimen
  if (id === 'up3' && (toastEl.classList.contains('show') || +getComputedStyle(toastEl).opacity > 0)) {
    const st = stageEl.getBoundingClientRect().top;
    const y = Math.round(toastEl.getBoundingClientRect().bottom - st + 6);
    // Si debajo del aviso taparía «Mejorar», se queda arriba (8 px), encima del aviso
    const up = upEl.getBoundingClientRect();
    if (!up.height || y + tutoEl.offsetHeight <= up.top - st - 6) top = y + 'px';
  }
  if (top !== view.top) { tutoEl.style.top = top; view.top = top; }
}

// Se llama en cada cuadro, después de hud(). Escribe en el DOM solo cuando algo cambia.
export function tickTuto() {
  const tu = game.tuto;
  if (!tu.on || isStartOpen() || !menuEl.hidden || !overEl.hidden || game.S.over || !document.getElementById('choice').hidden) return hideAll();
  const id = stepId();
  if (!sheetEl.hidden && id !== 'up3') return hideAll();
  const X = shortBy(id), key = id + '|' + (X === null ? '' : X);
  const changed = id !== prevId() || !tu.key;
  if (key !== tu.key) { render(id, X, changed); tu.key = key; }
  if (changed) tu.sig = '';
  // Casilla sugerida: al cambiar de paso o cuando cambian calles, negocios o el tamaño del terreno
  if (MARK[id]) {
    const sig = sigNow();
    if (sig !== tu.sig) { tu.sig = sig; tu.tile = findTile(MARK[id]); }
  } else if (tu.tile) tu.tile = null;
  if (!view.shown) { tutoEl.hidden = false; view.shown = true; }
  placeTop(id);
  if (tu.scrolled !== id) { tu.scrolled = id; scrollDock(RING[id]); }
  placeRing(RING[id]);
}

// Apaga la guía y guarda cómo terminó ('done' o 'skip')
function stop(st) {
  const tu = game.tuto;
  writeSt(st);
  tu.on = false; tu.review = -1; tu.key = ''; tu.scrolled = '';
  hideAll();
}

export function setupTuto() {
  const tu = game.tuto, st = readSt();
  if (st === null) {
    // Primera vez: solo sale sola si la partida no tiene avance (los de antes no la ven)
    // Igual que hasProgress() pero sin !S.over: una partida en quiebra también cuenta como avance
    const S = game.S;
    const vet = S.day > 1 || S.served > 0 || S.lost > 0 || S.goal > 0 || S.tiles.some(t => t.t === 'road' || t.t === 'bld');
    writeSt(vet ? 'vet' : 'on');
    tu.on = !vet;
  } else tu.on = st === 'on';

  $('#tutoSkip').addEventListener('click', () => {
    const inReview = tu.review >= 0;
    stop(inReview ? 'done' : 'skip');
    toast('Puedes volver a ver la guía desde ☰', 2600);
  });
  nextEl.addEventListener('click', () => {
    const id = prevId();
    if (id === 'fin' || id === 'rev3') return stop('done');
    if (tu.review >= 0 && tu.review < 3) tu.review++;
  });
  $('#tutoBtn').addEventListener('click', () => {
    menuEl.hidden = true;
    writeSt('on');
    tu.on = true;
    tu.review = game.S.goal >= 6 ? 0 : -1;
    tu.key = ''; tu.scrolled = '';
  });
}

