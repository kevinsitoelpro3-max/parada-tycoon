import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics } from '@capacitor/haptics';
import { game, save } from './state.js';
import { pauseAudio, resumeAudio, prefs } from './audio/sound.js';
import { sfx } from './audio/sfx.js';
import { setHaptic, buzz } from './fx.js';
import { setTool } from './ui/dock.js';
import { sheetEl, closeSheet } from './ui/sheet.js';
import { menuEl, openMenu } from './ui/menu.js';
import { isStartOpen } from './ui/start.js';
import { isChoiceOpen, pickChoice } from './ui/choice.js';

/* ---------- App de Android ---------- */
// Solo hace algo dentro de la app (Capacitor); en el navegador no cambia nada.
export const isNative = () => Capacitor.isNativePlatform();

// Botón "atrás" de Android: cierra lo que esté abierto, de lo más chico a lo más grande.
// En la pantalla de inicio (o con la partida en quiebra) sale de la app.
export function handleBack() {
  if (isChoiceOpen()) pickChoice(1);
  else if (!sheetEl.hidden) closeSheet();
  else if (!menuEl.hidden) menuEl.hidden = true;
  else if (isStartOpen() || game.S.over) return 'exit';
  else if (game.tool !== 'none') setTool('none');
  else openMenu();
  return 'handled';
}

export function setupNative() {
  if (!isNative()) return;
  App.addListener('backButton', () => { if (handleBack() === 'exit') App.exitApp(); });
  // Al pasar a segundo plano se guarda la partida y se pausa el sonido
  App.addListener('pause', () => { save(); pauseAudio(); });
  App.addListener('resume', () => resumeAudio());
  // Vibración corta al construir, mejorar, cumplir metas y en los errores (se apaga con los efectos)
  setHaptic(kind => {
    if (!prefs.sfx) return;
    const p = kind === 'success' ? Haptics.notification({ type: 'SUCCESS' })
      : kind === 'error' ? Haptics.notification({ type: 'WARNING' })
      : Haptics.impact({ style: kind === 'medium' ? 'MEDIUM' : kind === 'heavy' ? 'HEAVY' : 'LIGHT' });
    p.catch(() => {});
  });
  const HAPTIC = { build: 'medium', road: 'light', upgrade: 'heavy', demolish: 'medium', goal: 'success', nope: 'error' };
  for (const [k, kind] of Object.entries(HAPTIC)) {
    const f = sfx[k];
    if (typeof f === 'function') sfx[k] = (...a) => { f(...a); buzz(kind); };
  }
}

// Quita la pantalla de carga cuando el juego ya dibujó su primer cuadro
export function nativeReady() {
  if (isNative()) SplashScreen.hide().catch(() => {});
}
