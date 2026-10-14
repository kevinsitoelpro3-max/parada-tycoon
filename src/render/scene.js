/* ---------- Escena ---------- */
// Punto de entrada del dibujo del mapa: reúne terreno, negocios, tráileres y clima.
export { drawGround, drawHighlights, drawTree, outerTrees, buildOuterTrees } from './terrain.js';
export { drawBld } from './buildings/index.js';
export { drawTruck, truckAlpha } from './vehicles.js';
export { drawRain } from './weather.js';
