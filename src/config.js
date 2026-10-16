/* ---------- Configuración ---------- */
// Terreno: x = 0 es la carretera principal. Ancho (columnas) y alto (filas) viven en game.W y game.H.
export const W0 = 10, H0 = 12;              // terreno de una partida nueva
export const WMAX = 20, HMAX = 30;          // tamaño máximo comprando terreno
export const LAND_STEP = 2;                 // cada compra agrega 2 columnas o 2 filas
export const LAND_BASE = 2500;              // la compra número n cuesta LAND_BASE × n
export const TW = 64, TH = 32, ZU = 30;
export const ZMIN = 0.22, ZMAX = 2.6;
export const KEY = 'parada-tycoon-v1';
export const DAY_LEN = 180;                // segundos de juego por día (a ×1: 3 minutos)
// El balance original se hizo con días de 75 s. Los gastos diarios y la hora de los eventos
// se escalan con este factor, así que cambiar DAY_LEN no cambia lo que se gana o paga por minuto.
export const DAY_SCALE = DAY_LEN / 75;
export const OPEN_HOUR = 6, CLOSE_HOUR = 24;  // reloj de la parada: abre a las 06:00 y cierra a las 24:00
// Día y noche (horas del reloj): oscurece de 18:30 a 20:30 y amanece de 06:00 a 07:00.
// Desde NIGHT_FROM, de cada 100 tráileres con pedido: ⛽ 45, 🍗 20 y 💤 35 (de día 45, 30 y 25).
export const DUSK = [18.5, 20.5], DAWN = 7, NIGHT_FROM = 20;
export const PERFECT_DAY_MIN = 25;            // clientes para un "día perfecto" (sin nadie enojado)
export const RUSH = [0.4, 0.65];           // franja de hora pico dentro del día
export const KINDS = {
  gas:   { name: 'Gasolinera',    emoji: '⛽',  cost: 250, pay: 35, time: 2.5, upkeep: 30, color: '#D62828' },
  food:  { name: 'Comedor',       emoji: '🍗',  cost: 400, pay: 55, time: 4,   upkeep: 50, color: '#E8892B' },
  sleep: { name: 'Hotel de paso', emoji: '🛏️', cost: 600, pay: 90, time: 6,   upkeep: 80, color: '#3D6FB0' },
  // Negocios extra: atienden a tráileres que antes pasaban de largo (ver EXTRA_SHARE y spawn)
  shop:  { name: 'Tiendita',      emoji: '🛒', cost: 200, pay: 20, time: 1.5, upkeep: 25, color: '#2A9D5C', extra: true },
  wash:  { name: 'Lavado',        emoji: '🚿', cost: 350, pay: 45, time: 3.5, upkeep: 45, color: '#1B8FC4', extra: true },
  repair:{ name: 'Taller',        emoji: '🔧', cost: 700, pay: 110, time: 7, upkeep: 90, color: '#6B7280', extra: true }
};
// De los tráileres que pasan de largo sin pedir nada (18 %), cada tipo de negocio extra que ya
// tengas se queda con esta parte: con uno, el 30 % de ellos; con los tres, el 90 %.
export const EXTRA_SHARE = 0.3;
// Tráileres con dos pedidos: de los que ya encontraron un negocio básico, COMBO_CHANCE también
// quiere otro tipo básico que tengas. Si los dos negocios están a COMBO_NEAR casillas o menos
// (sumando filas y columnas), el segundo cobro lleva COMBO_TIP de propina.
export const COMBO_CHANCE = 0.25, COMBO_NEAR = 3, COMBO_TIP = 0.3;
export const MODES = {
  facil:   { name: 'Fácil',   money: 800, upkeep: 0.6, traffic: 0.9,  repLoss: 0.07, redDays: 3, eventsFrom: 4,
             desc: 'Fácil: gastos bajos y puedes cerrar 3 días seguidos en rojo antes de quebrar.' },
  normal:  { name: 'Normal',  money: 500, upkeep: 1,   traffic: 1,    repLoss: 0.12, redDays: 2, eventsFrom: 2,
             desc: 'Normal: quiebras si cierras 2 días seguidos en rojo.' },
  dificil: { name: 'Difícil', money: 400, upkeep: 1.5, traffic: 1.15, repLoss: 0.18, redDays: 1, eventsFrom: 2,
             desc: 'Difícil: gastos altos, más tráfico, la reputación cae rápido y quiebras al primer cierre en rojo.' }
};
export const NEED_EMOJI = { gas: '⛽', food: '🍗', sleep: '💤', shop: '🍫', wash: '💦', repair: '🔧' };  // emojis que existen desde Android 7
export const COST = { road: 20, tree: 15, demo: 10 };
// Decoración: va en el pasto (sin calle) y sube el cobro de los negocios de las 8 casillas de alrededor.
// upkeep: gasto diario en días de 75 s, como KINDS. Emojis que existen desde Android 7.
export const DECOS = {
  bench:  { name: 'Banca',  emoji: '💺', cost: 60,  upkeep: 2, bonus: 0.05 },
  garden: { name: 'Jardín', emoji: '🌷', cost: 90,  upkeep: 3, bonus: 0.08 },
  neon:   { name: 'Letrero luminoso', short: 'Letrero', emoji: '💡', cost: 180, upkeep: 6, bonus: 0.12 },
};
// Vecinos que se ayudan: si un negocio tiene pegado a su pareja, los dos cobran NEIGHBOR_BONUS más
export const PAIRS = { food: 'sleep', sleep: 'food', gas: 'shop', shop: 'gas', wash: 'repair', repair: 'wash' };
export const NEIGHBOR_BONUS = 0.1, BONUS_MAX = 0.3;
export const CABS = ['#D7263D', '#1B998B', '#F46036', '#3F88C5', '#E2B33C', '#6A4C93', '#33363F', '#2A9D5C'];
export const TRAILERS = ['#F1F1F1', '#C7CDD6', '#E6DFCF', '#9DB6C8', '#D9534F', '#5C7F67'];
export const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
export const UI_FONT = '"Overpass","Helvetica Neue",Arial,sans-serif';
