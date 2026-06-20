# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y versionado [SemVer](https://semver.org/lang/es/).

## [Unreleased]
### En progreso — Fase 4: app nativa Android (Capacitor)
- 🏗️ **Reemplazo de MacroDroid:** base de Capacitor en el repo (`package.json`, `capacitor.config.json`) y guía [docs/SETUP-ANDROID.md](docs/SETUP-ANDROID.md) con un `NotificationListenerService` (Kotlin) que lee la notificación de Trade Republic y la manda a `ingest`. El APK carga la PWA en vivo desde GitHub Pages. Build/pruebas en local con Android Studio.
- ⏭️ **Multi-usuario (futuro):** la app nativa enviará el JWT del usuario e `ingest` pasará a `verify_jwt` para derivar el `user_id` (hoy es single-user con `INGEST_USER_ID` fijo).

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

## [3.19.0] — 2026-06-20
### Fixed — Motor dinámico (ajustes tras pruebas)
- **Importe anual repartido:** un gasto anual marcado en varios meses ahora reparte el total entre esos meses (p.ej. IBI 664 €/año en 4 meses = 166 €/cobro), en vez de cobrar el total en cada uno.
- **Líquido tras fijos por banco:** la tarjeta «Próximos cargos» ya no usa el líquido total; muestra el saldo del **Sabadell** (banco donde se cobran los fijos) menos los cargos del mes = lo que quedaría de verdad.
- **Bug de alta en modo edición:** al añadir un gasto estando en «Editar», la cajita de importe y los meses salían vacíos. Ahora los controles de edición leen el valor real si no hay borrador.
### Added — Motor dinámico (v2) · [#1](https://github.com/JuanjoAvila/Mi-Cartera/issues/1)
- **Banco por gasto:** cada gasto fijo puede asignarse al banco del que se cobra (por defecto Sabadell), en alta y edición.
- **Alarma de saldo:** si los gastos fijos de un mes superan el saldo del banco al que se cargan, aparece un aviso 🚨 (genérico para cualquier usuario).
- **Aviso de mes cargado:** si en los próximos 4 meses hay uno con fijos muy por encima de la media, se avisa («se viene cargado 👀»).

## [3.18.0] — 2026-06-20
### Added — Motor dinámico (gastos fijos) · [#1](https://github.com/JuanjoAvila/Mi-Cartera/issues/1)
- **Calendario de gastos fijos:** cada gasto no mensual (agua, IBI, seguros…) puede llevar el/los **mes(es) en que se cobra** mediante un selector de 12 meses (en «Añadir» y al «Editar»). Si no se asigna, se deriva de la frecuencia (bimestral, trimestral…); los anuales quedan «⚠ sin mes» hasta marcarlos.
- **Líquido tras fijos (Sabadell dinámico):** nueva tarjeta **«Próximos cargos»** en la pestaña Fijos que suma lo que se cobra **este mes** (fijos + cuotas de deuda) y muestra el **líquido estimado que quedaría** tras esos cargos, más un avance del mes siguiente. «Es tener una integración sin tenerla».
- **Resumen:** la tarjeta «Gastos fijos» ahora muestra, además de la media mensual, el **cargo real de este mes**.

## [3.17.0] — 2026-06-19
### Added
- **Conversor de moneda €/$:** toggle en Ajustes que muestra toda la app en euros o dólares (convierte con el cambio del BCE en vivo). Útil para ver las acciones de Revolut en su moneda.
- **Contribuciones vs ganancias** en Inversiones: tarjeta con lo aportado, el valor actual, la ganancia y una barra aportado/ganancia.

## [3.16.0] — 2026-06-19
### Added
- **Auto-precios del ETF y el oro:** la Edge Function `prices` ahora también cotiza el ETF FTSE All-World (VWCE.DE) y el oro (XAU) vía Yahoo Finance server-side, junto a las acciones US de Finnhub. El oro y el ETF pasan a tener ticker+participaciones (corrección única) y se actualizan con el botón "Precios USD". El fondo de MyInvestor (por ISIN) sigue manual, con sus números reales corregidos.
### Nota de despliegue
- Requiere redeploy de la función (se dispara solo al hacer push por el cambio en `supabase/**`).

