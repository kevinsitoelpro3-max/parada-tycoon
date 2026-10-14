import { game } from '../state.js';
import { toast } from './toast.js';
import { closeSheet } from './sheet.js';

/* ---------- Barra de herramientas ---------- */
export const tools = [...document.querySelectorAll('.tool')];

export function setTool(k) {
  game.tool = k;
  for (const b of tools) b.setAttribute('aria-pressed', String(b.dataset.tool === k));
  if (k !== 'none') closeSheet();
  if (k === 'road' && !game.S.tiles.some(t => t.t === 'road')) toast('Toca o arrastra sobre las casillas amarillas junto a la carretera');
}
export function setupDock() {
  for (const b of tools) b.addEventListener('click', () => setTool(game.tool === b.dataset.tool ? 'none' : b.dataset.tool));
  // Con mouse, la rueda desliza la barra hacia los lados (en celular se desliza con el dedo)
  const dock = document.querySelector('.dock');
  dock.addEventListener('wheel', e => {
    if (dock.scrollWidth <= dock.clientWidth || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    dock.scrollLeft += e.deltaY;
    e.preventDefault();
  }, { passive: false });
}
