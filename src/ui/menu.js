import { WMAX, HMAX, LAND_STEP, KEY, MODES, HWY2_W, HWY2_COST, PERKS, PERK_MAX } from '../config.js';
import { $, fmt } from '../utils.js';
import { game, mode, landCost, newGame, emptyEvent, totalUpkeep, save, levelInfo, perk, perkVal } from '../state.js';
import { GOALS } from '../goals.js';
import { population, hap, hapFace, homes } from '../city.js';
import { buyPerk } from '../progress.js';
import { coinsFrom, confetti } from '../fx.js';
import { dailyInfo, claimDaily, retosInfo, retoText, retoDone, claimReto, dailyReady, RETOS_DAY } from '../daily.js';
import { fit } from '../camera.js';
import { expandLand, openTopRoad } from '../days.js';
import { buildOuterTrees } from '../render/scene.js';
import { toast, toastQueue } from './toast.js';
import { hudCache, renderGoal } from './hud.js';
import { closeSheet } from './sheet.js';
import { setTool } from './dock.js';

/* ---------- Menú ☰, partida nueva y pantalla de quiebra ---------- */
export const menuEl = $('#menu'), overEl = $('#over');
const tabs = [...document.querySelectorAll('#menu [role="tab"]')];
const panes = [...document.querySelectorAll('#menu .pane')];
let tab = 'parada';
// Cambia el HTML solo si cambió, para no perder un toque en un botón que se vuelve a dibujar
const setHTML = (el, html) => { if (el.dataset.sig !== html) { el.dataset.sig = html; el.innerHTML = html; } };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function setTab(t) {
  tab = t;
  for (const b of tabs) b.setAttribute('aria-selected', String(b.dataset.tab === t));
  for (const p of panes) p.hidden = p.dataset.pane !== t;
  menuEl.scrollTop = 0;
  renderMenu();
}
// Al abrir el menú: primero lo que hay para cobrar
export function openMenu() {
  closeSheet();
  menuEl.hidden = false;
  setTab(dailyReady() ? 'retos' : levelInfo().pts > 0 ? 'mejoras' : tab);
}

