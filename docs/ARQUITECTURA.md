# Arquitectura — Mi Cartera

## Principios de diseño

### 1. Sin JSX/Babel en el navegador
La app usa `React.createElement` directo. Meter JSX + Babel en el navegador provocaba errores de `import jsx-runtime` y pantalla en blanco. `createElement` directo = robusto y sin sorpresas. **No reintroducir un transpilador en runtime.**

### 2. Un único artefacto desplegable
`public/index.html` lleva React, ReactDOM, CSS y lógica **inlineados**. Es el artefacto que ha demostrado ser fiable.

**Fuente editable (v3.108+):** el código vive en **`src/modules/*.js`** + **`src/shell.html`**. `scripts/build-app.mjs` los ensambla en un solo `public/index.html`. El CI ejecuta `build-app` antes de sellar versión y minificar. **No edites `public/index.html` a mano** salvo emergencia (y `apk.json`).

> ⚠️ **No crear un `index.html` en la raíz.** GitHub Actions solo despliega `public/`.

**Sin CDNs de terceros en el arranque:** supabase-js, Sentry y fuentes van auto-hospedados en `public/vendor/` y `public/fonts/`. Offline completo.

**Minificación en CI:** `scripts/minify-html.mjs` — **nunca** `minifyIdentifiers` (globales `t`, `cloud`, …).

**Rendimiento (v3.108 → 3.113):**
- Lazy mount de pestañas; **cold start solo monta la pestaña activa** (vecinas tras ~1,6 s idle) — evita el tirón al abrir Gastos tras vaciar apps en Android.
- `content-visibility` en `.page`; sync/FX diferidos con `requestIdleCallback`.
- En Gastos: `useDeferredValue` + trabajo pesado (suscripciones, chips banco) solo con pestaña activa.

**Observabilidad:** Sentry opcional vía `CONFIG.SENTRY_DSN` — ver [SENTRY.md](SENTRY.md). Secret en GitHub Actions **ya configurado**; el deploy inyecta el DSN.

**Tests:** unit (Node), Deno (Edge Functions), Playwright E2E — ver [TESTING.md](TESTING.md).

### 3. Service Worker stale-while-revalidate
Caché al instante + revalidación en segundo plano. Cadena de versión sellada en CI.

**Android OTA (v3.107+ / 4.0.3):** chequeo de `version.json` al abrir / volver a primer plano / cada ~30 min **con la app abierta**, y además un **WorkManager** (~15 min, con red) que avisa con noti local **con la app cerrada**. Al tocar la noti se abre la app y aplica el bundle. Sin FCM (no hace falta cuenta Google ni tokens).


**Cold start (3.113.3):** Sentry se inyecta tras el primer pintado (no bloquea ~340 KB); Ajustes se monta al abrir el cajón; el swipe pre-monta la pestaña destino durante el gesto. El coste duro restante es parse del monolito + `loadState` — sin code-split no desaparece del todo.

### 4. Migraciones de datos versionadas
`_dataVer` en `localStorage` permite cambiar la forma de los datos sembrados sin borrar los del usuario.

## Flujo de datos

```
[Notificación TR en Android]
        │  Lector nativo Mi Cartera
        ▼
[POST → Edge Function `ingest`]   (?token= por usuario)
        │  clasifica + categoriza (KW)
        ▼
[Postgres: expenses]  → app al Sincronizar

[Notificación Caixa/Sabadell/…]
        │  bankNotif → runBankSync (sin parsear importe)
        ▼
[importObExpenses]  settings.expenseBanks → Gastos (ent en source ob:…)

[Sugerir categoría]
        │  cloud.suggestCategory(merchant)
        ▼
[Edge `categorize`]  KW → si otros y OPENAI_API_KEY → LLM acotado
```

Cotizaciones: Edge `prices` → Finnhub/Yahoo. FX: Frankfurter `EUR→USD,GBP,CHF` → `state.fxRates` (XXX→EUR) + `state.fx` (USD legado). Coste invertido editable ancla `costEur`.

> **Apps Script / `GAS_URL`: archivado.** No reabrir.

## Aprendizajes clave

- Repo público → jamás secretos ni CSV reales.
- Fuente única: `src/modules/` + `npm run build`.
- Diálogos: `askText` / `askConfirm` (no `prompt` nativo).
- APK `apk.json`: URL = nombre exacto del asset.
- RLS Hogar: no hacer EXISTS sobre `household_members` desde su propia policy → `0014` + `is_household_member` SECURITY DEFINER.

---

## Estado de fases

| Fase | Contenido | Estado |
|------|-----------|--------|
| **0–4** | Control, Supabase, multi-usuario, RGPD, APK/OTA | **HECHO** |
| **5** Nice-to-have | Metas, gráficas, notis, FX multi, categorías IA opcional | **HECHO** en lo razonable |

### Multimoneda (v3.113)

- **Hecho:** tipos vivos USD/GBP/CHF→EUR; patrimonio/inversiones/OB vía `toEurAmt` / `invValueEur` / `invCostEur`; anclar `costEur` al editar coste.
- **No es (ni se persigue):** contabilidad de doble partida con FX histórico por cada compra antigua sin fecha, ni paridad al céntimo con Revolut (spread del bróker).

### Categorías IA (v3.113)

- KW locales + Edge `categorize` + toggle Ajustes. Ver [CATEGORIZE.md](CATEGORIZE.md).
- Sin `OPENAI_API_KEY`: solo KW (comportamiento seguro y barato).

---

## Backlog actual (post v3.113)

### Hecho reciente
- Tutorial/roles + filtro banco Gastos (3.112).
- Cold-start Android: no montar vecinas en el primer frame (3.113).
- FX multi + costEur; Sentry scrub + botón de prueba; categorize Edge.

### Pendiente (a demanda)
- Play Store (Data safety + NotificationListener).
- Pulido visual (Claude Design).
- Feedback de uso real.
