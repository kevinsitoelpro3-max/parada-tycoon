// Tipografía Overpass incluida en el juego (licencia OFL), para que funcione sin internet
import '@fontsource/overpass/latin-400.css';
import '@fontsource/overpass/latin-600.css';
import '@fontsource/overpass/latin-800.css';
import { stage } from './utils.js';
import { game, newGame, load, save, totalUpkeep, inRush } from './state.js';
import { resize } from './camera.js';
import { update } from './sim.js';
import { gameOver } from './days.js';
import { draw } from './render/draw.js';
import { buildOuterTrees } from './render/scene.js';
import { setupInput } from './input.js';
import { readTheme, setupTheme, updateLight } from './theme.js';
import { toast } from './ui/toast.js';
import { hud, renderGoal, setupHud } from './ui/hud.js';
import { setupDock } from './ui/dock.js';
import { setupSheet } from './ui/sheet.js';
import { setupMenu } from './ui/menu.js';
import { openStart, setupStart } from './ui/start.js';
import { setupTuto, tickTuto } from './ui/tuto.js';
import { setupSound } from './audio/sound.js';
import { sfx, setRain } from './audio/sfx.js';
import { setMusicMode } from './audio/music.js';
import { setupNative, nativeReady } from './native.js';

/* ---------- Controles ---------- */
setupInput();
setupDock();
setupSheet();
setupMenu();
setupHud();
setupTheme();
setupStart();
setupSound();
setupNative();
// Clic suave en cualquier botón de la interfaz
document.addEventListener('click', e => { if (e.target.closest('button')) sfx.click(); });
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
// La guía de Lupe necesita la partida ya cargada para saber si es la primera vez
setupTuto();
// Primero la pantalla de inicio; el aviso de bienvenida sale al tocar Continuar
const welcome = [];
if (game.upgradedFromV1) welcome.push(['Temporada 2: ahora hay días con gastos, reputación, hora pico y eventos. Toca ☰ para ver cómo funciona.', 6000]);
if (game.grewFromOld) welcome.push([`Tu terreno creció gratis a ${game.W - 1} × ${game.H} casillas. Desde ☰ puedes ampliarlo hacia abajo o a la derecha.`, 5000]);
openStart(welcome.length ? () => setTimeout(() => welcome.forEach(([m, ms]) => toast(m, ms, true)), 400) : null);

// Música y lluvia siguen lo que pasa en la partida
function tickSound() {
  const over = game.S.over;
  setMusicMode(over ? 'off' : inRush() && !game.paused ? 'rush' : 'normal');
  setRain(!over && !game.paused && game.ev.rain);
}

let last = performance.now();
function frame(now) {
  const rdt = Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  if (!game.paused) update(rdt * game.speed, rdt);
  updateLight();
  draw();
  tickSound();
  hud();
  tickTuto();
  if (first) { first = false; nativeReady(); }
  requestAnimationFrame(frame);
}
let first = true;
requestAnimationFrame(frame);
