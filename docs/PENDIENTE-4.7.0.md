# Pendiente para publicar la 4.7.0 (esta tarde, desde el PC)

> Chuleta para Juanjo + la IA del PC (Cursor / Claude Code). La rama
> `claude/notifications-recaptcha-ui-bugs-2axcji` ya lleva TODO el código verificado
> (unit + 7 E2E + 3 specs de navegador de lo nuevo). Lo que queda es publicar:
> merge → OTA sola; APK 31 → compilar, subir release y apuntar `apk.json`.
> Cuando esté todo hecho, **borrar este fichero**.

## 1. Merge a `main` (activa la OTA web)

- [ ] Abrir PR de `claude/notifications-recaptcha-ui-bugs-2axcji` → `main` (o merge directo) y mezclarlo.
- [ ] Verificar que el workflow de **Pages** acaba en verde (Actions).
- [ ] En el móvil: abrir la app, forzar recarga si hace falta (el Service Worker es
      stale-while-revalidate: si sale código viejo, cerrar y reabrir; en el navegador,
      desregistrar SW + borrar cachés antes de dar nada por malo).
- [ ] Comprobar en 2 min que llegó la OTA: Ajustes → versión **4.7.0** y el popup de novedades.

## 2. APK 31 (lleva el fix de la noti duplicada del «gasto tocho»)

El `versionCode 31` / `versionName "4.7.0"` ya están puestos en `android/app/build.gradle`.
El único cambio nativo es `TrExpenseListener.java` (alerta ANTES de la confirmación; si es
`big` sustituye a «✓ Gasto apuntado» y hereda el deep-link).

- [ ] Con `main` ya mezclado: `npm run build`
- [ ] `npx cap sync android`
- [ ] `cd android && ./gradlew assembleRelease` (firma con el keystore de `local.properties`, como siempre)
- [ ] Renombrar el APK a `Mi-Cartera-4.7.0.apk`
- [ ] Crear **GitHub Release** (tag `v4.7.0`) y subir el APK como asset
- [ ] Actualizar `public/apk.json` al APK **realmente publicado**:
      `versionCode: 31`, `versionName: "4.7.0"`, `url` del asset del release, `notes` cortas
      («Gasto tocho: una sola noti, con deep-link»). Commit + push a `main`.
      ⚠️ Nunca antes de que el release exista (regla de la casa).
- [ ] En el móvil: la app ofrecerá «Actualizar app» sola → instalar encima (mantiene datos).
- [ ] Tras instalar, revisar Ajustes → acceso a notificaciones sigue activo (se pierde solo
      al DESinstalar, instalar encima no debería tocarlo — comprobar igualmente).

## 3. Verificación con datos reales (5 min en el móvil)

- [ ] **Cartera**: cada banco dice debajo «🛒 Gasto diario», «🏦 Recibos» o ambos; sin carrito
      suelto al lado del nombre. En Editar, UN solo chip verde por banco (Recibos / Gasto
      diario / Todo) y los saldos NO cambian al tocar chips (el re-anclaje los conserva).
- [ ] **Brókers**: desplegar Trade Republic → las posiciones entran con la animación suave.
      Herramientas de inversión → «Orden de los brókers» ↑↓ y comprobar que Cartera lo respeta.
- [ ] **Deudas**: Hipoteca y Préstamo entrada piso muestran «Quedan n/tot cuotas · x €/mes» y
      «acabas en …» (sin «a este ritmo ~»). Roomba sigue igual que antes.
- [ ] **reCAPTCHA**: el símbolo flotante ya no sale en ninguna pantalla.
- [ ] **Notis (cuando toquen solas)**: próximo gasto grande de TR → UNA sola noti «💥 Gasto
      tocho» (necesita el APK 31); próxima víspera de recibo → UNA sola noti, con el importe
      exacto (89,54 €, no 90 €).

## 4. MyInvestor captcha — qué mirar la próxima vez que salte

Con la 4.7.0 el error ya dice QUÉ falló. Apuntar cuál sale al reintentar con el site key puesto:

- «**Google no ha dado un token…**» → Google se niega fuera del dominio de MyInvestor.
  El atajo del site key está agotado → el siguiente paso es la **WebView nativa** que cargue
  la web de MI y genere el token allí (trabajo de APK, apuntado en ROADMAP).
- «**…MyInvestor lo rechazó**» → el token SÍ se generó; MI valida el origen. Misma conclusión
  (WebView nativa), pero confirmado por el otro lado.
- Recordatorio: no insistir seguido, que el anti-bot alarga el bloqueo; probar desde el WiFi de casa.

## 5. Al terminar

- [ ] `docs/ROADMAP.md`: actualizar la tabla de alineación (APK **4.7.0/31 publicado**,
      `apk.json` → 31) y la línea de estado.
- [ ] Borrar este fichero (`docs/PENDIENTE-4.7.0.md`).
