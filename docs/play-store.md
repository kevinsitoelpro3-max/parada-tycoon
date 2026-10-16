# Publicar Parada Tycoon en Play Store

Guía paso a paso para Kevin. Lo que ya está listo en el repositorio:

- Versión **1.0.0** (`versionCode 5`) en `android/app/build.gradle` y `package.json`.
- `build.gradle` firma la versión de publicación con tu llave si existe `android/keystore.properties` (ese archivo y la llave nunca se suben: están en `.gitignore`).
- Acción de GitHub **"Paquete para Play Store"** (`.github/workflows/play-store.yml`) que arma el `.aab` firmado.
- Política de privacidad: `docs/privacidad.html`.
- Imágenes para la ficha: `docs/tienda/` (ícono 512 × 512, gráfico 1024 × 500 y 3 capturas de 1080 × 1920).

Lo que solo tú puedes hacer está marcado con 👉.

## 1. Cuenta de desarrollador

👉 Crea tu cuenta en <https://play.google.com/console> (pago único de 25 dólares). Google te pide verificar tu identidad. Puede tardar unos días.

## 2. Crear tu llave de publicación (una sola vez)

👉 En una computadora con Java instalado (Android Studio ya lo trae), abre una terminal y escribe:

```
keytool -genkeypair -v -keystore parada-release.jks -alias parada -keyalg RSA -keysize 2048 -validity 10000
```

Te pide una contraseña y unos datos (nombre, ciudad, país). **Guarda el archivo `parada-release.jks` y la contraseña en un lugar seguro** (por ejemplo, en tu Google Drive y en una memoria USB). Si los pierdes, no podrás actualizar el juego. Nunca lo subas al repositorio.

## 3. Dar la llave a GitHub como secreto

👉 Convierte la llave a texto (base64):

- **Windows (PowerShell):** `[Convert]::ToBase64String([IO.File]::ReadAllBytes("parada-release.jks")) | Set-Clipboard`
- **Mac o Linux:** `base64 -i parada-release.jks | pbcopy` (en Linux: `base64 -w0 parada-release.jks`)

👉 En GitHub: repositorio → **Settings → Secrets and variables → Actions → New repository secret**, y crea estos 4:

| Nombre | Valor |
|---|---|
| `PLAY_KEYSTORE_BASE64` | el texto que copiaste |
| `PLAY_KEYSTORE_PASSWORD` | la contraseña del almacén |
| `PLAY_KEY_ALIAS` | `parada` |
| `PLAY_KEY_PASSWORD` | la contraseña de la llave (si no pusiste otra, la misma) |

## 4. Armar el paquete `.aab`

👉 GitHub → pestaña **Actions → Paquete para Play Store → Run workflow**. Al terminar (unos 3 minutos), abre la corrida y descarga **parada-tycoon-play-store** (trae `parada-tycoon.aab`).

> Si prefieres hacerlo en tu computadora: crea `android/keystore.properties` con `storeFile=../parada-release.jks`, `storePassword=…`, `keyAlias=parada` y `keyPassword=…`, y corre `npm run android` y luego `cd android && ./gradlew bundleRelease`.

## 5. Publicar la política de privacidad

👉 GitHub → **Settings → Pages → Branch: `main`, carpeta `/docs` → Save**. En unos minutos queda en:

<https://kevinsitoelpro3-max.github.io/parada-tycoon/privacidad.html>

Ese enlace es el que pones en la consola de Play.

## 6. Crear la app en la consola

👉 **Crear app** → nombre "Parada Tycoon", idioma español (Latinoamérica), juego, gratis.

Cuando te pregunte por la firma, deja **"Firma de apps de Google Play"** (Google guarda la llave final y la tuya queda como llave de subida: si un día la pierdes, se puede cambiar).

### Ficha de la tienda

- **Nombre:** Parada Tycoon
- **Descripción corta (80 caracteres máx.):**
  > Construye tu parada de tráileres: gasolineras, comedores, hoteles y más.
- **Descripción completa:**

  > Arma la mejor parada de tráileres de la carretera.
  >
  > Traza calles, abre gasolineras, comedores, hoteles de paso, tienditas, lavados, talleres y pensiones, y atiende a los tráileres que pasan día y noche. Cada cliente feliz sube tu reputación; cada uno que se va enojado te cuesta.
  >
  > • Más de 30 metas con premio, retos diarios y premio por volver cada día
  > • Sube de nivel y compra mejoras para tu parada
  > • Días con hora pico, noche y corte de caja
  > • Contratos de flotillas y eventos donde tú decides
  > • Decora tu parada y acomoda los negocios para que se ayuden
  > • Amplía tu terreno: río con puentes, cerro, desierto y una segunda carretera
  > • Tres dificultades y una guía para empezar
  > • Funciona sin internet, sin anuncios y sin compras dentro del juego

- **Ícono:** `docs/tienda/icono-512.png`
- **Gráfico de funciones:** `docs/tienda/grafico-1024x500.png`
- **Capturas de teléfono:** las 3 de `docs/tienda/` (puedes tomar más desde tu celular)
- **Categoría:** Juegos → Simulación
- **Correo de contacto:** kevinsitoelpro3@gmail.com

### Contenido de la app (formularios)

- **Política de privacidad:** el enlace del paso 5.
- **Anuncios:** No contiene anuncios.
- **Acceso a la app:** Todo disponible sin restricciones.
- **Clasificación de contenido:** responde el cuestionario: sin violencia, sin lenguaje fuerte, sin apuestas ni compras, sin interacción entre usuarios. Debería salir para todo público.
- **Público objetivo:** te conviene elegir **13 años o más**. Si eliges edades menores, Google pide requisitos extra del programa para familias.
- **Seguridad de los datos:** "La app no recopila ni comparte datos de usuarios". Todo se guarda solo en el celular.
- **App gubernamental, finanzas, salud, noticias:** No.

## 7. Prueba cerrada (requisito para cuentas personales nuevas)

Hoy Google pide que las cuentas personales nuevas hagan una **prueba cerrada con al menos 12 personas durante 14 días seguidos** antes de publicar para todos. Confírmalo en tu consola, porque Google cambia estas reglas.

👉 **Pruebas → Prueba cerrada → Crear versión** y sube el `.aab`. Agrega los correos de Gmail de tus testers (familia y amigos con Android). Cada uno tiene que aceptar la invitación desde el enlace que te da la consola e instalar el juego desde Play Store. Tienen que quedarse en la prueba los 14 días.

## 8. Producción

👉 Pasados los 14 días, en la consola aparece **Solicitar acceso a producción**. Contesta las preguntas sobre la prueba y, cuando te aprueben, crea la versión de **Producción** con el mismo `.aab` (o uno nuevo).

## Para cada actualización

1. Sube `versionCode` (+1) y `versionName` en `android/app/build.gradle`, y `version` en `package.json`.
2. Une los cambios a `main`.
3. Corre **Paquete para Play Store** y sube el nuevo `.aab` a la consola.
