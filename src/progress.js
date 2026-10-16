import { PERKS, PERK_MAX } from './config.js';
import { game, levelInfo, perk, save, totalUpkeep } from './state.js';
import { toast } from './ui/toast.js';
import { sfx } from './audio/sfx.js';

/* ---------- Nivel de dueño y mejoras permanentes ---------- */
// Suma experiencia; si sube de nivel avisa que hay un punto para gastar en ☰ → Mejoras.
export function addXp(n) {
  const S = game.S;
  if (S.over || !(n > 0)) return;
  const before = levelInfo().lvl;
  S.xp = (S.xp || 0) + n;
  const now = levelInfo().lvl;
  if (now > before) {
    sfx.goal();
    toast(`⭐ ¡Subiste a nivel ${now} de dueño! Tienes un punto de mejora en ☰ → Mejoras`, 3400, true);
  }
}
export function buyPerk(k) {
  const S = game.S;
  if (!PERKS[k] || S.over) return false;
  if (perk(k) >= PERK_MAX) { sfx.nope(); toast('Esa mejora ya está al máximo'); return false; }
  if (levelInfo().pts < 1) { sfx.nope(); toast('Sube de nivel de dueño para tener otro punto'); return false; }
  S.perks = { ...(S.perks || {}), [k]: perk(k) + 1 };
  sfx.upgrade();
  toast(`${PERKS[k].emoji} ${PERKS[k].name}: rango ${perk(k)} de ${PERK_MAX}`);
  game.billCache = totalUpkeep();
  save();
  return true;
}
