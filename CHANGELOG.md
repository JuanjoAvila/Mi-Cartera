# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y versionado [SemVer](https://semver.org/lang/es/).

## [Unreleased]
### Por hacer (próximos pasos)
- 🐛 **Precios USD:** el botón dice "al día" pero no actualiza valores; revisar flujo `fetchPrices` y conversión.
- 🐛 **Líquido Trade Republic:** el valor mostrado no cuadra con el real (doble descuento de gastos sobre el saldo base).
- 🎨 **Barra de distribución de activos:** el amarillo choca al abrir; usar paleta del sistema.
- 🎨 **Tabs:** se cortan por la derecha; scroll horizontal con auto-scroll a la pestaña activa.
- 🔁 Migración de Netlify a GitHub Pages (este commit inicial).
- ⚙️ Pantalla de Settings: toggle moneda, presupuesto, objetivo de ahorro, export/import JSON, reset, manejo de errores visible.
- 🔐 Endurecer `GAS_URL` con token compartido.

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