function renderHead() {
  const L = levelInfo();
  $('#mnLvl').textContent = L.lvl;
  $('#mnXpFill').style.transform = `scaleX(${(L.cur / L.need).toFixed(3)})`;
  $('#mnXp').textContent = `Nivel ${L.lvl} de dueño: ${fmt(L.cur)} de ${fmt(L.need)} XP` + (L.pts ? `. ${L.pts} ${L.pts > 1 ? 'puntos' : 'punto'} para mejoras` : '');
  $('#dotRetos').hidden = !dailyReady();
  $('#dotPerks').hidden = !(L.pts > 0 && !game.S.over);
}
function renderParada() {
  const S = game.S, nb = S.tiles.filter(t => t.t === 'bld').length;
  const f = [
    [`Día ${S.day}`, mode().name], [S.rep.toFixed(1) + ' ★', 'reputación'],
    [fmt(S.served), 'clientes atendidos'], [fmt(S.lost), 'se fueron enojados'],
    ['$' + fmt(S.bestDay), 'tu mejor día'], ['$' + fmt(S.total || 0), 'vendido en total'],
    [fmt(nb), nb === 1 ? 'negocio' : 'negocios'], [fmt(S.cash || 0), 'propinas 💰 cobradas'],
  ];
  // Ciudad: solo cuando ya hay casas
  if (homes().length) f.push([`🏠 ${fmt(population())}`, 'habitantes'], [`${hapFace()} ${Math.round(hap())} %`, 'felicidad del barrio'], [fmt(S.cit || 0), 'ciudadanos atendidos']);
  setHTML($('#mnStats'), f.map(([b, s]) => `<div class="fact"><b>${b}</b><span>${s}</span></div>`).join(''));
  const g = GOALS[S.goal];
  $('#mnGoal').textContent = g ? `Meta ${S.goal + 1} de ${GOALS.length}: ${g.text}. Premio $${fmt(g.prize)}.` : 'Ya cumpliste todas las metas. ¡Eres leyenda de la carretera!';
}
function renderRetos() {
  const S = game.S, d = dailyInfo();
  $('#giftStreak').textContent = `Racha: ${d.streak} ${d.streak === 1 ? 'día' : 'días'}`;
  setHTML($('#giftDays'), d.all.map((v, i) => {
    const got = i < d.i || (i === d.i && !d.can), now = i === d.i && d.can;
    return `<div class="gd${got ? ' got' : ''}${now ? ' now' : ''}"><span>Día ${i + 1}</span><b>${got ? '✓' : i === 6 ? '🏆' : '🎁'}</b><span>$${fmt(v)}</span></div>`;
  }).join(''));
  const gb = $('#giftBtn');
  gb.textContent = d.can ? `Cobrar $${fmt(d.money)} y ${d.xp} XP` : '✓ Ya lo cobraste. Vuelve mañana';
  gb.disabled = !d.can || S.over;
  const R = retosInfo(), list = $('#retoList');
  const sig = R.ms.map(m => m.t + m.n + (m.k || '') + retoDone(m)).join('|') + S.over;
  setHTML(list, R.ms.map((m, i) => `<div class="reto${retoDone(m) ? ' done' : ''}">
    <div class="rt-top"><span class="rt-txt">${esc(retoText(m))}</span><span class="rt-pr">$${fmt(m.prize)} · ${R.xp} XP</span></div>
    <div class="rt-bar"><div></div></div>
    <div class="rt-bot"><span class="rt-got"></span>${retoDone(m) ? `<button class="btn primary" data-claim="${i}"${S.over ? ' disabled' : ''}>Cobrar</button>` : ''}</div>
  </div>`).join('') + `<!--${sig}-->`);
  // El avance se actualiza en su lugar (sin volver a dibujar los botones)
  const rows = list.querySelectorAll('.reto');
  R.ms.forEach((m, i) => {
    const r = rows[i]; if (!r) return;
    r.querySelector('.rt-bar div').style.transform = `scaleX(${(m.got / m.n).toFixed(3)})`;
    r.querySelector('.rt-got').textContent = retoDone(m) ? '¡Cumplido!' : `${fmt(m.got)} de ${fmt(m.n)}`;
  });
  $('#retoLeft').textContent = !R.ms.length
    ? (R.all ? '🏆 Cumpliste todos los retos de hoy. Mañana salen nuevos.' : 'Mañana salen retos nuevos.')
    : R.left > 0 ? `Al cobrar un reto sale otro: hoy quedan ${R.left} más. Si cumples los ${RETOS_DAY} del día, ganas un bono.` : 'Son los últimos de hoy: cóbralos todos para ganar el bono.';
}
function renderPerks() {
  const S = game.S, L = levelInfo();
  $('#perkTxt').textContent = L.pts > 0
    ? `Tienes ${L.pts} ${L.pts > 1 ? 'puntos' : 'punto'}. Cada mejora es para siempre en esta partida.`
    : `Gana experiencia atendiendo tráileres, cumpliendo retos y cobrando propinas 💰. Cada nivel de dueño te da un punto (te faltan ${fmt(L.need - L.cur)} XP).`;
  setHTML($('#perkList'), Object.entries(PERKS).map(([k, p]) => {
    const r = perk(k), pct = v => p.unit ? Math.round(v) : Math.round(v * 100);
    const now = r ? p.txt(pct(perkVal(k))) : 'Sin mejorar';
    const nxt = r < PERK_MAX ? `Siguiente: ${p.txt(pct((r + 1) * p.step))}` : 'Al máximo';
    return `<div class="perk">
      <span class="pk-ic" aria-hidden="true">${p.emoji}</span>
      <div class="pk-mid"><b>${p.name}</b><span class="pips" aria-label="Rango ${r} de ${PERK_MAX}">${'●'.repeat(r)}${'○'.repeat(PERK_MAX - r)}</span>
        <span class="small">${esc(now)}</span><span class="small">${esc(nxt)}</span></div>
      <button class="btn primary" data-perk="${k}"${r >= PERK_MAX || L.pts < 1 || S.over ? ' disabled' : ''}>+1</button>
    </div>`;
  }).join(''));
}

export function renderMenu() {
  renderHead();
  if (tab === 'parada') renderParada();
  else if (tab === 'retos') renderRetos();
  else if (tab === 'mejoras') renderPerks();
  else if (tab === 'terreno') renderLand();
  else renderMore();
}
function renderMore() {
  $('#modeTxt').textContent = `Estás jugando en ${mode().name}. ${MODES.dificil.desc} Empezar de nuevo borra tu partida actual.`;
  for (const b of document.querySelectorAll('#menuModes .btn')) b.classList.toggle('primary', b.dataset.mode === game.S.mode && !b.classList.contains('armed'));
}
function renderLand() {
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
}

export function startNew(modeKey) {
  try { localStorage.removeItem(KEY); } catch (_) {}
  newGame(modeKey);
  game.trucks = []; game.cars = []; game.floats = []; game.puffs = []; game.ev = emptyEvent(); game.spawnT = 1.2;
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
    if (menuEl.hidden) openMenu(); else menuEl.hidden = true;
  });
  $('#closeMenu').addEventListener('click', () => { menuEl.hidden = true; });
  $('#closeMenuX').addEventListener('click', () => { menuEl.hidden = true; });
  for (const b of tabs) b.addEventListener('click', () => setTab(b.dataset.tab));
  // Al cobrar, las monedas salen del botón hacia la caja
  const fromBtn = (b, n) => { const r = b.getBoundingClientRect(); coinsFrom(r.left + r.width / 2, r.top + r.height / 2, n); };
  $('#giftBtn').addEventListener('click', e => { if (!dailyInfo().can || game.S.over) return; fromBtn(e.currentTarget, 8); confetti(30); claimDaily(); renderMenu(); });
  $('#retoList').addEventListener('click', e => { const b = e.target.closest('[data-claim]'); if (b) { fromBtn(b, 6); claimReto(+b.dataset.claim); renderMenu(); } });
  $('#perkList').addEventListener('click', e => { const b = e.target.closest('[data-perk]'); if (b && buyPerk(b.dataset.perk)) renderMenu(); });

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
