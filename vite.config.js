import { defineConfig } from 'vite';

// base relativa: el juego funciona igual en la raíz de un dominio, en una subcarpeta
// (por ejemplo GitHub Pages) o empaquetado dentro de una app.
export default defineConfig({
  base: './'
});
