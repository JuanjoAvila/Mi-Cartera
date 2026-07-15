# Arquitectura — Mi Cartera

## Principios de diseño

### 1. Sin JSX/Babel en el navegador
La app usa `React.createElement` directo. Meter JSX + Babel en el navegador provocaba errores de `import jsx-runtime` y pantalla en blanco. `createElement` directo = robusto y sin sorpresas. **No reintroducir un transpilador en runtime.**

### 2. Un único artefacto desplegable
`public/index.html` lleva React, ReactDOM, CSS y lógica **inlineados**. Es el artefacto que ha demostrado ser fiable.

**Fuente editable (v3.108):** el código vive en **`src/modules/*.js`** + **`src/shell.html`**. `scripts/build-app.mjs` los ensambla en un solo `public/index.html`. El CI ejecuta `build-app` antes de sellar versión y minificar. **No edites `public/index.html` a mano** salvo emergencia.

> ⚠️ **No crear un `index.html` en la raíz.** GitHub Actions solo despliega `public/`. Hubo un duplicado en la raíz que se editaba por error y dejaba `public/` atrasado (un fix de TR no llegó al móvil).

**Sin CDNs de terceros en el arranque (v3.71):** supabase-js va auto-hospedado y con versión fijada en `public/vendor/supabase.min.js` (antes venía de jsdelivr con la etiqueta flotante `@2`, que podía romper la app sola), y las fuentes (Manrope/Fraunces, variables, latin+latin-ext) en `public/fonts/` con `@font-face` locales (antes CSS bloqueante de Google Fonts). Todo lo cachea el Service Worker ⇒ la app entera funciona offline. Para actualizar supabase-js: bajar la nueva versión de jsdelivr a `vendor/` a mano y probar.

**Minificación en CI (v3.71):** `scripts/minify-html.mjs` (esbuild, solo whitespace+syntax, **nunca** renombra identificadores) minifica los `<script>`/`<style>` inline en el workflow de deploy, después de `build-app` y `stamp-version.mjs`. La fuente editable está en `src/`; la minificación es solo empaquetado del artefacto.

**Rendimiento (v3.108):** lazy mount de pestañas (solo activa + vecinas), `content-visibility` en `.page`, sync nube/FX/broker diferidos con `requestIdleCallback`, componentes memoizados donde aporta.

**Observabilidad (v3.108):** Sentry opcional vía `CONFIG.SENTRY_DSN` — ver [SENTRY.md](SENTRY.md).

**Tests (v3.108):** unit (Node), Deno (Edge Functions), Playwright E2E — ver [TESTING.md](TESTING.md).

### 3. Service Worker stale-while-revalidate (v3.71; antes network-first)
Sirve desde caché **al instante** (arranque inmediato incluso con red lenta o sin conexión) y descarga la versión fresca en segundo plano: la novedad se ve en el siguiente arranque. Mismo modelo de actualización de siempre (sin `skipWaiting`, sin recargas a media sesión), pero sin esperar a la red al abrir. La cadena de versión del SW se sella en CI (`scripts/stamp-version.mjs`) para invalidar caché sin trabajo manual.

### 4. Migraciones de datos versionadas
`_dataVer` en `localStorage` permite cambiar la forma de los datos sembrados sin borrar los del usuario.

## Flujo de datos (Fase 1: Supabase)

```
[Notificación TR en Android]
        │  Lector nativo Mi Cartera (NotificationListenerService)
        ▼
[POST → Edge Function `ingest`]   (?token= por usuario en ingest_tokens, o legacy INGEST_TOKEN)
        │  parsea importe/comercio/fecha + categoriza + service role
        ▼
[Postgres: tabla `expenses`]   ← buzón de entrada (RLS por usuario)
        │  la app la lee al Sincronizar (estando logueada)
        ▼
[App: dedup + render]   → estado en `app_state` (JSONB) + caché localStorage
```

**Actualizaciones (v3.107):** la PWA usa SW stale-while-revalidate con botón manual; la app Android usa bundle local + OTA Capacitor (`version.json` / `bundle.zip`) con notificación y pill cuando hay versión nueva. APK nativo vía `apk.json` + `installApk`.

Cotizaciones: la app llama a la Edge Function `prices` → consulta Finnhub server-side (key oculta, evita CORS) → devuelve precios → la app calcula valor = acciones × precio.

> **Apps Script: jubilado (2026-06-18).** El backend antiguo (Google Apps Script + Google Sheet) se reemplazó por Supabase. Se retiró su carpeta del repo y la implementación se archivó en Google.

## Aprendizajes clave

- **Republicar Apps Script:** hay que seleccionar explícitamente "Nueva versión" en Administrar implementaciones, o la URL sirve código cacheado.
- **Fechas en Sheets:** se guardan como objetos Date, no string; `normalizarFecha()` lo resuelve antes de cualquier filtrado.
- **CORS Finnhub:** no se puede llamar desde el navegador; va server-side vía Apps Script.
- **GitHub Pages + cuenta Free:** solo funciona con repo **público**; un repo privado requiere plan de pago. Actions es ilimitado en repos públicos.

## Backlog técnico (post-migración)

### Fase 0 — control (barato)
- Versionado visible en Settings + mini changelog.
- Pantalla de Settings: moneda, presupuesto, objetivo de ahorro, toggles, reset.
- Export/Import JSON (backup manual).
- Manejo de errores visible (Sheet / precios).

### Fase 1 — base de datos real
- Migrar de Sheets a Supabase (Postgres + auth + API, free tier) o Firebase. Sheets queda solo como buzón de entrada.

### Fase 2 — cuentas de usuario (solo si se comparte con terceros)
- Registro/login, aislamiento de datos.

### Fase 3 — legal/RGPD (obligatorio si hay terceros)
- Datos financieros = sensibles: política de privacidad, consentimiento, cifrado en reposo, derecho al olvido.
- Las fases 1+2+3 se abordan juntas si la app pasa a multiusuario.

### Fase 4 — distribución/robustez
- APK (Capacitor/PWABuilder), dominio propio, tests de cálculos críticos, monitorización de errores, reemplazo de MacroDroid, CI/CD avanzado.

### Fase 5 — nice to have
- Notificaciones push, gráficas de evolución, objetivos de ahorro, multi-moneda real, comparación mes a mes, categorización con IA.

## Decisiones pendientes de discusión

- **Endurecer `GAS_URL`:** hoy es un endpoint abierto; el `doGet` expone los gastos del mes a quien tenga la URL. Un token compartido (en Script Properties + cabecera/param) mitigaría esto sin coste.
- **Conversión USD→EUR:** hoy `fx` es un valor fijo. No casará nunca al céntimo con Revolut (Revolut aplica su propio cambio + spread, y el precio de Finnhub puede ir con retardo). Decidir si el objetivo es "exacto como Revolut" (→ input manual del valor en EUR) o "aproximado en tiempo real" (→ precio × acciones × fx dinámico).
