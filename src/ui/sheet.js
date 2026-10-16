import { KINDS, PRICES, STOCK_BONUS, STOCK_REACH } from '../config.js';
import { $, fmt, money } from '../utils.js';
import { game, T, payOf, payNow, repMult, upkeepOf, upCost, bonusAt, priceOf, perkVal } from '../state.js';
import { toast } from './toast.js';
import { hudCache } from './hud.js';
import { menuEl } from './menu.js';
import { sfx } from '../audio/sfx.js';
import { track } from '../daily.js';
import { pop, dust } from '../fx.js';

/* ---------- Ficha del negocio (ver y mejorar) ---------- */
export const sheetEl = $('#sheet');

export function openSheet(x, y) { game.sel = { x, y }; menuEl.hidden = true; sheetEl.hidden = false; renderSheet(); }
export function closeSheet() { game.sel = null; sheetEl.hidden = true; }
export function renderSheet() {
  const sel = game.sel;
  if (!sel) return;
  const t = T(sel.x, sel.y);
  if (!t || t.t !== 'bld') { closeSheet(); return; }
  const k = KINDS[t.k];
  $('#shTitle').textContent = k.emoji + ' ' + k.name;
  $('#shLvl').textContent = 'Nivel ' + t.lvl + ' de 3' + (t.off > 0 ? '. Sin luz por ahora.' : '');
  $('#shCap').textContent = t.slots.length;
  $('#shPay').textContent = '$' + fmt(payNow(t, sel.x, sel.y));
  const bonus = bonusAt(sel.x, sel.y), pr = t.price ?? 1;
  for (const b of document.querySelectorAll('#shPrice [data-price]')) {
    const on = +b.dataset.price === pr;
    b.classList.toggle('primary', on); b.setAttribute('aria-pressed', String(on));
  }
  $('#shUpk').textContent = '$' + fmt(upkeepOf(t));
  $('#shEarn').textContent = '$' + fmt(t.earned || 0);
  const up = $('#shUp');
  if (t.lvl < 3) {
    $('#shNext').textContent = `Al mejorarlo atiende a ${t.slots.length + 1} a la vez, cobra $${fmt(Math.round(payOf(t, t.lvl + 1) * repMult() * priceOf(t).mult * (1 + bonus) * (1 + perkVal('cobro'))))} y su gasto diario sube a $${fmt(upkeepOf(t, t.lvl + 1))}.`;
    up.textContent = 'Mejorar por $' + fmt(upCost(t));
    up.disabled = game.S.money < upCost(t) || game.S.over;
  } else {
    $('#shNext').textContent = 'Este negocio ya está al máximo.';
    up.textContent = 'Nivel máximo';
    up.disabled = true;
  }
  if (pr !== 1) $('#shNext').textContent += pr === 0
    ? ' Precio barato: cobra 20 % menos, los tráileres lo prefieren y cada cliente sube más tu reputación.'
    : ' Precio caro: cobra 30 % más, pero los tráileres prefieren otro igual y la reputación sube poco.';
  // Decoración y vecinos: cuánto suman y cómo subirlo
  if (t.k === 'dock') {
    $('#shNext').textContent += ` Aquí descargan los tráileres de carga: pagan la cuota y surten a los negocios a ${STOCK_REACH} casillas o menos, que cobran ${Math.round(STOCK_BONUS * 100)} % más mientras les dure.`;
    return;
  }
  $('#shNext').textContent += bonus > 0
    ? ` La decoración y los vecinos le suman ${Math.round(bonus * 100)} % al cobro.`
    : ' Pon decoración o su negocio pareja al lado para que cobre más.';
  if (KINDS[t.k].side) return;
  $('#shNext').textContent += t.stock > 0
    ? ` 📦 Surtido para ${t.stock} ${t.stock > 1 ? 'clientes' : 'cliente'} más (+${Math.round(STOCK_BONUS * 100)} %).`
    : ` Sin surtido: una 📦 zona de descarga cerca le sube ${Math.round(STOCK_BONUS * 100)} % el cobro.`;
}
export function setupSheet() {
  $('#shUp').addEventListener('click', () => {
    const S = game.S, sel = game.sel;
    if (!sel || S.over) return;
    const t = T(sel.x, sel.y);
    if (!t || t.t !== 'bld' || t.lvl >= 3) return;
    const c = upCost(t);
    if (S.money < c) { sfx.nope(); toast('Te faltan ' + money(c - S.money)); return; }
    S.money -= c; t.lvl++; t.slots.push(null);
    sfx.upgrade(); pop(t, 0.75); dust(sel.x, sel.y, 10);
    game.floats.push({ x: sel.x + 0.5, y: sel.y + 0.5, z: 1.1, text: '−$' + fmt(c), t: 0, neg: true });
    game.puffs.push({ x: sel.x, y: sel.y, t: 0 });
    toast(KINDS[t.k].name + ' subió a nivel ' + t.lvl);
    track('up');
    hudCache.m = null;
    renderSheet();
  });
  $('#shClose').addEventListener('click', closeSheet);
  for (const b of document.querySelectorAll('#shPrice [data-price]')) b.addEventListener('click', () => {
    const sel = game.sel, t = sel && T(sel.x, sel.y);
    if (!t || t.t !== 'bld' || game.S.over) return;
    const p = +b.dataset.price;
    if (p === 1) delete t.price; else t.price = p;
    toast(`${KINDS[t.k].name}: precio ${PRICES[p].name.toLowerCase()}`);
    renderSheet();
  });
}
