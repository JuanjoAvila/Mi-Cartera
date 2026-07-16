# Arquitectura — Mi Cartera

## Principios de diseño

### 1. Sin JSX/Babel en el navegador
La app usa `React.createElement` directo. Meter JSX + Babel en el navegador provocaba errores de `import jsx-runtime` y pantalla en blanco. `createElement` directo = robusto y sin sorpresas. **No reintroducir un transpilador en runtime.**

### 2. Un único artefacto desplegable
`public/index.html` lleva React, ReactDOM, CSS y lógica **inlineados**. Es el artefacto que ha demostrado ser fiable.

**Fuente editable (v3.108):** el código vive en **`src/modules/*.js`** + **`src/shell.html`**. `scripts/build-app.mjs` los ensambla en un solo `public/index.html`. El CI ejecuta `build-app` antes de sellar versión y minificar. **No edites `public/index.html` a mano** salvo emergencia (y `apk.json`).

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

## Flujo de datos

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

[Notificación Caixa/Sabadell/…]  (alpha22)
        │  mismo listener · NO parsea importe
        ▼
[evento bankNotif → runBankSync]  Open Banking trae el movimiento real
        │
        ▼
[importObExpenses]  filtra por settings.expenseBanks (varios bancos; spendFrom sigue siendo uno)
```

**Actualizaciones (v3.107+):** la PWA usa SW stale-while-revalidate con botón manual; la app Android usa bundle local + OTA Capacitor (`version.json` / `bundle.zip`) con notificación y pill cuando hay versión nueva. APK nativo vía `apk.json` + `installApk` (el **nombre del asset** en el release debe coincidir con la URL de `apk.json` — lección alpha21).

Cotizaciones: la app llama a la Edge Function `prices` → consulta Finnhub server-side (key oculta, evita CORS) → devuelve precios → la app calcula valor = acciones × precio. FX USD→EUR vía `refreshFx` (BCE aproximado).

> **Apps Script / `GAS_URL`: archivado (2026-06-18).** El backend antiguo (Google Apps Script + Google Sheet) se reemplazó por Supabase. Ya no aplica endurecer `GAS_URL` ni CORS Finnhub vía Apps Script.

## Aprendizajes clave

- **Repo público (Pages gratis):** jamás secretos ni CSV reales en el cliente ni en el repo.
- **Fuente única:** editar `src/modules/` + `src/shell.html`; `npm run build` → `public/index.html`.
- **Diálogos nativos Android:** sustituidos por `askText` / `askConfirm` (v3.100) — el prompt del sistema pintaba en inglés y tipografía ajena.
- **APK `apk.json`:** la URL debe apuntar al **nombre exacto** del asset subido al release de GitHub.
- **GitHub Pages + cuenta Free:** solo funciona con repo **público**.

---

## Estado de fases (histórico → hecho)

| Fase | Contenido | Estado |
|------|-----------|--------|
| **0** Control | Versionado, Settings, export/import JSON, errores visibles | **HECHO** (~v3.x) |
| **1** Base de datos | Sheets → Supabase (Postgres + auth + Edge Functions) | **HECHO** (2026-06) |
| **2** Cuentas de usuario | Login, RLS, multi-usuario (ingest tokens, hogares) | **HECHO** |
| **3** Legal / RGPD | Política de privacidad, borrado de cuenta, tokens cifrados | **HECHO** (v3.102) |
| **4** Distribución | APK Capacitor, OTA, tests CI, lector TR nativo (sustituye MacroDroid) | **HECHO** |
| **5** Nice-to-have (parcial) | Metas, gráficas evolución, comparativa mes, notis locales | **HECHO** en buena parte |

### Decisiones documentadas

- **`GAS_URL` / Apps Script:** archivado. No reabrir.
- **USD→EUR:** objetivo **aproximado en tiempo real** (`refreshFx` + precio × fx). Exacto como Revolut = re-anclar a mano o reimportar CSV (Revolut aplica su propio cambio + spread; Finnhub puede ir con retardo). No se perseguirá paridad al céntimo automática.

### Fase 5 — lo que queda (no urgente)

- Categorización con IA (coste alto; el KW actual cubre el día a día).
- Multi-moneda «contable» real (hoy es visualización + fx aproximado).
- Push genérica remota (ya hay notificaciones locales Android + avisos de update).

---

## Backlog actual (post v3.111)

### Hecho en v3.111 / alpha22
- Textos coach/roles claros (gasto variable vs fijos) para uso en pareja.
- `settings.expenseBanks`: varios bancos OB aportan compras con tarjeta a Gastos; `spendFrom` único intacto.
- Sync bancario más vivo: throttle ~1,5 h + sync al volver a primer plano (≥30 min).
- APK: noti de banco → debounce `bankSync` (sin parsear importe) + toggle en Ajustes.

### Pendiente (fuera de esta tanda)
- Diseño visual (Claude Design) y Play Store.
- Mejoras UX menores según feedback real de uso multi-banco.
- IA de categorías / multi-moneda contable (ver Fase 5).
