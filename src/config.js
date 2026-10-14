/* ---------- Configuración ---------- */
export const W = 8, H0 = 10, HMAX = 16;   // x = 0 es la carretera principal
export const TW = 64, TH = 32, ZU = 30;
export const ZMIN = 0.35, ZMAX = 2.6;
export const KEY = 'parada-tycoon-v1';
export const DAY_LEN = 180;                // segundos de juego por día (a ×1: 3 minutos)
// El balance original se hizo con días de 75 s. Los gastos diarios y la hora de los eventos
// se escalan con este factor, así que cambiar DAY_LEN no cambia lo que se gana o paga por minuto.
export const DAY_SCALE = DAY_LEN / 75;
export const OPEN_HOUR = 6, CLOSE_HOUR = 24;  // reloj de la parada: abre a las 06:00 y cierra a las 24:00
export const PERFECT_DAY_MIN = 25;            // clientes para un "día perfecto" (sin nadie enojado)
export const RUSH = [0.4, 0.65];           // franja de hora pico dentro del día
export const KINDS = {
  gas:   { name: 'Gasolinera',    emoji: '⛽',  cost: 250, pay: 35, time: 2.5, upkeep: 30, color: '#D62828' },
  food:  { name: 'Comedor',       emoji: '🍗',  cost: 400, pay: 55, time: 4,   upkeep: 50, color: '#E8892B' },
  sleep: { name: 'Hotel de paso', emoji: '🛏️', cost: 600, pay: 90, time: 6,   upkeep: 80, color: '#3D6FB0' }
};
export const MODES = {
  facil:   { name: 'Fácil',   money: 800, upkeep: 0.6, traffic: 0.9,  repLoss: 0.07, redDays: 3, eventsFrom: 4,
             desc: 'Fácil: gastos bajos y puedes cerrar 3 días seguidos en rojo antes de quebrar.' },
  normal:  { name: 'Normal',  money: 500, upkeep: 1,   traffic: 1,    repLoss: 0.12, redDays: 2, eventsFrom: 2,
             desc: 'Normal: quiebras si cierras 2 días seguidos en rojo.' },
  dificil: { name: 'Difícil', money: 400, upkeep: 1.5, traffic: 1.15, repLoss: 0.18, redDays: 1, eventsFrom: 2,
             desc: 'Difícil: gastos altos, más tráfico, la reputación cae rápido y quiebras al primer cierre en rojo.' }
};
export const NEED_EMOJI = { gas: '⛽', food: '🍗', sleep: '💤' };
export const COST = { road: 20, tree: 15, demo: 10 };
export const CABS = ['#D7263D', '#1B998B', '#F46036', '#3F88C5', '#E2B33C', '#6A4C93', '#33363F', '#2A9D5C'];
export const TRAILERS = ['#F1F1F1', '#C7CDD6', '#E6DFCF', '#9DB6C8', '#D9534F', '#5C7F67'];
export const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
export const UI_FONT = '"Overpass","Helvetica Neue",Arial,sans-serif';
