# Medir en SU móvil (adb + CDP)

> Estas cuatro herramientas son las que encontraron el fallo del gesto la noche del 2026-07-27.
> **No son de usar y tirar: sin ellas se mide a ciegas.** Contexto completo en
> [`docs/LAG-DESLIZAR.md`](../../docs/LAG-DESLIZAR.md) §0.

## Poner el canal (una vez)

1. `MICARTERA_WEBDEBUG=1` en `android/local.properties` (ese fichero **no va al repo**).
2. `cd android && JAVA_HOME="C:/Program Files/Android/Android Studio/jbr" ./gradlew assembleRelease --offline`
3. `adb install -r android/app/build/outputs/apk/release/app-release.apk`
   Misma firma que la suya → **conserva sus datos y el bundle OTA**.
4. Abrir la app y enchufar el puerto:

```bash
PID=$(adb shell pidof com.micartera.app | tr -d '\r')
adb forward tcp:9222 localabstract:webview_devtools_remote_$PID
curl -s http://localhost:9222/json/list
```

⚠ `WebView.setWebContentsDebuggingEnabled(true)` va **después** de `super.onCreate()`: Capacitor lo
apaga al montar el puente (`Bridge.java:599`). La APK que publica el CI nunca lleva el socket.

## Las herramientas

Todas se lanzan con `node tools/movil/<x>.mjs [segundos]` con el móvil delante y la app abierta.
No hacen falta dependencias: el `WebSocket` es el nativo de Node 22+.

| | qué mide | cuándo usarla |
|---|---|---|
| `gestos.mjs` | toques, **gestos cancelados** por el navegador y **arrastres que vuelven a la misma pestaña** | **empieza siempre por aquí** si el síntoma es «no responde» o «hay un stopper» |
| `medir-renders.mjs` | re-renders de `Expenses` al deslizar (parchea el global y remonta) | **si el lag depende del DESTINO** (Deudas→Gastos sí / →Cartera no) |
| `fluidez.mjs` | dónde está el carrusel **en cada frame**: huecos, parones y saltos, con el scroll y la barra al lado | si el síntoma es «se mueve raro» o «pierde fluidez» |
| `frames.mjs` | frames perdidos (deltas de `rAF`) con el contexto de cada uno | para descartar que el hilo principal tenga la culpa |
| `frames-ab.mjs` | A/B intercalado con el **veredicto de frames de Chromium** (`PipelineReporter`), solo en la ventana del desliz | para comparar dos variantes; edita la lista `CONF` con los parches CSS a probar |
| `huecos.mjs` | **métrica buena**: huecos entre frames *presentados* (no rAF, no `% DROPPED`) | si el síntoma es «se pierde la fluidez al soltar» |
| `banco.mjs` / `ab-waapi.mjs` | banco sintético que SÍ reproduce el judder del asentamiento + A/B de cómo asentar | iterar sin su dedo cuando el fallo es la transition CSS |
| `en-vivo.mjs` | graba SUS gestos con umbral de SU refresco (120 Hz → malo >12,5 ms, no 32) | cuando haga falta su dedo de verdad |
| `cdp-swipe.mjs` | dispara un swipe con `Input.dispatchTouchEvent` (muchos puntos intermedios, sin el ruido de `adb shell input swipe`) | cuando `adb input swipe` NO dispara el reconocedor de gestos de la app (medido 2026-08-05: con `adb input swipe` el estado de arrastre de la app nunca se activaba; con este sí) — `node tools/movil/cdp-swipe.mjs x1 y1 x2 y2 duraciónMs pasos` |
| `png-pixel.mjs` | decodifica un PNG de `Page.captureScreenshot` y lee el RGB exacto de un píxel (sin dependencias, PNG con filtros estándar) | cuando `getComputedStyle` dice que algo está bien pero hay que comprobar qué se pinta DE VERDAD (opacidad real, fugas, intensidad de un color) — `node tools/movil/png-pixel.mjs captura.png x y` |
| `season-check.mjs` / `season-hotfix.mjs` | diagnóstico y parche en caliente (sin esperar OTA) de la ambientación de temporada (destello + lluvia + barra) | plantilla para reproducir/parchear en vivo un bug de CSS visual antes de tocar `src/` |

## Las trampas, todas pagadas ya

1. **`dumpsys gfxinfo` MIENTE en una app WebView**: daba 112 fps y un frame malo en 33 s con la
   pantalla congelada. Una WebView pinta siempre su último fotograma y Android lo cuenta como bueno.
2. **Grabar una traza de Chromium provoca el tirón que buscas**: con `Tracing` puesto salen frames
   de 90 ms donde con un medidor ligero no sale ninguno. Y 9 s de traza son 100 MB. (Para atribuir
   QUÉ trabaja sí vale; para tiempos, no.)
3. **Los huecos del screencast no son parones**: si solo se mueve un `transform` (compositor), no
   se genera fotograma nuevo y parece que la pantalla está quieta.
4. **`adb shell input swipe` NO reproduce el caso del scroll+inercia.** Pero SÍ reproduce el
   judder del asentamiento CSS (34 frames perdidos clavados). El banco `banco.mjs` arranca fuera
   de la franja de Ajustes (`EDGE_OPEN`=52 px).
5. **`rAF` no ve el compositor.** El desliz va por `transform`; si el frame se cae al componer,
   rAF sigue a 8,3 ms. **`% DROPPED` tampoco**: 33 % en reposo es normal (pide 183/s, presenta 122).
6. **Umbral de 32 ms es de 60 Hz.** Su móvil va a 120 (frame = 8,3 ms). Un salto de 16,6 ms ya se ve.
7. **`adb shell input touchscreen swipe` puede NO disparar el reconocedor de gestos de la app**
   (2026-08-05: probado en Inicio, tres veces, distintos puntos — el estado de arrastre de React
   nunca se activaba, aunque el toque SÍ llegaba, `adb shell input tap` cambiaba de pestaña sin
   problema). Usa `cdp-swipe.mjs` (`Input.dispatchTouchEvent` con puntos intermedios de verdad)
   cuando necesites que la app trate el gesto como un swipe real, no solo que el dedo "llegue".
8. **`screenrecord` puede dar `Permission denied` en ROMs con capa (ColorOS/Oppo) aunque
   `/data/local/tmp` sea escribible** (confirmado con `touch`) y sobre disco de sobra. No hay
   vuelta fácil sin root: usa capturas sueltas por CDP (`Page.captureScreenshot`) en los instantes
   que te interesan en vez de vídeo continuo.
9. **`getComputedStyle` puede decir "fixed"/"opacity:1" y aun así no explicar lo que él ve.**
   Para fugas o intensidad de color, lee el PÍXEL real (`png-pixel.mjs` sobre una captura), no
   solo el CSS computado — así se encontró que el "destello" no tenía un bug de posición sino de
   intensidad (2026-08-05, ver `CHANGELOG.md` 4.15.0 punto 9).

## Y la regla que lo resume

**Si el síntoma es «no responde», mide si el gesto CUENTA.** **Si el síntoma es «se pierde la
fluidez», mide huecos entre frames presentados** (`huecos.mjs`), no rAF ni tareas largas.
