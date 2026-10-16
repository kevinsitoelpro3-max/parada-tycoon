import { $, fmt } from '../utils.js';
import { game, countK, save } from '../state.js';
import { toast } from './toast.js';
import { closeSheet } from './sheet.js';
import { menuEl } from './menu.js';
import { sfx } from '../audio/sfx.js';

/* ---------- Eventos donde decides ---------- */
// Desde el día 3, algunas mañanas (35 %) llega una decisión. Mientras eliges, el juego se pausa.
// Cada opción cobra (o no) y deja su efecto en game.ev, que dura solo ese día.
export const choiceEl = $('#choice');
const DECISIONS = [
  {
    id: 'inspeccion', when: () => countK('food') > 0,
    title: '🔎 Inspección sanitaria',
    text: () => `Llegó el inspector de salubridad a revisar tus comedores. Arreglar todo cuesta $${fmt(250 * countK('food'))}.`,
    a: () => [`Arreglar ($${fmt(250 * countK('food'))})`, () => { pay(250 * countK('food')); rep(0.2); return 'Pasaste la inspección con todo en orden: +0.2 de reputación'; }],
    b: () => ['Arriesgarme', () => {
      if (Math.random() < 0.5) return 'El inspector no encontró nada esta vez';
      pay(600); rep(-0.3); return 'Te multaron con $600 y bajó tu reputación';
    }],
  },
  {
    id: 'feria', when: () => true,
    title: '🎡 Feria del pueblo',
    text: () => 'El pueblo hace su feria y te piden patrocinarla. Con tu letrero en la entrada llegarían más tráileres hoy.',
    a: () => ['Patrocinar ($500)', () => { pay(500); game.ev.traffic = 1.3; return 'Hoy llegan 30 % más tráileres por la feria'; }],
    b: () => ['Mejor no', () => 'Hoy todo sigue igual'],
  },
  {
    id: 'paro', when: () => true,
    title: '✊ Paro de transportistas',
    text: () => 'Los transportistas anuncian un paro. Si los apoyas con café gratis, siguen parando contigo.',
    a: () => ['Apoyarlos ($250)', () => { pay(250); rep(0.2); return 'Te lo agradecen: +0.2 de reputación y hoy llegan como siempre'; }],
    b: () => ['Ignorarlo', () => { game.ev.traffic = 0.6; return 'Hoy llegan 40 % menos tráileres por el paro'; }],
  },
];
const pay = n => { game.S.money -= n; game.floats.push({ x: game.W / 2, y: game.H / 2, z: 2, text: '−$' + fmt(n), t: 0, neg: true }); };
const rep = d => { game.S.rep = Math.max(1, Math.min(5, game.S.rep + d)); };

let current = null;
export const isChoiceOpen = () => !choiceEl.hidden;
// Al empezar el día: a veces sale una decisión (usa el azar de la partida)
export function rollChoice() {
  if (game.S.day < 3 || Math.random() >= 0.35) return;
  const ok = DECISIONS.filter(d => d.when());
  const d = ok[Math.floor(Math.random() * ok.length)];
  current = { d, a: d.a(), b: d.b() };
  closeSheet(); menuEl.hidden = true;
  $('#chTitle').textContent = d.title;
  $('#chTxt').textContent = d.text();
  $('#chA').textContent = current.a[0];
  $('#chB').textContent = current.b[0];
  choiceEl.hidden = false;
  game.paused = true;
}
// i = 0: primera opción; 1: segunda (también el botón atrás de Android)
export function pickChoice(i) {
  if (!current) return;
  const msg = (i === 0 ? current.a : current.b)[1]();
  current = null;
  choiceEl.hidden = true;
  game.paused = false;
  sfx.click();
  toast(msg, 3000);
  save();
}
export function setupChoice() {
  $('#chA').addEventListener('click', () => pickChoice(0));
  $('#chB').addEventListener('click', () => pickChoice(1));
}
