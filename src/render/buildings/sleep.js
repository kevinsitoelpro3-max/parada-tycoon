import { game } from '../../state.js';
import { P, poly, box, cbox, winX, winY, shade } from '../iso.js';

/* ---------- Hotel de paso ---------- */
// Motel de carretera: planta baja con recepción y pisos de cuartos con pasillo exterior y barandal.
// Nivel 1 = planta baja + 1 piso, nivel 2 = + 2 pisos, nivel 3 = + 3 pisos. Letrero vertical en el costado.
// Dibuja el negocio en la casilla (x, y) y devuelve la altura del techo (para poner el ícono encima).
// t.lvl es el nivel (1 a 3) y t.off > 0 significa que está sin luz.

const WALL = '#4A7FC1';    // azul de identidad (KINDS.sleep)
const DOOR = '#22344F';
const RAIL = '#F4F6F9';
const SIGN = '#22344F';     // letrero: marco y letras azul marino
const SIGN_DK = '#1A2840';

// Número de 0 a 1 que solo depende de los enteros dados (para decidir qué cuartos tienen la luz prendida)
function hash(a, b, c) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export default function draw(x, y, t) {
  const lvl = t.lvl || 1, off = t.off > 0, night = game.dark && !off;
  const X = u => x + u, Y = v => y + v;
  const n = lvl + 1, FH = 0.36;               // pisos (contando la planta baja) y alto de cada uno
  const u0 = 0.16, u1 = 0.86, v0 = 0.12, v1 = 0.62, cv = 0.72;   // cuerpo y pasillo
  const top = n * FH, h = top + 0.06;

  // Color de una ventana: de día vidrio o cortina; de noche unas prendidas y otras no
  const win = (f, i) => {
    const r = hash(x * 7 + i, y * 5 + f, lvl);
    if (off) return '#3F4A57';
    if (night) return r < 0.62 ? '#FFD47A' : '#22314A';
    return r < 0.4 ? '#F3E3C3' : '#CFE4F4';
  };

  // Estacionamiento al frente
  for (const u of [0.42, 0.62, 0.82]) poly([P(X(u), Y(0.8)), P(X(u + 0.025), Y(0.8)), P(X(u + 0.025), Y(0.95)), P(X(u), Y(0.95))], '#F4F1E8');

  // Cuerpo
  cbox(X(u0), Y(v0), X(u1), Y(v1), 0, h, WALL);
  // azotea con pretil y tinaco
  poly([P(X(u0 + 0.04), Y(v0 + 0.04), h), P(X(u1 - 0.04), Y(v0 + 0.04), h), P(X(u1 - 0.04), Y(v1 - 0.04), h), P(X(u0 + 0.04), Y(v1 - 0.04), h)], '#8EA3BD');
  cbox(X(0.24), Y(0.18), X(0.38), Y(0.32), h, h + 0.12, '#E9EDF2');
  cbox(X(0.62), Y(0.2), X(0.76), Y(0.3), h, h + 0.07, '#B7C2CF');

  // Fachada: cada piso con 3 cuartos (puerta + ventana); en la planta baja, la recepción a la derecha
  for (let f = 0; f < n; f++) {
    const zb = f * FH;
    for (let i = 0; i < 3; i++) {
      const s = u0 + 0.035 + i * 0.23;
      if (f === 0 && i === 2) {
        winY(X(s), X(s + 0.19), Y(v1), zb, zb + 0.22, '#FFFFFF');
        winY(X(s + 0.015), X(s + 0.175), Y(v1), zb, zb + 0.205, off ? '#3F4A57' : night ? '#FFE3A0' : '#9CCBE6');
        continue;
      }
      winY(X(s), X(s + 0.075), Y(v1), zb, zb + 0.21, DOOR);
      winY(X(s + 0.1), X(s + 0.19), Y(v1), zb + 0.08, zb + 0.2, win(f, i));
    }
    // foco del pasillo entre el primer y el segundo cuarto
    winY(X(u0 + 0.228), X(u0 + 0.26), Y(v1), zb + 0.13, zb + 0.19, off ? '#5A6472' : night ? '#FFF0B8' : '#DDE6F0');
    // costado (+x): dos ventanas por piso
    for (let j = 0; j < 2; j++) {
      const s = j ? 0.48 : 0.15;
      winX(X(u1), Y(s), Y(s + 0.1), zb + 0.1, zb + 0.25, win(f, 3 + j));
    }
  }

  // Pasillos exteriores con barandal (uno por piso de arriba) y techo del último
  const floorTop = night ? '#F5D58E' : '#E4E8EE';
  for (let f = 1; f < n; f++) {
    const z = f * FH;
    box(X(u0), Y(v1), X(u1), Y(cv), z - 0.035, z, floorTop, '#C9D0DA', '#AEB7C4');
    box(X(u0), Y(cv - 0.012), X(u1), Y(cv), z, z + 0.1, RAIL, RAIL, '#D3D9E1');
  }
  cbox(X(u0), Y(v1), X(u1), Y(cv), top, h, WALL);
  // postes
  cbox(X(u0), Y(cv - 0.03), X(u0 + 0.03), Y(cv), 0, top, '#E9EDF2');
  cbox(X(u1 - 0.03), Y(cv - 0.03), X(u1), Y(cv), 0, top, '#E9EDF2');

  // Letrero vertical en el costado, saliendo de la pared y por encima de la azotea: cuatro "letras" sin texto
  const s0 = 0.3, s1 = h + 0.28;
  // Familia de color propia del hotel: marco azul marino con cara amarilla (el rojo es de la gasolinera)
  const face = off ? '#B9A97A' : night ? '#FFE680' : '#F2C230';
  const ink = off ? '#4A5363' : SIGN;
  box(X(u1), Y(0.37), X(0.985), Y(0.46), s0, s1, SIGN_DK, SIGN, SIGN_DK);
  winY(X(u1 + 0.018), X(0.967), Y(0.46), s0 + 0.035, s1 - 0.035, face);
  winX(X(0.985), Y(0.385), Y(0.445), s0 + 0.035, s1 - 0.035, shade(face, -0.16));
  const step = (s1 - s0 - 0.1) / 4;
  for (let k = 0; k < 4; k++) {
    const z = s1 - 0.07 - k * step;
    winY(X(0.895), X(0.955), Y(0.46), z - step * 0.6, z, ink);
  }
  return h + 0.12;   // el ícono va sobre el centro de la azotea; el letrero queda a un lado
}
