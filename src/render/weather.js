import { ctx } from '../utils.js';
import { game } from '../state.js';

/* ---------- Clima ---------- */
export function drawRain(w, h) {
  ctx.fillStyle = 'rgba(40,60,90,.14)';
  ctx.fillRect(0, 0, w, h);
  ctx.beginPath();
  for (let i = 0; i < 110; i++) {
    const x = ((i * 137.5 + game.rainT * 90) % (w + 40)) - 20;
    const y = ((i * 61.3 + game.rainT * 560) % (h + 40)) - 20;
    ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 13);
  }
  ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(215,230,255,.55)'; ctx.stroke();
}
