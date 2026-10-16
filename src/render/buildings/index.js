import gas from './gas.js';
import food from './food.js';
import sleep from './sleep.js';
import shop from './shop.js';
import wash from './wash.js';
import repair from './repair.js';
import park from './park.js';
import dock from './dock.js';

/* ---------- Negocios: un archivo por tipo ---------- */
const DRAW = { gas, food, sleep, shop, wash, repair, park, dock };
export function drawBld(x, y, t) {
  t.top = DRAW[t.k](x, y, t);
}
