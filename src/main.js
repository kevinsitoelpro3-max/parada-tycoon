import { stage } from './utils.js';
import { game, newGame, load, save, totalUpkeep } from './state.js';
import { resize } from './camera.js';
import { update } from './sim.js';
import { gameOver } from './days.js';
import { draw } from './render/draw.js';
import { buildOuterTrees } from './render/scene.js';
import { setupInput } from './input.js';
import { readTheme, setupTheme } from './theme.js';
import { toast } from './ui/toast.js';
import { hud, renderGoal, setupHud } from './ui/hud.js';
import { setupDock } from './ui/dock.js';
import { setupSheet } from './ui/sheet.js';
import { setupMenu } from './ui/menu.js';

/* ---------- Controles ---------- */
setupInput();
setupDock();
setupSheet();
setupMenu();
setupHud();
setupTheme();
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', save);

/* ---------- Arranque ---------- */
const fresh = !load();
if (fresh) newGame('normal');
readTheme();
buildOuterTrees();
game.billCache = totalUpkeep();
renderGoal(false);
new ResizeObserver(resize).observe(stage);
resize();
if (game.S.over) gameOver();
else if (fresh) setTimeout(() => toast('Empieza: toca 🛣️ Calle y trázala desde la carretera', 3000), 700);
else if (game.upgradedFromV1) setTimeout(() => toast('Temporada 2: ahora hay días con gastos, reputación, hora pico y eventos. Toca ☰ para ver cómo funciona.', 6000), 700);

let last = performance.now();
function frame(now) {
  const rdt = Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  update(rdt * game.speed, rdt);
  draw();
  hud();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
