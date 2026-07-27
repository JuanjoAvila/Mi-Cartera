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

## Las cuatro trampas, todas pagadas ya

1. **`dumpsys gfxinfo` MIENTE en una app WebView**: daba 112 fps y un frame malo en 33 s con la
   pantalla congelada. Una WebView pinta siempre su último fotograma y Android lo cuenta como bueno.
2. **Grabar una traza de Chromium provoca el tirón que buscas**: con `Tracing` puesto salen frames
   de 90 ms donde con un medidor ligero no sale ninguno. Y 9 s de traza son 100 MB.
3. **Los huecos del screencast no son parones**: si solo se mueve un `transform` (compositor), no
   se genera fotograma nuevo y parece que la pantalla está quieta.
4. **`adb shell input swipe` NO reproduce su caso.** No deja la inercia viva como su dedo, y un
   gesto sintético siempre acaba con un `touchend` limpio. **Su repro exige su dedo.**

## Y la regla que lo resume

**Si el síntoma es «no responde», mide si el gesto CUENTA, no cuánto tarda.** Cuatro instrumentos
de frames daban verde mientras él veía el fallo; lo que lo cazó fue contar cuántos arrastres
acababan en la pestaña de la que salieron.