## [3.15.0] — 2026-06-19
### Added
- **Distribución por tipo de activo** en Inversiones: barra apilada con % de Acciones / ETF / Fondo indexado / Materias primas (reutiliza el StackedBar del dashboard).

## [3.14.1] — 2026-06-19
### Fixed
- **Posiciones corregidas tras ventas parciales** (Micron, TSMC, AMD) con los datos reales de Revolut (participaciones, valor y coste) mediante una corrección única idempotente; adiós a las pérdidas falsas.
- **Deslizador de la proyección** ya no cambia de pestaña al arrastrarlo (stopPropagation, como los filtros de categorías).

## [3.14.0] — 2026-06-19
### Added
- **Proyección estilo Trade Republic:** deslizador para la contribución mensual (se mantienen los campos de % interés y años), gráfico con banda de rango (±2%), ejes con etiquetas (años / miles €) y marcadores al final.
- **Venta parcial de posiciones ("Vendí parte"):** en modo edición, cada posición tiene un botón que pregunta el % vendido y reduce **valor, coste y participaciones** proporcionalmente (adiós a las pérdidas falsas). Registra el **líquido vendido (realizado)** acumulado, visible en Inversiones.

## [3.13.0] — 2026-06-19
### Added
- **Calculadora de proyección** en Inversiones: aporte mensual + interés anual + años → valor futuro a interés compuesto sobre lo ya invertido, con gráfico (valor vs aportado) y ganancia estimada.
### Fixed
- **"Ya estás al día"** vuelve a salir cuando no hay gastos nuevos (el contador comparaba solo contra los de origen "supabase" y contaba los manuales ya sincronizados como nuevos).

## [3.12.1] — 2026-06-19
### Fixed
- **Cerrar Ajustes con gesto** mucho más sensible (umbral ~20% + detección de flick).
- **Gastos manuales en la BD:** `addExpense` usa upsert idempotente y, al sincronizar, se hace **backfill** de los gastos manuales que aún no estuvieran en la tabla `expenses` (p. ej. los apuntados antes de tener esta función).
- Nota del cambio €/$ en Inversiones marcada como "BCE en vivo" para dejar claro que es dinámico (no es un cambio de moneda visible; el efecto está en el valor en € de las acciones USD).

## [3.12.0] — 2026-06-19
### Added
- **Cambio €/$ dinámico:** la conversión de las inversiones en USD usa el tipo de referencia del BCE en vivo (frankfurter.app, gratis y sin key), refrescado al abrir la app y al pulsar "Precios USD". Cuadra mucho más con Revolut (salvo su spread). Primer paso del bloque de Inversiones.

## [3.11.0] — 2026-06-19
### Added
- **Cerrar Ajustes con gesto:** arrastrar de derecha a izquierda sobre el cajón lo cierra (además del tap fuera y el botón ×).
- **Gastos manuales se guardan en la BD:** al apuntar un gasto, además de la nube de estado se inserta en la tabla `expenses` de Supabase.
- **Filtro de categorías multiselección:** se pueden marcar/desmarcar varias categorías a la vez; "Todas" si no hay ninguna seleccionada.
### Removed
- Botón "Borrar datos locales" de Ajustes (innecesario; el estado vive en la nube).
### Notas
- La lista de gastos ya estaba paginada (muestra 12 y carga más al hacer scroll), así que no se ralentiza al crecer.

## [3.10.1] — 2026-06-18
### Changed
- **Gesto de Ajustes corregido:** Ajustes es ahora una "página oculta a la izquierda" del Resumen. En la 1ª pestaña, arrastrar de **izquierda a derecha** abre el cajón desde la izquierda (siguiendo el dedo, con snap); de derecha a izquierda sigue yendo a Gastos. Integrado en el swipe de pestañas (sin franja aparte). El engranaje se mantiene como alternativa.

