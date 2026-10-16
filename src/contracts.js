import { KINDS, DAY_LEN, OPEN_HOUR, CLOSE_HOUR } from './config.js';
import { pick, fmt } from './utils.js';
import { game, countK } from './state.js';
import { toast } from './ui/toast.js';
import { sfx } from './audio/sfx.js';

/* ---------- Contratos de flotillas ---------- */
// Desde el día 2, al empezar cada día una empresa (inventada) te encarga atender N tráileres en un
// tipo de negocio que ya tienes antes de las 20:00. Premio: N × el cobro base de ese negocio
// (como si esos tráileres pagaran doble). Si no llegas, solo te quedas sin premio.
const COMPANIES = ['Transportes del Norte', 'Fletes La Paloma', 'Autotransportes Sierra Alta',
  'Carga Rápida del Bajío', 'Fletes Don Beto', 'Logística Huasteca', 'Transportes El Sauce'];
export const CONTRACT_HOUR = 20;
const UNTIL = (CONTRACT_HOUR - OPEN_HOUR) / (CLOSE_HOUR - OPEN_HOUR);

export function newContract() {
  const S = game.S;
  S.contract = null;
  if (S.day < 2) return null;
  const owned = Object.keys(KINDS).filter(k => !KINDS[k].night && countK(k) > 0);
  if (!owned.length) return null;
  const k = pick(owned);
  const n = Math.min(30, 5 + 3 * countK(k) + Math.floor(S.day / 2));
  S.contract = { co: pick(COMPANIES), k, n, got: 0, prize: n * KINDS[k].pay, done: false };
  return `📋 ${S.contract.co} te encarga ${n} tráileres en tu ${KINDS[k].emoji} antes de las ${CONTRACT_HOUR}:00. Premio: $${fmt(S.contract.prize)}`;
}
// Cada servicio terminado en un negocio de tipo k
export function contractServed(k) {
  const c = game.S.contract;
  if (!c || c.done || c.k !== k || game.S.dayT / DAY_LEN >= UNTIL) return;
  c.got++;
  if (c.got >= c.n) {
    c.done = true;
    game.S.money += c.prize;
    sfx.goal();
    toast(`📋 ¡Cumpliste con ${c.co}! +$${fmt(c.prize)}`, 3000, true);
  }
}
// En cada paso: si ya pasó la hora sin cumplirlo, avisa una vez y lo cierra
export function contractTick() {
  const c = game.S.contract;
  if (!c || c.done || game.S.dayT / DAY_LEN < UNTIL) return;
  c.done = true; c.failed = true;
  toast(`📋 Se acabó el tiempo del contrato con ${c.co} (${c.got} de ${c.n})`, 2600, true);
}
// Texto corto para el marcador
export function contractLabel() {
  const c = game.S.contract;
  if (!c || c.failed) return '';
  return c.done ? `📋 ✓ ${c.co}` : `📋 ${c.got}/${c.n} ${KINDS[c.k].emoji} antes de ${CONTRACT_HOUR}:00 · $${fmt(c.prize)}`;
}
