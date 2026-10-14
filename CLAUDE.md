# Parada Tycoon

Juego tipo tycoon de una parada de tráileres junto a una carretera. El jugador traza calles, abre gasolineras, comedores y hoteles de paso, y atiende a los tráileres que pasan. Vista isométrica, pensado primero para celular.

## Estado actual

- Proyecto con Vite: HTML en `index.html`, estilos en `src/styles.css` y el juego en módulos de JavaScript dentro de `src/` (sin dependencias en tiempo de juego; dibuja con canvas 2D).
- `npm install` una vez; `npm run dev` para jugar mientras programas (también abre en el celular por la red local); `npm run build` genera la versión publicable en `dist/`; `npm run preview` la sirve para probarla.
- La partida se guarda en `localStorage` con la clave `parada-tycoon-v1` (el formato interno ya va en la versión 2; carga partidas de la versión 1).
- No hay fuentes externas: la tipografía Overpass viene del paquete `@fontsource/overpass` (licencia OFL) y los sonidos y la música se generan con Web Audio. El juego funciona sin internet.
- Las preferencias de sonido se guardan aparte, con la clave `parada-tycoon-audio` (`{ music, sfx }`).
- **App de Android con Capacitor 8** (`capacitor.config.json`, carpeta `android/`). Identificador `com.kevinsito.paradatycoon` (no cambiarlo nunca: es el de Play Store). Solo vertical.
  - `npm run android` arma el juego y lo copia a `android/`; `npm run android:open` abre Android Studio.
  - GitHub Actions (`.github/workflows/android.yml`) construye el APK de prueba en cada pull request y, en cada cambio a `main`, lo publica en la release `prueba-android` del repo.
  - El APK de prueba se firma con `android/app/debug.keystore` (contraseña pública `android`) para que se instale encima del anterior sin perder la partida. La llave de Play Store es otra y nunca se sube (`*.jks` y `keystore.properties` están en `.gitignore`).
  - Al publicar una versión nueva, subir `versionCode` (entero, +1 cada vez) y `versionName` en `android/app/build.gradle`, y `version` en `package.json`.
  - La app guarda sus partidas por separado de la versión web.

## Cómo funciona

- **Mapa:** 8 columnas por 10 filas. La columna `x = 0` es la carretera principal, de un solo sentido hacia abajo. El terreno se puede ampliar de 2 en 2 filas hasta 16.
- **Construcción:** calle $20, gasolinera $250, comedor $400, hotel de paso $600, tiendita $200, lavado $350, taller $700, demoler $10 (quitar árbol $15; demoler un negocio devuelve la mitad). Las calles deben salir de la carretera o de otra calle; los negocios deben quedar pegados a una calle.
- **Tráileres:** aparecen arriba de la carretera. El 82 % pide algo (⛽ diésel, 🍗 comida o 💤 descanso). Al aparecer buscan con BFS un negocio de ese tipo con espacio libre y conectado; si lo hay, apartan un lugar, entran, esperan el servicio y pagan. Si no, pasan de largo enojados.
- **Negocios extra** (`extra: true` en `KINDS`): 🛒 tiendita (cobra $20, 1.5 s, gasto $25), 🚿 lavado ($45, 3.5 s, $45) y 🔧 taller ($110, 7 s, $90); gastos en base a días de 75 s, antes de `DAY_SCALE`. Cada uno abre un mercado nuevo **sin quitarles clientes a los básicos**: atienden a tráileres que antes pasaban de largo (el 18 % sin pedido). Cada tipo extra que ya tengas se queda con `EXTRA_SHARE` (0.3) de esos tráileres; con los tres, el 90 %. El reparto de gasolina, comida y descanso no cambia. Sin negocios extra no hay sorteo extra: el azar es idéntico a antes y nadie pide algo que no tienes. Pedidos: 🍫, 💦 y 🔧 (usar emojis que existen desde Android 7: la app soporta minSdk 24).
- **Negocios:** nivel 1 a 3. Cada nivel suma un lugar y +50 % de cobro. Mejorar cuesta el precio base por el nivel actual.
- **Días:** cada día dura 180 segundos de juego (`DAY_LEN`), con un reloj de 06:00 a 24:00 en el marcador. Al cierre ("corte de caja") se pagan gastos de negocios y calles, con inflación de 6 % por día.
- **Escala del día:** el balance se hizo con días de 75 s. `DAY_SCALE = DAY_LEN / 75` multiplica los gastos diarios y la hora de los eventos, así que cambiar `DAY_LEN` no cambia lo que se gana o paga por minuto. Las metas que dependen del largo del día usan $5,000 en un día, `PERFECT_DAY_MIN` (25) clientes sin enojados y llegar al día 10.
- **Quiebra:** depende del modo; si cierras en rojo demasiados días seguidos, termina la partida.
- **Reputación (1 a 5 estrellas):** sube al atender y baja al perder clientes (baja más si tenías el negocio pero estaba lleno o sin luz). Afecta el tráfico y las propinas.
- **Hora pico:** del 40 % al 65 % del día (13:10 a 17:40) llegan el doble de tráileres.
- **Eventos (desde cierto día):** lluvia (tráileres más lentos), apagón (un negocio sin luz 25 s), más diésel y caravana.
- **Modos:** Fácil, Normal y Difícil (dinero inicial, gastos, tráfico, castigo de reputación y días en rojo permitidos).
- **Metas:** 22 metas con premio, en tres temporadas (la tercera, de negocios extra).
- **Pantalla de inicio:** sale al abrir el juego y desde ☰ → Volver al inicio. Mientras está abierta el juego queda en pausa (`game.paused`). Tiene Continuar (si hay partida), los tres modos (tocar dos veces si hay partida que perder) e interruptores de Música y Efectos. El primer toque desbloquea el audio del celular.
- **Android:** el botón atrás cierra la ficha, luego el menú, luego quita la herramienta; en pleno juego abre el menú; en la pantalla de inicio o en la quiebra sale de la app. Al pasar a segundo plano guarda la partida y pausa el sonido. Los márgenes de las barras del sistema llegan como `--safe-area-inset-*`.
- **Sonido:** efectos para construir, demoler, cobrar, tráiler enojado, mejorar, meta, cierre del día, hora pico, caravana, apagón, quiebra, errores y botones; lluvia de fondo; música en bucle que va 15 % más rápido en hora pico y se detiene en la quiebra.