## [3.10.0] — 2026-06-18
### Changed
- **Ajustes con gesto (1er intento):** cajón lateral con gesto desde el borde derecho (corregido en 3.10.1: el sentido natural es desde la izquierda).

## [3.9.0] — 2026-06-18
### Changed
- **Ajustes como cajón lateral** (estilo Revolut): entra deslizando desde la derecha.
- Quitado el **objetivo de ahorro** (redundante con "ahorro al mes" del resumen).
- Quitado el **botón de refrescar** de la barra superior (ya está el Sincronizar grande en Gastos).
### Added
- **Auto-sincronización** de gastos al abrir la app o volver a primer plano (visibilitychange).
### Fixed
- El toast de confirmación (p. ej. "Presupuesto guardado") ahora se ve por encima de los paneles (z-index).

## [3.8.0] — 2026-06-18
### Changed
- **Apps Script jubilado:** eliminado el fallback al Google Sheet/Apps Script en `onSync` y `fetchPrices` (ahora todo va por Supabase con sesión), quitadas las constantes `GAS_URL`/`PRICES_PARAM`/`FIELDS`, borrada la carpeta `apps-script/` y actualizada la documentación.
- **Tabs:** degradado en el borde derecho para indicar que se puede hacer scroll (en vez de cortar el último icono en seco).
### Fixed
- **"Tirar para refrescar" desactivado:** `overscroll-behavior` en el contenedor de scroll evita que el gesto recargue la app (que disparaba la huella varias veces seguidas).

## [3.7.0] — 2026-06-18
### Added
- **Pantalla de Ajustes** (icono de engranaje en la barra): presupuesto mensual y objetivo de ahorro editables, **export/import de datos en JSON** (copia de seguridad manual, clave por no haber backups en el plan Free), botón de **borrar datos locales**, y **versión visible** de la app.
- **Versión sellada automáticamente** en la app (`CONFIG.APP_VERSION`) por el CI en cada deploy.

## [3.6.0] — 2026-06-18
### Changed
- **Distribución de activos:** la barra usa la paleta del sistema (variables CSS) en vez de colores hardcodeados; el oro que chocaba se sustituye por el tono crema.
- **Tabs:** la pestaña activa muestra su texto y las demás solo el icono, así caben las 6 sin cortarse por la derecha en el móvil.

## [3.5.3] — 2026-06-18
### Changed
- **La tabla `expenses` es la fuente de verdad de los gastos de la nube:** al sincronizar se reemplazan los gastos de origen "supabase" con lo que hay en la tabla (así se reflejan cambios de categoría, importe y borrados). Los gastos manuales/sheet locales nunca se tocan, así que sigue sin haber riesgo de pérdida. Resuelve que las categorías no se actualizaran por el dedup aditivo.

## [3.5.2] — 2026-06-18
### Fixed
- **Categorías/logos de los gastos de Supabase:** el path de la nube usaba la categoría en crudo de la tabla; ahora pasa por `resolveCategory` (autodetección por comercio) igual que el del Sheet, así Playtomic→ocio, etc. vuelven a salir bien.

## [3.5.0] — 2026-06-18
### Added
- **Login con email + contraseña:** panel de cuenta propio (entrar / crear cuenta), sin depender del email/magic link ni de su límite de envíos. La sesión persiste en el dispositivo.
- **Desbloqueo biométrico (huella / Face ID) tipo app de banco:** candado local por dispositivo vía WebAuthn. Tras iniciar sesión, se activa desde el panel de cuenta; al abrir la app pide la huella. Sin APK, funciona en el PWA instalado (HTTPS). Es un candado local (no verificado en servidor), suficiente para uso personal; se subirá a passkey completo si la app sale al mercado.
### Changed
- El botón de nube abre ahora el panel de cuenta (antes usaba prompts nativos).

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
