# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y versionado [SemVer](https://semver.org/lang/es/).

## [Unreleased]
### En progreso — Fase 1: Supabase
- ⏭️ **Pendiente de configurar (manual):** aplicar el SQL del esquema, secretos de GitHub para el deploy del CI, y **URLs de Auth** (Site URL + Redirect) con la URL de GitHub Pages para que funcione el magic link. Ver [docs/SETUP-SUPABASE.md](docs/SETUP-SUPABASE.md).
- ⏭️ **Pendiente (futuro):** repuntar MacroDroid a la función `ingest` y jubilar el Apps Script; pantalla de login más cuidada (ahora usa prompt nativo).

### Por hacer (próximos pasos)
- 🐛 **Precios USD (causa raíz):** Finnhub devuelve `prices:{}` vacío. La app y el Apps Script ya lo reportan claro; falta **redeployar el Apps Script** (Nueva versión) y revisar `FINNHUB_KEY` con el campo `errors`/`keyLen` que ahora trae la respuesta.
- 🎨 **Barra de distribución de activos:** el amarillo choca al abrir; usar paleta del sistema.
- 🎨 **Tabs:** se cortan por la derecha; scroll horizontal con auto-scroll a la pestaña activa.
- 🔁 Migración de Netlify a GitHub Pages (este commit inicial).
- ⚙️ Pantalla de Settings: toggle moneda, presupuesto, objetivo de ahorro, export/import JSON, reset, manejo de errores visible.
- 🔐 Endurecer `GAS_URL` con token compartido.

## [3.4.1] — 2026-06-18
### Fixed
- **Sync borraba gastos (crítico):** al sincronizar con la tabla `expenses` aún vacía, la mezcla eliminaba los gastos locales de origen "sheet". Ahora `mergeExpenses` es **aditivo** (nunca borra) y adoptar el estado de la nube **une** los gastos en vez de reemplazarlos. Los datos del Google Sheet se recuperan sincronizando con la sesión cerrada.

## [3.4.0] — 2026-06-18
### Added
- **Sincronización en la nube (Fase 1 Supabase) — frontend cableado:**
  - Carga de `@supabase/supabase-js` y cliente con la anon key (RLS protege los datos).
  - **Login por magic link** (botón de nube en la barra superior): al iniciar sesión se adopta el estado de la nube o se sube el local la primera vez.
  - **Multi-dispositivo:** el estado completo se sincroniza vía `app_state` (push debounced al cambiar, pull al entrar).
  - El botón **Sincronizar** lee los gastos de la tabla `expenses` de Supabase cuando hay sesión (con dedup); sin sesión sigue usando el Google Sheet.
  - **Precios USD** usan la Edge Function `prices` cuando hay sesión (key de Finnhub oculta server-side); sin sesión, fallback al Apps Script.
- **Offline-first:** si no hay red/sesión, la app funciona igual con `localStorage` (sin cambios de comportamiento).

## [3.3.1] — 2026-06-18
### Fixed
- **Despliegue desincronizado (crítico):** había dos `index.html` duplicados (raíz y `public/`) y solo se desplegaba `public/`, que estaba atrasado. El fix del doble descuento de TR (3.3.0) nunca había llegado al móvil. Eliminado el duplicado de la raíz; **`public/index.html` es ahora la única fuente** (coherente con ARQUITECTURA.md #2).
- **Mensajes del botón "Precios USD":** ya no dice "Sin cambios" cuando en realidad falla. Si Finnhub no devuelve cotizaciones muestra "✕ Finnhub no devolvió cotizaciones"; si el servidor da error, muestra el mensaje real. El conteo de precios actualizados se calcula desde el estado y ya no queda en 0.
### Added
- **Diagnóstico de precios en Apps Script:** `doGetPrices` ahora añade `errors` (status + cuerpo de Finnhub, sin exponer la key) y `keyLen` para localizar por qué `prices` viene vacío.

## [3.3.0] — 2026-06-18
### Fixed
- **Líquido de Trade Republic:** eliminado el doble descuento. El saldo base ya no se resta dos veces con el gasto del mes.
### Added
- **Inyección mensual automática:** +1.500 €/mes al efectivo de TR el último día laborable del mes (1.000 caprichos + 500 colchón). Los 50 € del FTSE van aparte (manual).
- **Campo "saldo real":** en Patrimonio → Cuentas, editas el saldo real de TR y la app ajusta la base por dentro (cero cálculos).
- **Arrastre entre meses:** al cambiar de mes se consolida el saldo (suma nómina, resta gasto) sin saltos.
- Migración de datos a `_dataVer` 6 (ancla de mes `trAnchor`).

## [3.2.0] — 2026-06-18
### Added
- Estructura de repositorio con buenas prácticas (este scaffolding).
- Versionado real con Git + GitHub.
- CI/CD con GitHub Actions hacia GitHub Pages.
- Sellado automático de la versión del Service Worker en cada deploy.
- API key de Finnhub movida a Script Properties (fuera del repo).

## [3.1.0] — 2026-06-17 (histórico, en Netlify)
### Added
- Cotizaciones USD automáticas vía Finnhub (Apps Script, server-side).
- Sincronización de gastos con deduplicación.
- Swipe entre las 6 pestañas con detección de eje.
- Dashboard: patrimonio neto, sparkline, anillo de presupuesto, racha.
