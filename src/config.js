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
  repair:{ name: 'Taller',        emoji: '🔧', cost: 700, pay: 110, time: 7, upkeep: 90, color: '#6B7280', extra: true },
  // Pensión: solo de noche (desde NIGHT_FROM); los tráileres se quedan y pagan al cierre del día
  park:  { name: 'Pensión',       emoji: '🅿️', cost: 500, pay: 120, time: Infinity, upkeep: 40, color: '#3B5BA5', night: true, side: true },
  // Zona de descarga: llegan tráileres de carga, pagan la cuota y surten a los negocios de alrededor
  dock:  { name: 'Zona de descarga', short: 'Descarga', emoji: '📦', cost: 300, pay: 40, time: 4, upkeep: 15, color: '#B07A3B', side: true }
};
// side: true = no cuenta para la meta de los 6 tipos, los contratos ni los retos de un tipo de negocio.
// Carga: de los tráileres que se iban sin pedir nada, CARGO_SHARE trae mercancía si tienes zona de
// descarga (con su propio sorteo: sin zona el azar es idéntico). Al descargar, cada negocio a
// STOCK_REACH casillas o menos (contando diagonales) recibe STOCK_GIVE de surtido, hasta STOCK_MAX.
// Cada cliente de un negocio surtido gasta 1 y paga STOCK_BONUS más.
export const CARGO_SHARE = 0.35, STOCK_REACH = 2, STOCK_GIVE = 6, STOCK_MAX = 30, STOCK_BONUS = 0.15;
// De los tráileres que pasan de largo sin pedir nada (18 %), cada tipo de negocio extra que ya
// tengas se queda con esta parte: con uno, el 30 % de ellos; con los tres, el 90 %.
export const EXTRA_SHARE = 0.3;
// De noche, de los tráileres sin pedido, esta parte busca dónde pasar la noche si tienes pensión
export const PARK_SHARE = 0.5;
// Filas: si el negocio está lleno, hasta QUEUE_MAX tráileres esperan en la calle de enfrente
// hasta QUEUE_WAIT segundos de juego antes de irse enojados
export const QUEUE_MAX = 2, QUEUE_WAIT = 10;
// Carretera de arriba: se abre desde ☰ con el terreno de HWY2_W columnas o más; la fila y = 0 se
// vuelve carretera (casillas 'hwy2') y por ella llega otra fila de tráileres, la mitad de seguido.
export const HWY2_W = 14, HWY2_COST = 8000, HWY2_RATE = 0.5;
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
export const NEED_EMOJI = { gas: '⛽', food: '🍗', sleep: '💤', shop: '🍫', wash: '💦', repair: '🔧', park: '🅿️', dock: '📦' };  // emojis que existen desde Android 7
export const COST = { road: 20, tree: 15, demo: 10, bridge: 120, rock: 150 };
// Terrenos nuevos (solo en el terreno que compras): rocas del cerro, desierto desde DESERT_Y filas o
// DESERT_X columnas, y un río la primera vez que amplías hacia abajo con RIVER_FROM filas o más.
export const DESERT_Y = 16, DESERT_X = 14, RIVER_FROM = 14;
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
// Precio de cada negocio (t.price: 0 barato, 1 normal, 2 caro): cuánto cobra, cuánta reputación
// da cada cliente y cuánto lo evitan los tráileres al elegir entre dos negocios del mismo tipo.
export const PRICES = [
  { name: 'Barato', mult: 0.8, rep: 0.045, avoid: -1.5 },
  { name: 'Normal', mult: 1,   rep: 0.03,  avoid: 0 },
  { name: 'Caro',   mult: 1.3, rep: 0.01,  avoid: 1.5 },
];
// Mejoras permanentes del dueño (☰ → Mejoras): cada nivel de dueño da un punto; cada mejora tiene
// hasta PERK_MAX rangos y cada rango suma `step` (ver cómo se usa cada una en state.js y trucks.js).
export const PERK_MAX = 5;
export const PERKS = {
  cobro:    { emoji: '💵', name: 'Buen servicio', step: 0.04, txt: v => `+${v} % de cobro en todos tus negocios` },
  rapido:   { emoji: '⚡', name: 'Servicio rápido', step: 0.06, txt: v => `Atienden ${v} % más rápido` },
  ahorro:   { emoji: '🧾', name: 'Ahorro', step: 0.05, txt: v => `${v} % menos gastos al cierre del día` },
  paciencia:{ emoji: '⏳', name: 'Sala de espera', step: 3, unit: 's', txt: v => `En la fila esperan ${v} s más` },
  trafico:  { emoji: '📣', name: 'Publicidad', step: 0.04, txt: v => `${v} % más tráileres` },
  fama:     { emoji: '🤝', name: 'Buena fama', step: 0.08, txt: v => `La reputación baja ${v} % menos` },
};
// Nivel de dueño: del nivel L al L + 1 hacen falta XP_BASE + XP_STEP × (L − 1) puntos de experiencia.
// Cada cliente atendido da 1; los retos, el premio diario y las propinas 💰 dan más.
export const XP_BASE = 30, XP_STEP = 20;
// Propina 💰: al terminar un servicio, CASH_CHANCE de las veces el negocio deja una bolsa que se cobra
// tocándolo (vale un cobro más). Dura CASH_TTL segundos reales.
export const CASH_CHANCE = 0.12, CASH_TTL = 8;
export const CABS = ['#D7263D', '#1B998B', '#F46036', '#3F88C5', '#E2B33C', '#6A4C93', '#33363F', '#2A9D5C'];
export const TRAILERS = ['#F1F1F1', '#C7CDD6', '#E6DFCF', '#9DB6C8', '#D9534F', '#5C7F67'];
export const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
export const UI_FONT = '"Overpass","Helvetica Neue",Arial,sans-serif';
