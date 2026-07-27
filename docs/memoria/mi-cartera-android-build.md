<!-- GENERADO POR scripts/sync-memoria.mjs — NO EDITAR A MANO.
     Espejo de la memoria del agente (mi-cartera-android-build.md). Se regenera con `npm run memoria`.
     Pasado por el filtro de datos personales: el repo es PÚBLICO. -->

---
name: mi-cartera-android-build
description: Cómo generar e instalar la APK firmada de Mi Cartera localmente (build nativo Android)
metadata:
  type: project
  originSessionId: c5f21067-5c4f-487a-88db-7ba95d66abb5
---

Receta para generar la APK firmada de Mi Cartera desde este entorno (Windows, Git Bash), usada por primera vez para alpha8 (2026-07-07). Ver [[mi-cartera-deploy]] para el deploy web/Supabase (eso va por CI; esto es 100% local).

**Prerrequisito — `java` NO está en el PATH del shell.** Hay que exportar `JAVA_HOME` al JBR de Android Studio antes de cualquier `gradlew`:
```
export JAVA_HOME="/c/Program Files/Android/Android Studio/jbr"
export PATH="$JAVA_HOME/bin:$PATH"
```

**Keystore de release YA EXISTE** (creada 2026-07-05, fuera del repo): `C:/Users/<usuario>/.micartera/micartera-release.keystore`, referenciada desde `android/local.properties` (gitignored) con las claves `MICARTERA_KS_FILE/MICARTERA_KS_PASS/MICARTERA_KEY_ALIAS/MICARTERA_KEY_PASS`. `android/app/build.gradle` ya tiene `signingConfigs.release` leyendo esas claves — si están presentes, `assembleRelease` produce una APK firmada (certificado "CN=Mi Cartera, O=JuanjoAvila, C=ES"). Sin ellas, generaría un APK sin firmar.

**Receta completa (bump de versión → build → firma → instalar):**
1. Bump manual en `android/app/build.gradle`: `versionCode` +1, `versionName` (p.ej. `4.0.0-alpha8`). Va sincronizado con el `VERSION`/CHANGELOG del repo pero es un campo nativo aparte.
2. `node scripts/build-www.mjs` — copia `public/` → `www/` (gitignored) y sella `APP_VERSION` en la copia; **`public/` queda intacto** (sigue en "dev"). NO usar `npm run stamp` para esto (ese script escribe el sello directamente en `public/index.html`, pensado solo para el runner de CI que nunca commitea de vuelta).
3. `npx cap sync android` — copia `www/` a `android/app/src/main/assets/public` + sincroniza plugins.
4. Desde `android/`: `./gradlew assembleRelease --offline` (con JAVA_HOME puesto). `--offline` funciona porque las deps ya están cacheadas; si algún día falla por falta de caché, quitar `--offline`. APK sale en `android/app/build/outputs/apk/release/app-release.apk`.
5. Verificar firma/versión (opcional pero barato): `apksigner.bat verify --print-certs` y `aapt.exe dump badging` desde `$ANDROID_SDK/build-tools/<ver>/` (SDK en `C:/Users/<usuario>/AppData/Local/Android/Sdk`, sacado de `android/local.properties` → `sdk.dir`).

**QUIRKS DE ADB APRENDIDOS A GOLPES (2026-07-13/15, sesión de la saga TR):**
- **`export MSYS_NO_PATHCONV=1` SIEMPRE en Git Bash.** Sin eso, Git Bash mangla las rutas del móvil: `adb push x /data/local/tmp/y` intenta copiar a `E:/Programas/Git/data/local/tmp/y` y falla con «remote secure_mkdirs() failed».
- **`adb install -r` fallaba a rachas** con «device offline» / error vacío (USB inestable de este móvil). Lo que SÍ funciona de forma fiable: `adb push <apk> /data/local/tmp/x.apk` + `adb shell pm install -r /data/local/tmp/x.apk` (esperar `Success`), envuelto en un bucle de reintentos que comprueba `adb get-state` = `device`.
- El móvil aparece `offline` un rato tras `kill-server`/reinstalar; reintentar unos segundos en bucle en vez de rendirse.
- **`run-as` NO sirve** para leer prefs: la APK de release no es debuggable. Para inspeccionar estado nativo, exponerlo por otra vía.

**Instalar directo en el móvil del usuario por USB (adb):** `adb.exe` está en `$SDK/platform-tools/adb.exe` (no en el PATH). `adb devices` puede salir vacío o `offline` la primera vez — **el usuario tiene que mirar la pantalla del móvil y pulsar "Permitir" en el diálogo de autorización de depuración USB** (con "confiar siempre en este ordenador"); tras eso, `adb kill-server && adb start-server && adb devices` lo muestra como `device`. Entonces `adb install -r <apk>` actualiza SIN perder datos/sesión (equivalente a actualizar por la Play Store, pero sideload). Confirmar versión instalada con `adb shell dumpsys package com.micartera.app | grep version`.

**Compartir con terceros (pareja/amigos):** copiar la APK generada a la raíz del proyecto (o cualquier sitio) y pasarla por WhatsApp/Drive/USB; el receptor la abre y la instala (Android pedirá permitir "orígenes desconocidos" la primera vez). El repo tiene `*.apk` en `.gitignore` (añadido 2026-07-07) — nunca se comitea el binario.

**Solo Java compila offline, no lo confundas con "build completo":** en sesiones anteriores se validó únicamente `./gradlew :app:compileDebugJavaWithJavac --offline` (rápido, solo detecta errores de sintaxis/tipos Java) antes de tener claro el flujo de `assembleRelease` end-to-end. Ahora que se ha hecho el build+firma+instalación completos con éxito (alpha8), ese es el camino ya probado para cualquier tanda que incluya cambios nativos.
