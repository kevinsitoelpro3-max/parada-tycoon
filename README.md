# Parada Tycoon

Juego tipo tycoon de una parada de tráileres junto a una carretera. Trazas calles, abres gasolineras, comedores y hoteles de paso, y atiendes a los tráileres que pasan. Vista isométrica, pensado primero para celular.

## Cómo jugarlo en tu computadora

Necesitas [Node.js](https://nodejs.org/) 22 (o 20.19 en adelante).

```bash
npm install      # solo la primera vez
npm run dev      # abre el juego en http://localhost:5173
```

`npm run dev` también muestra una dirección de red (por ejemplo `http://192.168.1.20:5173`). Ábrela en tu celular, conectado al mismo wifi, para probarlo con el dedo.

## Cómo publicarlo

```bash
npm run build    # genera la carpeta dist/
npm run preview  # sirve dist/ para revisarla antes de subirla
```

Sube el contenido de `dist/` a cualquier hosting estático (por ejemplo GitHub Pages).

El juego abre con una pantalla de inicio: ahí sigues tu partida o empiezas otra, y prendes o apagas la música y los efectos (también desde el menú ☰).

La partida se guarda en el navegador (`localStorage`), por separado en cada dirección web donde abras el juego.

## App de Android

Cada vez que se sube algo a `main`, GitHub construye el APK de prueba y lo deja en la release **prueba-android** del repo (pestaña *Releases*). Desde el celular:

1. Abre la release `prueba-android` y descarga `parada-tycoon-prueba.apk`.
2. Ábrelo. La primera vez Android te pide permitir "instalar apps de origen desconocido" para el navegador o el administrador de archivos.
3. Las siguientes versiones se instalan encima, sin perder tu partida.

Para construirlo en tu computadora necesitas Android Studio:

```bash
npm run android        # arma el juego y lo copia a android/
npm run android:open   # abre el proyecto en Android Studio (botón ▶ para instalarlo)
```

Detalles de cómo funciona el juego y cómo está organizado el código: [CLAUDE.md](CLAUDE.md).
