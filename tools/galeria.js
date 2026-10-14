// Galería de dibujos para diseñar edificios, terreno y tráileres sin jugar una partida.
import { KINDS, UI_FONT } from '../src/config.js';
import { canvas, ctx } from '../src/utils.js';
import { game } from '../src/state.js';
import { P, tile } from '../src/render/iso.js';
import { drawBld } from '../src/render/buildings/index.js';
import { drawGround, drawTree } from '../src/render/terrain.js';
import { drawTruck } from '../src/render/vehicles.js';

const night = new URLSearchParams(location.search).has('noche');
if (night) document.body.classList.add('dark');
game.dark = night;
const CW = 1500, CH = 1700, DPR = 2;
canvas.width = CW * DPR; canvas.height = CH * DPR;
ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
ctx.fillStyle = night ? '#13201B' : '#D2E4D8'; ctx.fillRect(0, 0, CW, CH);
ctx.lineCap = 'round';

const label = (txt, x, y) => {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.font = `700 15px ${UI_FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = night ? '#E6F0E9' : '#13261C';
  ctx.fillText(txt, x, y);
};

// --- Negocios: una fila por tipo; columnas nivel 1, 2, 3 y "sin luz" (nivel 3) ---
const kinds = Object.keys(KINDS);
const S = 1.9;                // escala de dibujo
const cols = [['Nivel 1', 1, 0], ['Nivel 2', 2, 0], ['Nivel 3', 3, 0], ['Sin luz', 3, 25]];
cols.forEach(([t], i) => label(t, 300 + i * 260, 30));
kinds.forEach((k, r) => {
  label(KINDS[k].name, 90, 120 + r * 190);
  cols.forEach(([, lvl, off], i) => {
    const sx = 300 + i * 260, sy = 55 + r * 190;
    ctx.setTransform(DPR * S, 0, 0, DPR * S, DPR * sx, DPR * sy);
    // casilla del negocio, calle al frente (y + 1) y pasto alrededor
    tile(-1, 0, '#86BC5F'); tile(0, -1, '#8CC265'); tile(1, 0, '#86BC5F'); tile(0, 1, '#4B4F57');
    tile(0, 0, '#CEC9BD');
    const t = { t: 'bld', k, lvl, off, slots: [] };
    drawBld(0, 0, t);
    // marca donde irá el ícono del negocio (t.top + 0.5)
    const [mx, my] = P(0.5, 0.5, (t.top || 0.6) + 0.5);
    ctx.beginPath(); ctx.arc(mx, my, 3, 0, Math.PI * 2); ctx.fillStyle = '#E63946'; ctx.fill();
  });
});

// --- Escena chica: carretera, calles, agua, árboles, negocios y tráileres ---
const sy0 = 1230;
label('Escena: carretera, calles, agua, árboles y tráileres', CW / 2, sy0 - 10);
game.W = 7; game.H = 6;
const map = [
  'hrrrrrr',
  'hrgggTg',
  'hrgrrrg',
  'hrgrwwT',
  'hrTrwwg',
  'hrrrggT',
];
const kindAt = { '2,1': 'gas', '3,1': 'food', '4,1': 'sleep', '2,3': 'shop', '2,4': 'wash', '4,5': 'repair' };
game.S = { tiles: [], over: false };
for (let y = 0; y < game.H; y++) for (let x = 0; x < game.W; x++) {
  const c = map[y][x], k = kindAt[x + ',' + y];
  game.S.tiles.push(k ? { t: 'bld', k, lvl: 1 + ((x + y) % 3), slots: [] }
    : { t: c === 'h' ? 'hwy' : c === 'r' ? 'road' : c === 'w' ? 'water' : c === 'T' ? 'tree' : 'grass' });
}
const Z = 1.25;
ctx.setTransform(DPR * Z, 0, 0, DPR * Z, DPR * (CW / 2 + 30), DPR * (sy0 + 30));
drawGround();
const objs = [];
for (let y = 0; y < game.H; y++) for (let x = 1; x < game.W; x++) {
  const t = game.S.tiles[y * game.W + x];
  if (t.t === 'tree') objs.push({ d: x + y + 1, f: () => drawTree(x, y, 1) });
  else if (t.t === 'bld') objs.push({ d: x + y + 1, f: () => drawBld(x, y, t) });
}
const CABS = ['#D7263D', '#1B998B', '#F46036', '#3F88C5'], TRAILERS = ['#F1F1F1', '#C7CDD6', '#9DB6C8', '#D9534F'];
[[0.5, 2.5, [0, 1]], [1.5, 0.5, [1, 0]], [3.5, 2.5, [-1, 0]], [1.5, 4.5, [0, -1]], [3.5, 3.7, [0, 1]]].forEach(([x, y, dir], i) => {
  const tr = { x, y, ox: 0, oy: 0, dir, cab: CABS[i % 4], trailer: TRAILERS[i % 4] };
  objs.push({ d: x + y, f: () => drawTruck(tr) });
});
objs.sort((a, b) => a.d - b.d).forEach(o => o.f());
document.title += ' (lista)';
