import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { game, save } from './state.js';
import { pauseAudio, resumeAudio } from './audio/sound.js';
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
}

// Quita la pantalla de carga cuando el juego ya dibujó su primer cuadro
export function nativeReady() {
  if (isNative()) SplashScreen.hide().catch(() => {});
}