## Estructura del código

```
index.html              HUD, mapa, ficha, menú, quiebra y barra de herramientas
src/styles.css          estilos (tema claro y oscuro)
src/main.js             conecta los controles, arranca la partida y corre el ciclo de cuadros
src/config.js           tamaño del mapa, negocios (KINDS), modos (MODES), precios y colores
src/goals.js            las 22 metas (tres temporadas)
src/state.js            estado compartido (game), fórmulas de cobro y gastos, partida nueva, guardar y cargar
src/routes.js           rutas con BFS y lugar de estacionamiento
src/trucks.js           aparición, movimiento y cobro de los tráileres
src/days.js             cierre del día, eventos, quiebra y ampliar terreno
src/tools.js            qué se puede construir dónde y aplicar la herramienta
src/sim.js              update: avanza la simulación un paso
src/camera.js           cámara, zoom y conversión de pantalla a casilla
src/input.js            tocar, arrastrar, pellizcar y rueda del mouse
src/theme.js            lee el tema claro u oscuro para el mapa
src/render/iso.js       primitivas isométricas (P, poly, box, shade...)
src/render/scene.js     suelo, calles, árboles, negocios, tráileres y lluvia
src/render/overlays.js  íconos de negocios, burbujas y números flotantes
src/render/draw.js      dibuja un cuadro completo en orden de profundidad
src/ui/                 hud, toast, dock (herramientas), sheet (ficha del negocio), menu y start (pantalla de inicio)
src/audio/sound.js      contexto de audio, volúmenes, desbloqueo y preferencias
src/audio/sfx.js        efectos de sonido y lluvia
src/audio/music.js      música en bucle
src/native.js           solo en la app de Android: botón atrás, pausa/reanudar y pantalla de carga
assets/src/*.svg        dibujos del ícono y la pantalla de carga (fuente editable)
assets/*.png            esos dibujos en PNG; con `npx @capacitor/assets generate --android` se generan todos los tamaños en android/
```

Todo lo que cambia durante la partida vive en el objeto `game` de `src/state.js` (`game.S` es la partida guardable, `game.H` las filas, `game.trucks`, `game.tool`, etc.). Los módulos lo importan y lo modifican ahí, nunca con variables globales sueltas.

## Reglas para trabajar en este proyecto

- Todos los textos del juego en español, tratando al jugador de "tú".
- El juego debe seguir funcionando en celular: tocar, arrastrar para trazar calles y pellizcar para acercar.
- No usar nombres, logos ni personajes de otros juegos o marcas.
- Antes de cambiar el balance (precios, tiempos, tráfico), explica qué número cambia y por qué.
- Probar en el navegador después de cada cambio grande y no romper las partidas guardadas.
- El código de audio nunca usa `Math.random` (usa `mulberry32`), para no cambiar el azar de la partida.

## Plan sugerido (por decidir con Kevin)

1. ~~Pasar el archivo único a un proyecto ordenado con Vite, separando el código en módulos, sin cambiar cómo se juega.~~ Hecho.
2. ~~Agregar sonidos, música y una pantalla de inicio.~~ Hecho.
3. ~~Empaquetarlo como app de Android con Capacitor.~~ Hecho (APK de prueba). Migrar a un motor como Godot queda solo si se quiere 3D real.
4. Preparar la publicación en Play Store.

Ideas pendientes: tráileres que piden dos cosas en la misma visita, taller y lavado de tráileres, filas que se atascan, ciclo de noche, más tipos de terreno.
