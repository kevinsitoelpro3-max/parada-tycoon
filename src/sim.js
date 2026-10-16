import { KINDS, DAY_LEN, RUSH, NIGHT_FROM, HWY2_RATE } from './config.js';
import { pick, fmt } from './utils.js';
import { game, T, inRush, isNight, totalUpkeep, save, clockAt } from './state.js';
import { GOALS } from './goals.js';
import { spawn, spawnInterval, moveAlong, finishService, waitInLine } from './trucks.js';
import { closeDay } from './days.js';
import { toast } from './ui/toast.js';
import { renderGoal } from './ui/hud.js';
import { sfx } from './audio/sfx.js';
import { contractTick } from './contracts.js';

/* ---------- Simulación ---------- */
// dt: tiempo de juego (con la velocidad ×1/×2/×3); rdt: tiempo real, para animaciones.
export function update(dt, rdt) {
  const S = game.S;
  game.rainT += rdt;
  for (const f of game.floats) { f.t += rdt; f.z += rdt * 0.8; }
  game.floats = game.floats.filter(f => f.t < 1.6);
  for (const p of game.puffs) p.t += rdt;
  game.puffs = game.puffs.filter(p => p.t < 0.5);
  if (S.over) return;

  S.dayT += dt;
  const rush = inRush();
  if (rush !== game.ev.rushOn) {
    game.ev.rushOn = rush;
    if (rush) sfx.rush();
    if (rush) toast(`🚨 Son las ${clockAt(RUSH[0])}: empieza la hora pico y llegan el doble de tráileres`, 2600, true);
  }
  contractTick();
  const night = isNight();
  if (night !== game.ev.nightOn) {
    game.ev.nightOn = night;
    if (night) toast(`🌙 Son las ${NIGHT_FROM}:00: de noche más tráileres buscan dónde dormir 💤`, 2600, true);
  }
  if (game.ev.luzAt >= 0 && S.dayT >= game.ev.luzAt) {
    game.ev.luzAt = -1;
    const bl = S.tiles.filter(t => t.t === 'bld');
    if (bl.length) {
      const b = pick(bl);
      b.off = 25;
      sfx.blackout();
      toast(`🔌 Apagón: tu ${KINDS[b.k].name.toLowerCase()} se quedó sin luz un rato`, 3000, true);
    }
  }
  if (game.ev.caravanAt >= 0 && S.dayT >= game.ev.caravanAt) {
    game.ev.caravanAt = -1; game.ev.burst = 8; game.spawnT = 0;
    sfx.caravan();
    toast('🚛 ¡Ahí viene la caravana!', 2400, true);
  }
  for (const t of S.tiles) if (t.off > 0) { t.off -= dt; if (t.off <= 0) delete t.off; }

  game.spawnT -= dt;
  if (game.spawnT <= 0) game.spawnT = spawn() ? spawnInterval() : 0.3;
  if (S.hwy2) {
    game.spawnT2 = (game.spawnT2 ?? 2) - dt;
    if (game.spawnT2 <= 0) game.spawnT2 = spawn(true) ? spawnInterval() / HWY2_RATE : 0.3;
  }

  const slow = game.ev.rain ? 0.7 : 1;
  for (const tr of game.trucks) {
    tr.speed = (tr.x < 1 || (S.hwy2 && tr.y < 1) ? 2.6 : 1.5) * slow;
    if (tr.state === 'service') {
      const b = T(tr.bx, tr.by);
      if (!(b && b.off > 0)) tr.t += dt;
      if (!b || b.t !== 'bld' || tr.t >= KINDS[b.k].time) finishService(tr);
    } else if (moveAlong(tr, dt)) {
      if (tr.state === 'wait') waitInLine(tr, dt);
      else if (tr.state === 'arrive') {
        tr.state = 'service'; tr.t = 0;
        tr.dir = [tr.bx - tr.route[0][0], tr.by - tr.route[0][1]];
      } else tr.dead = true;
    }
    if (tr.happy > 0) tr.happy -= dt;
    const L = 0.13;
    const tx = tr.state === 'service' ? 0 : -tr.dir[1] * L;
    const ty = tr.state === 'service' ? 0 : tr.dir[0] * L;
    const k = Math.min(1, dt * 7);
    tr.ox += (tx - tr.ox) * k;
    tr.oy += (ty - tr.oy) * k;
  }
  game.trucks = game.trucks.filter(tr => !tr.dead);

  game.goalT += dt;
  if (game.goalT > 0.4) {
    game.goalT = 0;
    game.billCache = totalUpkeep();
    const g = GOALS[S.goal];
    if (g && g.ok()) {
      S.money += g.prize; S.goal++;
      sfx.goal();
      toast('Meta cumplida: +$' + fmt(g.prize), 2600, true);
      renderGoal(true);
    }
  }
  if (S.dayT >= DAY_LEN) closeDay();
  game.saveT += dt;
  if (game.saveT > 3) { game.saveT = 0; save(); }
}
