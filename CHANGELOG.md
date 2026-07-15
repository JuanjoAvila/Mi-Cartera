# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/) y versionado [SemVer](https://semver.org/lang/es/).

## [3.103.0] — 2026-07-15
### Motor de deudas (#2) + tests reconcile/bank
- 📉 **`debtChargeDay` / `isDebtPaidThisMonth`:** cuotas entran en el motor de líquido aunque no tengan día (default día 1); nueva deuda con día 1 por defecto.
- 🔐 **Re-cifrado legacy:** `ensureMiLinkEncrypted` en `myinvestor-sync` migra tokens plaintext tras activar `TOKEN_ENCRYPTION_KEY`.
- ✅ **Tests:** `motor-debt.test.mjs`, `reconcile-bank.test.mjs` (matching, conciliación, `applyBankBalances`).

## [3.102.0] — 2026-07-15
### Seguridad, RGPD y sync multi-dispositivo
- 🔐 **Tokens cifrados:** `supabase/functions/_shared/crypto.ts` (AES-256-GCM) cifra access/refresh de MyInvestor y `session_id` de Open Banking; clave en secreto `TOKEN_ENCRYPTION_KEY` (retrocompat con plaintext).
- 👤 **Perfiles:** migración `0012_profiles_and_privacy.sql`; admin vía `profiles.is_admin` (RLS `app_events` sin depender del email en el cliente).
- 🗑️ **Borrado cuenta:** Edge Function `delete-account` + Ajustes → Tu cuenta; requiere contraseña.
- 📄 **Privacidad:** `public/privacy.html` (RGPD mínimo).
- 📱 **Sync optimista:** `pushState` con `updated_at` evita pisar cambios de otro dispositivo; aviso `st_sync_conflict`.
- ✅ **Tests:** golden CSV Revolut (`tests/revo-golden.test.mjs`) + `crypto.test.ts` en CI Deno.

## [3.101.0] — 2026-07-15
### Calidad, privacidad y tests (segunda revisión del proyecto)
- 🛡️ **`DATA` sintética:** eliminados del repo público patrimonio, hipoteca, nómina y cartera reales; `scripts/guard-privacy.mjs` bloquea regresiones en CI.
- ✅ **Suite de tests:** `npm test` (sintaxis `vm.Script`, round-up/saveback, parsers Revolut, clasificación ingest, deudas) + workflow `.github/workflows/test.yml`; `deploy.yml` exige tests verdes antes de publicar.
- 🏷️ **Categorías unificadas:** `ingest` alineado con `KW` del cliente (pan, parking, pelu, keywords ampliadas).
- 📦 **Versiones sincronizadas:** `VERSION`, `package.json` → 3.101.0.

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

## [3.100.0] — 2026-07-15
### Revolut: las materias primas ya entran, y diálogos propios en toda la app
- 🥇 **Import de materias primas (oro/plata) de Revolut.** El backlog decía «Revolut a medias: solo pilla las acciones»; con los CSV reales del usuario se confirma que **no era un fallo de parseo**: el oro vive en un extracto APARTE (Invest → Documentos → **Materias primas** → Extracto de cuenta) con un formato que no se parece en nada al de Stocks — es un extracto de cuenta corriente (`Tipo,Producto,…,Importe,Comisión,Divisa,State,Saldo`, cabecera en el idioma de la cuenta) cuyo importe ya va en ONZAS. Nuevo `revoParseCommodities()`: cantidad = columna `Saldo` de la última fila, con la suma `Importe−Comisión` como comprobación (con los datos reales las dos vías dan 0,258218 XAU). Los metales vendidos del todo (XAG a 0) se descartan solos.
- 📎 **Varios extractos a la vez.** `BrokerImport` acepta `multiple` y fusiona acciones + materias primas en una sola previsualización: la cartera de Revolut vive repartida en dos ficheros y pedir dos pasadas era pedir que se olvide una.
- 🧭 **Se detectan los extractos de Pérdidas y Ganancias** (`revoIsPnl`) y se explica cuál es el bueno, en vez del genérico «no he podido leer el CSV». Hacía falta: de los 4 CSV del usuario, dos son de P&G y uno de ellos se llama `trading-account-statement-…` por fuera.
- 💰 **Coste de los metales: no se inventa.** Ese extracto no trae el coste en € (la pata en EUR va en el extracto de la cuenta corriente), así que se re-ancla solo la CANTIDAD y se respeta el coste que hubiera (`if(po.cost!=null)`, como ya hacía el import de MyInvestor). Con la cantidad + el ticker basta: el precio en vivo hace el resto.
- 📈 **`prices`: XAG/XPT/XPD** añadidos al mapa de Yahoo (`SI=F`/`PL=F`/`PA=F`), junto al XAU→`GC=F` que ya estaba.
- 🔗 **`revoMetalSuggest()`:** el oro se llevaba a mano y SIN ticker, así que `brokerSuggest` no lo casaba (por ticker no hay nada, y las palabras de «Oro (XAU)» tienen 3 letras cuando el matcher exige 4+) y se quedaba en «no tocar» justo en el caso que veníamos a arreglar. Detectado al probarlo en el navegador, no leyendo el código.
- 💬 **Diálogos propios (`askText`/`askConfirm`)** en lugar de `window.prompt/confirm`, que pintaban el cuadro NATIVO de Android — gris, tipografía ajena y botones «CANCEL/OK» en inglés con la app en español. Petición de fuera del círculo técnico («mejor que sea igual a la estética de la app»). Misma hoja inferior que el resto (`.tabsheet`), z-index 230 (por encima de los paneles, que llegan a 215), título/subtítulo separados, atajos y foco automático. Portados los 8 sitios: amortizar, asesor de amortización, aportar a meta, vender parte, borrar posición, borrar grupo, restaurar copia y quitar el candado. Devuelven promesas; si el host no está montado (pantalla del candado) caen al diálogo nativo y la acción nunca se pierde.

## [3.96.0] — 2026-07-12
### Inversiones: conectar MyInvestor e importar Revolut, y las dos vistas de Gastos con nombres claros
- 📈 **Conectar MyInvestor (beta):** en Ajustes → Gestionar mis bancos, «Conectar MyInvestor». Metes tu usuario y contraseña de MyInvestor (puede pedir un código por SMS) y trae tus **fondos indexados** con sus participaciones, valor y coste, para re-anclar tus posiciones con previsualización. La contraseña **no se guarda** en ningún sitio: solo se guarda la sesión (como al entrar en su web). Va por la API propia de MyInvestor (funciona en web y app). De vez en cuando MyInvestor pide un reCAPTCHA de seguridad; si pasa, avisa y se reintenta más tarde.
- 💹 **Importar Revolut por CSV (beta):** junto a Trade Republic, tarjeta «Importar de Revolut (CSV)» con un **paso a paso** para exportar el extracto desde la app de Revolut (Invest → More → Documents → Stocks → Account statement → Excel). Subes el fichero (o lo pegas) y re-ancla tus acciones/ETF con previsualización. Todo se procesa en tu móvil; el fichero no se sube a ningún sitio.
- 🧮 **Las dos vistas del total de Gastos, con nombres claros y el mismo diseño:** «Desglosado» pasa a llamarse **«Gastos e ingresos»** y «Lo que te queda» pasa a **«Balance»**. Las dos comparten ahora el mismo diseño (número protagonista arriba + una línea de desglose con 💸 Gastos · 💰 Ingresos · Balance) y ninguna enseña ya el «−» (el color rojo/verde lo dice).

## [3.95.1] — 2026-07-12
### fix: el modo «Lo que te queda» seguía enseñando el «−» al sobregastar
- 🐛 Se me había quedado uno: la vista «Lo que te queda» de Gastos (Ajustes → Personalización → Total de Gastos) mostraba «−1.400,00 €» en rojo al sobregastar. Mismo criterio que el resto de la 3.95.0: el color rojo/verde ya dice si ahorras o te pasas, así que el «−» sobra (el «+» de ahorro se queda).

## [3.95.0] — 2026-07-12
### Novedades a la vista, sugerencias sin salir de la app, gastos sin «−» y el botón de actualizar de vuelta
- ✨ **Popup de Novedades al actualizar:** cada vez que estrenas una versión nueva, la app te cuenta qué trae con un popup (una sola vez por versión, textos en cristiano y sin jerga). Los usuarios nuevos no lo ven en su primer arranque (se sella tras el onboarding); lo verán a partir de la siguiente actualización.
- 📜 **Histórico de Novedades en Ajustes → «✨ Novedades y sugerencias»:** relee las novedades de cualquier versión pasada cuando quieras, con acordeón por versión.
- 💬 **Caja de sugerencias por versión:** dentro del popup/histórico puedes apuntar errores, ideas o cosas raras. Quedan guardadas en «Tus apuntes» (sincroniza entre tus dispositivos) y le llegan a Juanjo junto con tu versión y plataforma (nuevo filtro «💬 Sugerencias» en el panel Actividad del admin). Pensado para que la pareja/amigos no tengan que acordarse de contarlo por otro lado.
- 🎨 **Gastos sin el signo «−»:** las cantidades de gasto ya no llevan el «−» delante (quedaba feo); los ingresos conservan su «+» y el balance su ±. Aplica a las filas de Gastos y a las dos vistas del total.
- ✨ **Vuelve el botón de arriba «✨ Nueva versión · toca para actualizar» (app Android):** había desaparecido al pasar el OTA a modo silencioso. Ahora, cuando la actualización web está descargada y lista, sale el botón para estrenarla al momento; si no lo tocas, entra sola en el siguiente arranque igual que hasta ahora.

## [3.94.0] — 2026-07-11
### Ahorro editable, dos vistas del total de Gastos, secciones a tu gusto y Actividad con pantalla propia
- ✨ **Aportaciones de ahorro editables:** la tarjeta «¿A dónde va tu ahorro?» del Resumen venía con importes sembrados que no se podían tocar (y un usuario nuevo no podía añadir los suyos). Ahora tiene «Editar»: cambia importe, nombre y banco de cada aportación, borra con 🗑 o añade nuevas con «＋ Añadir aportación». Solo ajusta la cifra de «Ahorro/mes» (no mueve dinero).
- ✨ **Dos vistas del total en Gastos** (Ajustes › Personalización › «Total de Gastos»): **Desglosado** (el actual: total de gastos arriba; ingresos y balance debajo) o **Lo que te queda** (el modelo antiguo que gustaba: un solo número = ingresos − gastos del filtro, verde/rojo). Con explicación de cada modo al elegirlo.
- ✨ **Reordenar secciones dentro de Fijos, Patrimonio, Deudas, Inversiones y Metas:** botón discreto «⇅ Ordenar secciones» al pie de cada pestaña → flechas ▲▼ por tarjeta (como los widgets del Resumen). En Deudas y Metas reordena las propias deudas/metas.
- ✨ **Actividad (admin) con pantalla propia:** el acordeón de Ajustes crecía sin límite con cada error. Ahora abre una pantalla aparte (como Gestionar mis bancos) con filtro «🐞 Solo errores», hasta 200 eventos y gesto atrás para volver.
- 🐛 **Banco conectado que no aporta nada (caso CaixaBank):** si un banco sincroniza «bien» pero no trae ninguna cuenta con saldo utilizable, antes decía «solo aporta su saldo al Patrimonio» (falso) y no había salida. Ahora: aviso accionable en Gestionar mis bancos («prueba Actualizar saldo / Reconectar»), telemetría a Actividad con el detalle por cuenta para diagnosticarlo, y sus cuentas anteriores se conservan marcadas «caducado» en vez de esfumarse del patrimonio.

## [3.93.0] — 2026-07-11
### Editar el saldo de una deuda con plazo ya no resetea el contador de cuotas
- 🐛 **«Editar saldos pendientes» alargaba la deuda:** re-anclaba la proyección al mes actual sin ajustar el plazo, así que una deuda de 4 cuotas con 3 pagadas volvía a enseñar «Quedan 4/4» tras corregir el saldo (y la proyección la alargaba otros 4 meses). Ahora, en deudas con plazo, el saldo tecleado se convierte en el pendiente real **sin tocar el ancla** (mismo patrón que Amortizar) y las cuotas restantes se recalculan con la misma amortización: editar a 100 € una deuda de 400 €/4 cuotas deja «Quedan 1/4», como debe. Las deudas sin plazo siguen re-anclando como siempre.

## [3.92.0] — 2026-07-11
### Más feedback de la pareja: deudas mudas al fallar, amortizar y deudas ya empezadas
- 🐛 **Añadir deuda fallaba en silencio:** si faltaba el importe (o no había ni cuota ni plazo), «Añadir deuda» no hacía nada y no avisaba. Ahora sale un toast claro con lo que falta («⚠ Falta el importe total de la deuda», «⚠ Pon la cuota/mes o el plazo en meses») y un «✓ Deuda añadida» al guardar bien.
- ✨ **Botón «💸 Amortizar» en cada deuda:** para pagos anticipados. Pregunta cuánto amortizas (recordando el pendiente), baja el saldo justo eso y **acorta el plazo** manteniendo la cuota (recalcula las cuotas que quedan; con pago final lo respeta). Si liquidas todo: «🎉 ¡Deuda liquidada!» y la financiación queda marcada pagada.
- ✨ **«Cuotas ya pagadas» al crear una deuda:** para deudas ya empezadas (su caso: 4 cuotas y ya van 3). El campo nuevo retrasa el ancla esos meses, así el pendiente, el % amortizado y el «Quedan n/tot» salen bien desde el primer día en vez de empezar la deuda desde cero.

## [3.91.0] — 2026-07-11
### Feedback de la pareja usando la app de verdad: total con ingresos ilegible, cuentas OB sin rol, ciclo de cobro
- 🐛 **«Total filtrado» con ingresos era un galimatías:** el total sumaba `gastos − ingresos` y lo enseñaba en crudo, con el signo AL REVÉS que las filas (una nómina de +757 con ~1.560 de gastos salía como «+802 €» — parecía que habías ganado dinero cuando habías gastado de más; y al revés, un mes ahorrador salía en negativo). Ahora la barra enseña **los gastos con «−»** (como las filas) y, si el filtro incluye ingresos, una línea con **«💰 +ingresos · Balance ±X»** (verde si ahorras, rojo si no) y el contador separa «N gastos · M ingresos».
- 🐛 **Cuentas de Open Banking sin rol → los fijos solo podían ir a Trade Republic:** las cuentas conectadas por banco (Revolut, CaixaBank…) vivían en `obAccounts` como saldo puro, sin rol, y ni Patrimonio→Editar ni «Gestionar mis bancos» dejaban dárselo; al crear un gasto fijo, el desplegable de banco solo enseñaba TR. Ahora se pueden **«promocionar»**: chips Recibos / Gasto diario / Todo en **ambos sitios** — crean la cuenta con rol anclada al saldo real del banco (misma fórmula de re-anclaje del sync), la sacan de la lista OB (sin doble conteo) y el sync del banco la sigue re-anclando por IBAN (`applyBankBalances` ahora re-ancla **varias** cuentas manuales del mismo banco, no solo la primera). De regalo: el alta de fijos/puntuales ya no guarda «sabadell» por defecto si ese usuario no tiene Sabadell (guardaba un banco distinto del que enseñaba el desplegable), y Guardar en Patrimonio ya no machaca a 0 una cuenta añadida en pleno modo edición.
- ✨ **Filtro «Mi ciclo» en Gastos (de cobro a cobro):** su nómina no cae en día fijo (23, 24…), así que el mes natural le descuadraba el ahorro. El chip nuevo filtra **desde el último cobro real apuntado** (el ingreso más reciente ≥200 € de los últimos 45 días; los bizums pequeños no cuentan) hasta hoy, y enseña qué cobro ancla el ciclo («Del 23/06 (cobro de +757 €) a hoy»). Con el desglose nuevo del total, el «Balance» de ese filtro es exactamente «lo que llevo ahorrado desde que cobré». Sin cobros apuntados, avisa y usa el mes.
- ✨ **Categoría nueva 🥖 Panadería:** con keywords propias (panadería, pastelería, fleca, forn, obrador, Granier, Santagloria…) que antes caían en Bares. El pan del súper sigue siendo Supermercado, como debe ser.

## [3.90.0] — 2026-07-11
### Tanda de arreglos tras la revisión del proyecto (sesión Claude Code escritorio) + APK alpha15
- 🐛 **`permission denied for table ingest_tokens` (foto del usuario):** la migración 0008 creó la tabla con RLS pero **sin GRANTs** (mismo patrón que app_events en la 0007). Nueva **migración 0009**: grants a `authenticated` (gestión del propio token) y a `service_role` (resolución token→usuario en `ingest` + telemetría). Sin esto, el toggle «Apuntar aquí mis gastos de TR» petaba siempre.
- 🐛 **CaixaBank desaparecido del Patrimonio:** un banco cuyo enlace caduca dejaba de venir en `bank-sync` (solo se consultaban los `active`) y la app reconstruía `obAccounts` sin él → sus cuentas se **esfumaban en silencio**. Ahora `bank-sync` devuelve también los enlaces caducados/rotos (`ok:false`, sin llamar a Enable Banking), la app **conserva sus saldos marcados «caducado»** (badge naranja en Patrimonio), y Ajustes canta «⚠ N caducado(s) — reconéctalo» en el resumen de bancos.
- 🧹 **Cuenta OB re-etiquetada «personalizado solo mío»:** limpieza puntual al cargar — esa etiqueta heredada se borra y la cuenta vuelve a su nombre por defecto + badge «del banco», como el resto.
- ✨ **Ingresos de verdad en Gastos:** el alta manual ahora tiene **campo de fecha** (vacío = hoy; una transferencia de hace días se apunta en su día real, a las 12:00 para esquivar zonas horarias), el filtro de categorías incluye el chip **💰 Ingreso**, y un ingreso manual ya no alimenta el round-up (`noCard`, igual que al editar).
- ✨ **Suscripciones → Gastos fijos:** cada suscripción detectada (≥3 meses) ofrece «→ pasar a Gastos fijos»: crea el fijo con el banco de recibos y el día real del último cargo (y muestra «✓ ya en Fijos» si ya existe). Keywords nuevas en ambos categorizadores: IA/digital (Anthropic/Claude, OpenAI, iCloud, Google One, YouTube Premium…) → Ocio; peluquerías/estética genéricas (barber, estilistas, nails…) → Salud.
- ✨ **Rol del banco donde se gestiona el banco:** en «Gestionar mis bancos», cada banco conectado enseña «¿Para qué usas este banco?» con los chips Recibos / Gasto diario / Todo (misma lógica de re-anclaje que Patrimonio, ahora compartida en `applyAccountRole`) y una explicación arriba. Ya no hay que saberse el camino Patrimonio → Editar.
- ✨ **«Buscar actualización» aplica la web YA:** si hay versión web nueva, baja el bundle OTA y hace **hot-swap al momento** (`CapacitorUpdater.set` recarga la WebView) en vez de decir «cierra y abre la app». Guard «solo hacia adelante» intacto.
- 🐞 **Telemetría que ve lo que tú ves:** todo toast de error (✕/⚠) viaja a `app_events` (antes solo crashes → los errores «domados» de la pareja eran invisibles), los fallos del sync de TR también se registran, e `ingest` **apunta sus propios fallos server-side** (token inválido, error al guardar). El botón «Recargar» del panel Actividad ahora confirma cuántos eventos trajo.
- 🐛 **Crash total con estado sin `aportaciones`/`history`:** el motor y el Sparkline leían esos campos sin default → pantalla «Algo se ha torcido» en cuanto faltaban. Ahora se rellenan al cargar (posible causa de los errores fantasma de la pareja).
- 🔧 **TR en frío (alpha15):** backoff del refresh recortado a ~9,5 s (la recarga con challenge nuevo es mejor apuesta que esperar más), **timeout nativo 60→90 s** (el peor camino en frío rondaba 77 s y moría en falso «timeout»), con **401 real** se sale al momento (sin quemar 15 s de WebSocket), y un bloqueo del WAF **ya no desconecta la sesión** (`wafBlocked` en vez de `authExpired`: antes te obligaba a repetir el 2FA sin necesidad).
- 📦 **APK alpha15** (`versionCode 15`): incluye el lector multiusuario (`setIngestUrl`) de la 3.88.0 — sin este APK el toggle multiusuario no puede hablar con el lector nativo — y los cambios de TR en frío. `apk.json` → alpha15 (esta vez con release publicada de verdad).

## [3.89.1] — 2026-07-11
### fix: «descarga falló» al buscar actualización
- 🐛 **apk.json apuntaba a un release inexistente:** la 3.88.0 subió `apk.json` a `versionCode 15` / `v4.0.0-alpha15`, pero ese APK **no se ha compilado ni publicado** todavía. Como la app instala el APK cuando `apk.json.versionCode > instalado` (`index.html`), intentaba descargar `…/releases/download/v4.0.0-alpha15/Mi-Cartera.apk` → **404 «descarga falló»**. Se revierte `apk.json` al último APK **realmente publicado** (`versionCode 14` / `alpha14`). Las features web (import histórico, toggle multiusuario) siguen llegando por el bundle OTA, que es independiente del APK. Cuando se compile y publique el alpha15, se vuelve a subir `apk.json` a 15.

## [3.89.0] — 2026-07-11
### Importar histórico de gastos (Open Banking)
- ✨ **Traer meses pasados a Gastos:** en **Ajustes → Bancos → «Importar histórico de gastos»**, la app trae los movimientos de los últimos 1-3 meses de tu **cuenta de gasto diario** conectada al banco y te deja **elegir cuáles apuntar** (lista con casillas; las compras con tarjeta vienen pre-marcadas, los cargos que parecen recibos desmarcados). Idempotente: descarta lo ya importado (`ext_id`) y lo que ya existe (fecha·importe·comercio). Server-side (`bank-sync` con `dateFrom`) es **lectura pura**: pagina con `continuation_key` y **no toca saldos ni el estado de los enlaces**. Textos ES/EN/CA.
- ⚠️ **Límites (PSD2):** el banco solo deja ver **~90 días** de histórico en accesos desatendidos, por eso el selector llega a 3 meses. **No aplica a Trade Republic** (no está en Open Banking): para TR se usa el apuntado por notificaciones. Requiere desplegar la función `bank-sync`.

## [3.88.0] — 2026-07-11
### Apuntado de Trade Republic MULTIUSUARIO (0008)
- ✨ **Cada persona apunta sus gastos de TR en SU cuenta:** hasta ahora el lector de notificaciones (`ingest`) escribía siempre para el único usuario del secreto `INGEST_USER_ID` (el creador). Por eso, cuando a una pareja/amigo le llegaba la noti de un gasto de Trade Republic, **no se apuntaba** en su cuenta (o iba a la del creador). Ahora, en **Ajustes → notificaciones**, un toggle **«Apuntar aquí mis gastos de Trade Republic»** genera un **token propio** por usuario (tabla nueva `ingest_tokens` con RLS, migración `0008`), lo guarda y pasa la URL de `ingest` al lector nativo (plugin `setIngestUrl` → `SharedPreferences`). El lector lee esa URL (y cae a `BuildConfig.INGEST_URL` si no la hay), así que **el token del creador sigue funcionando igual** — cero disrupción. `ingest` resuelve `token → user_id` (fallback al secreto legado). Textos ES/EN/CA. **Requiere APK nuevo** (cambia el lector nativo) y desplegar la función + migración.
- ⚠️ **Nota:** solo apunta gastos **desde que se activa** (tiempo real, sin histórico). El histórico pasado de TR no existe por esta vía (las notificaciones no tienen pasado).

## [3.87.0] — 2026-07-11
### Quitar a mano una cuenta del Patrimonio
- ✨ **Cuentas manuales borrables:** las cuentas añadidas a mano en el onboarding viven en `state.accounts`, no en las de Open Banking (`obAccounts`). Al desconectar/desloguear un banco, la purga automática (`bankDisconnect`) solo limpia las de Open Banking, así que una cuenta manual (p. ej. la de una pareja que se deslogueó de Revolut) seguía sumando al Patrimonio **sin forma de quitarla**. Ahora, en **Patrimonio → Cuentas → Editar**, cada cuenta manual tiene un botón 🗑 con **confirmación inline** para quitarla del patrimonio, y un aviso que recuerda que las cuentas conectadas al banco se desconectan desde **Ajustes → Bancos**. Textos en ES/EN/CA.

## [3.86.1] — 2026-07-10
### El paso del tutorial sobre el «?» ya no señala a lo que no toca
- 🐛 **Tutorial (paso 6, «Si ves un `?`…»):** cuando no había ningún botón `?` visible en el Resumen (p. ej. con las tarjetas de Meta/Reparto/Ahorro/Culpable/Tendencia ocultas), el paso caía a un *fallback* que resaltaba la tarjeta de Patrimonio Neto en su lugar — el texto hablaba de un interrogante que no estaba ahí. Ahora, si no encuentra ningún `?` real, el tutorial salta ese paso en vez de señalar algo que no corresponde.

## [3.86.0] — 2026-07-10
### TR en frío (vuelta 4, con red de seguridad), volver del banco sin ver código fuente y quitar bancos que se quitan de verdad
- 🔐 **TR en frío, diagnóstico nuevo (APK alpha14):** la causa real no era «token rancio» a secas sino **timing** — la web propia de TR hace estas mismas llamadas en frío y le funcionan; la diferencia es que el challenge del AWS WAF tarda unos segundos en generar un token válido y nosotros disparábamos a los 600 ms, demasiado pronto. Ahora el refresh **reintenta con esperas crecientes** (0→1,2→2,5→4→6→8 s, ~22 s) forzando token nuevo entre intentos hasta que entra (en caliente entra al primer intento sin esperar); se **caduca la cookie `aws-waf-token` rancia** al abrir en frío (sin tocar la sesión) para forzar un challenge nuevo; y el timeout sube a 60 s. **(nativo → APK alpha14, llega por el botón de actualizar)**
- 🔐 **TR en frío, tercera capa (APK alpha13):** el diagnóstico de alpha12 confirmó que el SDK del WAF está presente y aun así falla → el token cacheado que devuelve `getToken()` está rancio. Ahora: (1) se pide token FORZADO (`forceRefreshToken`) al reintentar, y (2) si aun así el fetch revienta, se **recarga la página de TR en la WebView oculta** (challenge del WAF desde cero, como haría un navegador de verdad) y se reintenta una vez — orquestado en nativo porque la recarga destruye el contexto JS. De regalo: timeout de 45 s para que el botón no se quede girando para siempre. **(nativo → APK alpha13)**
- 🏦 **Volver del banco ya no te enseña código fuente:** Supabase ahora machaca el `Content-Type` de sus funciones (anti-phishing: `text/plain` + sandbox) y la página «Banco conectado» salía en crudo, sin botón para volver a la app. El callback ahora redirige a una página puente en nuestro dominio (`back.html`) que sí es HTML de verdad y salta a la app sola.
- 🏦 **Quitar un banco lo quita de verdad:** sus cuentas sincronizadas desaparecen del patrimonio al momento (antes se quedaban sumando hasta el siguiente sync) y el contador de «Gestionar mis bancos» se actualiza al instante. Además Trade Republic ya cuenta como conexión en ese número.
- 🏷 **Etiqueta «extra» jubilada:** las cuentas que llegan del banco por Open Banking ahora llevan la etiqueta genérica «del banco» (la palabra «extra» era jerga interna y confundía).

## [3.85.1] — 2026-07-10
### Cobro doble arreglado, Actividad desbloqueada y TR que aguanta el frío (APK alpha11)
- 💳 **Los pagos con confirmación ya no entran DOS veces:** un pago 3DS (p. ej. una multa) genera dos notificaciones de TR («confirma el pago» + «has pagado») y ambas se apuntaban como gasto. Ahora la de autorización se ignora y, además, un mismo importe en menos de 10 minutos se trata como el mismo movimiento. *(Servidor: al desplegarse vale para todos, sin actualizar la app. El 50 € duplicado que ya está apuntado bórralo en Gastos: toca el gasto → borrar.)*
- 👁 **El panel «Actividad» ya funciona:** la tabla de telemetría existía pero al rol de usuario le faltaban los permisos base («permission denied») — migración 0007 con los grants. Los pings y errores empiezan a registrarse a partir de ahora.
- 🔐 **Sincronizar TR ya no caduca al abrir la app en frío:** el diagnóstico nuevo cantó la causa real («refresh: Failed to fetch») — el token del AWS WAF caduca y su challenge revienta la llamada. Ahora, si eso pasa, se pide token fresco al SDK del WAF de la propia página de TR y se reintenta (también en el login). **(nativo → APK alpha11, llega por el botón de actualizar)**
- 🔐 **TR en frío, arreglo de verdad (APK alpha12):** el intento de alpha11 no bastaba. La WebView vive en `app.traderepublic.com` y llama a `api.traderepublic.com` (subdominio distinto): `getToken()` dejaba el token del WAF en una cookie de `app.*` que **nunca viajaba** a `api.*`, así que el «Failed to fetch» seguía igual. Ahora todas las llamadas usan el wrapper oficial `AwsWafIntegration.fetch`, que manda el token como **cabecera `x-aws-waf-token`** (esa sí cruza subdominios). Y si aun así fallara, el error trae el estado del SDK entre corchetes para no depurar a ciegas. **(nativo → APK alpha12, llega por el botón de actualizar)**

## [3.85.0] — 2026-07-10
### Personalización total, telemetría del admin y alpha10 (estreno del botón de actualizar)
- 🖐️ **Vuelve arrastrar pestañas:** mantén pulsada una pestaña para moverla o arrastrarla a la papelera para quitarla (se pidió de vuelta — se quitó en 3.83). El editor de Ajustes sigue existiendo: son dos caminos al mismo sitio.
- 🧩 **Ocultar bloques en cualquier pestaña:** nuevo interruptor en Ajustes › Personalización — cada tarjeta de Gastos/Fijos/Inversiones/Patrimonio/Deudas muestra «Ocultar»; las ocultas se recuperan reactivando el modo. Se sincroniza entre dispositivos.
- 🧹 **Fuera personalizaciones del creador:** eliminado el mantener-pulsado sobre el patrimonio que lo leía en voz alta (se disparaba sin querer) y el botón «✎ Personalizar» del Resumen (ya vive en Ajustes).
- 👁 **Telemetría solo-admin:** los errores de la app (crashes, promesas rotas) y un ping diario de uso viajan a una tabla que SOLO puede leer el dueño (RLS por email). Panel «Actividad» en Ajustes + aviso al abrir si hay errores nuevos de otros usuarios. Sin datos financieros. *(Requiere migración 0006_app_events.sql.)*
- 🔎 **«Buscar actualización» en Ajustes (app Android):** consulta al momento si hay APK o web nueva, sin esperar al arranque; muestra las versiones instaladas.
- 📦 **APK alpha10:** lleva el fix del 2FA de Trade Republic en cada sincronización (el APK que circuló de alpha9 podía ser anterior al fix). Es la primera actualización que llega por el botón «Actualizar app».

## [3.84.0] — 2026-07-10
### Feedback de la pareja: actualizar sin cable, el banco vuelve a la app y notis domadas (APK alpha9)
- ⬇️ **Actualizar la app sin cable:** cuando hay APK nuevo, aparece el botón «App … lista · toca para instalar»: la app lo descarga sola (GitHub Releases) y abre el instalador de Android — se instala encima manteniendo datos, sesión y permisos. Se acabó el `adb install` y pasarse el archivo. La primera vez Android pide permitir «instalar apps desconocidas» para Mi Cartera (una sola vez). Los cambios solo-web siguen llegando solos por OTA como hasta ahora.
- 🏦 **Conectar el banco ya no te abandona en el navegador (bloqueante 3):** al autorizar en Revolut/Sabadell/etc., la página de vuelta salta directa a la app (deep-link `micartera://`), que confirma la conexión y sincroniza al momento. Antes te quedabas en el navegador viendo la versión web.
- 🔕 **Notis de gasto sin duplicados (punto 7):** Android re-entrega la misma notificación de TR cuando esta se actualiza y salía otra confirmación; ahora se ignoran las repeticiones (mismo texto en <3 min).
- ⚙️ **«Avisar de cada gasto apuntado» es opcional (punto 9):** nuevo interruptor en Ajustes — si TR ya te avisa del cargo, puedes apagar la confirmación de Mi Cartera; los avisos de presupuesto (80 %, superado, gasto tocho) siguen llegando siempre.
- 🎯 **La noti abre el gasto CORRECTO (punto 8):** al tocarla, la app sincroniza primero y espera a que el gasto baje de la nube antes de abrir su ficha (antes podía abrir el último gasto a ciegas si la sincronización no había terminado).
- 🧭 **Onboarding y bancos, cada cosa en su sitio (puntos 4 y 5):** «Mis bancos» vacío ahora explica que las cuentas apuntadas a mano viven en Patrimonio y que conectar el banco (Open Banking) es opcional; y en la bienvenida hay botón «Crear cuenta nueva» directo (antes tocaba pasar por «Iniciar sesión» y buscar el enlace pequeño).
- 👻 **Fuera brókers fantasma (punto 6):** Inversiones y Patrimonio solo muestran los brókers donde tienes posiciones; a los usuarios nuevos ya no les aparece MyInvestor/Revolut/TR sin haberlos tocado.
- 🤝 **TR utilizable sin cartera previa:** al sincronizar Trade Republic, las posiciones que no casan con nada se pueden **crear** como posiciones nuevas (opción «➕ Crear como posición nueva», por defecto si empiezas de cero) y el efectivo crea la cuenta TR si no existe. Antes un usuario nuevo se quedaba clavado en «Aplicar a 0 posiciones».
- 🔁 **Adiós al 2FA en cada sincronización de TR (esperemos):** el refresco de sesión llamaba primero a un endpoint que NO renueva y se daba por satisfecho; ahora renueva como pytr (`GET /auth/web/session` con la cookie `tr_refresh`) y las cookies se persisten cuando de verdad existen (tras el verify, no antes). Si aún caduca, el error ahora dice POR QUÉ falló el refresh. **(nativo, APK alpha9)**
- 💅 **Ajustes rediseñados (Claude Design):** tarjetas con filas agrupadas — Idioma y Tema con su valor y desplegable, Letra grande y Modo sencillo con interruptor, sección «Personalización» (widgets del Resumen + editar pestañas), presupuesto, moneda, bancos, notificaciones y copia de seguridad, cada cosa en su tarjeta. «Personalizar widgets del Resumen» ahora vive en Ajustes y te lleva directo al modo edición.

## [3.83.0] — 2026-07-07
### Pestaña «Logros», editar pestañas explícito y noti → ficha del gasto (APK nuevo)
- 🏅 **Nueva pestaña «Logros»:** la gamificación (nivel, retos del mes, medallas) sale de «Metas» y tiene su propia pantalla. «Metas» queda limpia (solo tus metas de ahorro); el Resumen resume racha+nivel en el titular y el detalle vive en Logros. Se oculta en modo sencillo.
- ✎ **Editar pestañas explícito (adiós al gesto oculto):** se elimina el reordenar arrastrando a una papelera manteniendo pulsado (se disparaba sin querer). Ahora en Ajustes › «✎ Editar pestañas»: reordena con ▲▼, oculta con ✕ (Resumen es fija) y vuelve a añadir las ocultas. La barra vuelve a ser solo scroll + tap; el «+» sigue para añadir.
- 🔔 **La notificación de un gasto abre su ficha (punto 5):** al tocar «✓ Gasto apuntado …», la app salta a la pestaña Gastos y abre directamente la ficha editable de ese gasto (empareja por importe + comercio, el más reciente). Requiere cambios nativos → **APK nuevo** (Notif deep-link + `MiCartera.consumeGoto()`).

## [3.82.0] — 2026-07-07
### Rediseño Claude Design (toques silenciosos) + quitar banco
- 🎬 **El patrimonio se cuenta solo:** al sincronizar, la cifra del hero anima suavemente del valor anterior al nuevo (ease-out 1,1 s; respeta «reducir movimiento»). Nada de saltos bruscos.
- 🔊 **Mantén pulsada la cifra para oírla/verla en palabras:** overlay «ciento ochenta y nueve mil…» + lectura por voz (es-ES). Accesibilidad y un guiño para público mayor.
- 🌡️ **Tinte ambiental del hero:** el fondo pasa muy sutilmente de verde → ámbar → coral según cómo va el mes (gasto/presupuesto). Un termómetro de reojo, calculado en JS (sin depender de `color-mix` del WebView).
- 📝 **«Resumen del mes» en formato carta:** una tarjeta en Fraunces, tono personal, generada de tus datos («Julio, hasta ahora… — Mi Cartera»). Un widget más del Resumen, reordenable/ocultable.
- 🌱🍂 **Racha + nivel, una sola narrativa:** en el Resumen se fusionan en un titular de estado con 2 acentos (mint/coral + ámbar de aviso): «Vas muy bien / Ojo, apurando / Te has pasado un poco», con la racha y el nivel debajo. El detalle de medallas/retos sigue en Metas.
- 🎊 **Confeti al mínimo:** reservado a metas cumplidas y más suave (26 piezas, paleta calmada). Subir de nivel ya no lanza confeti — solo un aviso tranquilo. Así destacan los momentos silenciosos (carta, conteo, tinte).
- 🍃 **Menos jerga en modo sencillo:** la tarjeta «Round-up & Saveback (TR)» pasa a «Redondeo y regalo por pagar» con explicación en lenguaje llano (ES/EN/CA).
- 🗑️ **Quitar banco:** en «Mis bancos», cada banco tiene botón **Quitar** con confirmación (revoca el consentimiento en Enable Banking + borra el enlace). Reversible: reconectas cuando quieras. Nueva Edge Function `bank-disconnect`.

## [3.81.0] — 2026-07-06
### Tanda de feedback: gastos editables, conciliación sensata y onboarding nuevo
- ✏️ **Los gastos variables ya se pueden EDITAR** (lápiz ✎): comercio, importe y gasto↔ingreso. Para corregir lo que la ingesta parsea mal — la financiación de Cofidis que notifica el total (99,99) cuando TR solo cobra la cuota (25,02), o un bizum antiguo que entró como gasto. La corrección se sincroniza bien con la nube (se retira la fila vieja y se inserta la corregida).
- 📦 **La categoría «Otros» ya tiene icono visible** (antes era un puntito que parecía vacío) y nuevas keywords de auto-categoría: `cofidis` → Compras y `vending`/`expendedor` → Bares (el agua del pádel 😄), en la app y en el clasificador del servidor.
- 🏦 **Conciliación del banco sin absurdos:** ya no empareja un cargo modelado con un movimiento de importe disparatado solo porque el nombre suene (YouTube Premium 4,33 vs 25,99 genérico). Y los cargos de primeros de mes que el banco adelanta al último día hábil (hipoteca del día 1 cobrada el 30) o que pagaste antes de tiempo se buscan también en la cola del mes anterior → salen confirmados, no «aún no aparece». Todos los avisos llevan «Ocultar aviso» (por mes).
- 🔗 **La conexión de Trade Republic vive en «Gestionar mis bancos»** — TR también es un banco, aunque su integración sea otra.
- 💶 **La sincro de TR actualiza también tu EFECTIVO:** al aplicar, además de las posiciones, la cuenta TR se re-ancla al efectivo real que reporta TR (misma fórmula que la edición manual).
- 🏷️ **Patrimonio honesto:** el subtítulo de cada cuenta es SU nombre (editable en modo edición — se acabó el «Conjunta con pareja» en la cuenta personal) y bajo Trade Republic ya no sale el gasto del mes (eso vive en Gastos). Fuera también la tarjeta de desglose del efectivo TR.
- 👋 **Onboarding renovado:** wizard de 3 pasos (qué hace la app hoy — gastos solos, bancos, metas —, presupuesto con atajos, cuentas), con progreso y el aviso de «¿reinstalaste? inicia sesión» bien visible.

## [3.80.0] — 2026-07-06
### OTA: la app arranca al instante + gasto automático blindado (APK 4.0.0-alpha7)
- ⚡ **Adiós al tirón de arranque en frío (OTA con capacitor-updater, self-hosted y gratis).** La app Android ya NO carga la web en vivo desde GitHub Pages en cada apertura: arranca de un **bundle local** (instantáneo, funciona sin red) y baja la versión nueva en segundo plano (`version.json` + `bundle.zip`, publicados por el CI en la misma GitHub Pages). El cambio entra solo en el siguiente arranque — se mantiene el «se actualiza sola», sin recargas a media sesión. ⚠️ Al pasar a la alpha7 la app cambia de origen (`https://localhost`): pedirá iniciar sesión UNA vez y recupera todo de la nube (camino blindado en v3.78).
- 🔁 **Refresco automático de la sesión de Trade Republic:** antes de cada sincro, el puente nativo renueva la sesión con la cookie `tr_refresh` (sin 2FA, el mismo endpoint que usa la web de TR); solo si el refresh falla de verdad se vuelve al login. Menos «tu sesión caducó».
- 🔔 **El apunte automático de gastos ya no muere en silencio** (raíz del «pagué en el Consum y no salió»): al reinstalar la app, Android revoca el acceso a notificaciones del lector de TR. Ahora la app lo detecta al arrancar (aviso) y en Ajustes sale un botón «Activar acceso a notificaciones» que abre la pantalla exacta; el aviso se quita solo al concederlo.
- 🧹 **Fuera el importador CSV** (todo automatizado; nadie lo usaba). La conexión de Trade Republic se muda de Inversiones a **Ajustes**, junto a los bancos.

## [3.79.3] — 2026-07-06
### ¡Trade Republic sincroniza de verdad! (APK 4.0.0-alpha6)
- 🎉 **Sync de Trade Republic COMPLETO y funcionando de punta a punta.** Login → 2FA → posiciones + valor en vivo + efectivo → re-anclaje automático por ISIN/nombre. Verificado en el móvil real: trae el FTSE All-World (6,819272 particip., 1.133 €) y Meta (0,0539 particip., 27,91 €) + efectivo (6.795 €), y re-ancla las 2 posiciones con un toque. **Sin exportar nada a mano.**
- 🔧 **Protocolo WebSocket de TR descifrado en vivo:** `connect 31` → `connected`; posiciones = topic `compactPortfolioByType` (categorías → posiciones con isin/participaciones/coste medio); efectivo = `availableCash`; precio en vivo = `ticker` con sufijo de mercado `.LSX` (Lang & Schwarz, EUR). **Los IDs de suscripción deben ser numéricos** (con letras TR los ignora en silencio — era el bug que traía «0 posiciones»).
- 🔑 **Sesión más robusta:** «conectado» ahora es un flag persistente (antes se adivinaba por el nombre de la cookie). Si la sesión de TR caduca (son cortas), el sync lo detecta (`AUTHENTICATION_ERROR`), te avisa claro («tu sesión caducó, vuelve a conectar») y la tarjeta vuelve al login sola, en vez de traer 0 posiciones en silencio.

## [3.79.1] — 2026-07-05
### Fixes de la app nativa tras probarla (APK 4.0.0-alpha4)
- 🐛 **Doble «Ya tengo cuenta» en la bienvenida:** salía el botón dos veces (el destacado del aviso de arriba + uno al pie). Quitado el del pie.
- 🐛 **El gesto «atrás» te sacaba de la app:** en el APK, deslizar desde el borde para volver atrás cerraba la app entera en vez de cerrar el menú/panel abierto (en el navegador ya iba bien). Ahora el botón/gesto atrás de Android cierra primero el panel de arriba (Ajustes, bancos, pickers…), luego vuelve al Resumen, y solo sale de la app si ya estás en el Resumen sin nada abierto. Añadido `@capacitor/app` para capturarlo de forma nativa.
- ⚡ **Menos tirones al volver a la app:** al alternar de app y volver, ya no se relanza la sincronización de red si acabas de sincronizar (margen de 30 s) — quita un re-render pesado innecesario. (El tirón grande al abrir en frío es porque Android mata la app en segundo plano y recarga todo desde internet; se resolverá del todo con la actualización OTA, pendiente.)

## [3.79.0] — 2026-07-05
### Bug del Bizum arreglado + huella nativa + widget + notificaciones de verdad + puente TR (APK 4.0.0-alpha3)
- 🔗 **Puente nativo Trade Republic (beta):** plugin Android `TradeRepublic` (`status/login/verify/sync/logout`) que atraviesa el AWS WAF ejecutando el login **dentro de una WebView oculta** cargada en `app.traderepublic.com` (que es un navegador real → resuelve el token del WAF, las cookies y el CORS solos). El JS async devuelve por un puente `@JavascriptInterface`. Verificado en el móvil: la WebView carga el login de TR y la API responde de verdad (HTTP real, no el 403 del WAF que mata a pytr). Falta la prueba con credenciales reales + 2FA (solo la puede hacer el usuario). Credenciales y cookies NUNCA salen del móvil.
- 🐛 **Un Bizum recibido ya no cuenta como gasto:** la función `ingest` ahora CLASIFICA la notificación de TR antes de apuntar nada. Bizum **recibido** → entra como **ingreso** (resta del gasto del mes); Bizum **enviado** → gasto marcado «🔄 sin tarjeta» (no infla el round-up); intereses, dividendos, órdenes, planes de inversión, round-up/saveback y transferencias propias → **se ignoran** (ya están modelados en la app). El arreglo vive en el servidor: mejora sin reinstalar el APK.
- 🔄 **El flag «💳 tarjeta / 🔄 bizum» ahora es permanente:** nueva columna `no_card` en la tabla de gastos (migración 0005). Antes, al re-sincronizar, el flag puesto a mano en un gasto de la nube se perdía; ahora sobrevive a reinstalaciones y sincroniza entre dispositivos.
- 👆 **Huella en la app Android (por fin):** plugin nativo propio `MiCartera` con `BiometricPrompt` — huella o, si no hay, el PIN/patrón del móvil. La web lo usa automáticamente si existe; en navegador sigue la vía WebAuthn de siempre.
- 📱 **Widget de pantalla de inicio:** gasto del mes vs presupuesto (con barra y «te quedan X»), saldo de la cuenta de gasto diario y hora de actualización. Lo alimentan la app al usarla **y el lector de notis de TR con la app cerrada** (la respuesta de `ingest` trae el total del mes).
- 🔔 **Notificaciones de verdad (sin abrir la app):** al capturar un gasto de TR llega una notificación «✓ Gasto apuntado: X € en Y» — y si con ese gasto superas el presupuesto (o cruzas el 80%, o es un gasto tocho) llega también la alerta 🚨, calculada en el servidor. Los avisos al apuntar un gasto a mano también salen como notificación nativa. (Permiso de notificaciones: la app lo pide al abrirse, Android 13+.)

## [3.78.0] — 2026-07-05
### Primer arranque a prueba de sustos (reinstalar / móvil nuevo / app Android)
- 🛟 **Iniciar sesión no recuperaba tus datos (y podía machacarlos):** al reinstalar o estrenar móvil, si terminabas el onboarding con la cartera vacía y *luego* iniciabas sesión, la lógica «protege lo offline» creía que tu cartera vacía era «más nueva» que la nube → se quedaba vacía y podía **sobrescribir la nube**. Ahora, al **iniciar sesión** (no un reconecta del mismo usuario), la **nube manda siempre** y recupera todo al instante; los gastos se siguen fusionando (nunca se pierden). Ningún dato se perdió con el bug anterior: hay copia local, en la nube y **backups diarios**.
- 🐛 **El botón «Ya tengo cuenta» no hacía nada:** el panel de login se abría *por detrás* de la pantalla de bienvenida (z-index 60 bajo el 90 del onboarding), invisible. Subido a 120 → ahora aparece por delante y es clicable.
- ✨ **Bienvenida orientada a «ya tengo cuenta»:** aviso destacado arriba del onboarding — «¿Reinstalaste o cambiaste de móvil? Inicia sesión y recuperas todo al instante» — con botón de login a mano (antes estaba enterrado al final).
- 🐛 **Tutorial y login se pisaban:** el tour de bienvenida arrancaba encima del panel de inicio de sesión (y del cajón de Ajustes). Ahora espera a que no haya login/cajón abiertos.

## [3.77.0] — 2026-07-05
### Botón de sincronización con Trade Republic (beta) + arreglo de Ajustes
- 🔗 **Conectar Trade Republic (Inversiones → «Conectar Trade Republic · BETA»):** un botón que trae tus posiciones al momento (participaciones, valor y coste EN VIVO) y las re-ancla por ISIN, reutilizando el mapeo del importador CSV. Solo LEE: nunca opera ni mueve dinero. Las posiciones en $ se convierten con el cambio del BCE. La UI completa (login teléfono+PIN → código 2FA → previsualización con mapeo → aplicar → desconectar) queda cableada y verificada.
- 🏗️ **La conexión real es NATIVA de Android:** el login de TR está detrás de AWS WAF y exige un token que solo se consigue desde un navegador de verdad (una Edge Function «pelada» recibe 403). Por eso la conexión la implementa la capa nativa del APK (que ES un navegador real y resuelve el WAF gratis). En la web pura la tarjeta muestra un aviso «disponible en la app Android» y el importador CSV sigue como alternativa. El contrato del puente nativo (`window.MiCarteraTR` / plugin Capacitor `TradeRepublic`: `login`/`verify`/`sync`/`status`/`logout`) queda documentado en el código listo para rellenar al montar el APK. Credenciales y sesión viven solo en el móvil, nunca en la nube.
- 🐛 **Texto invisible en Ajustes (temas oscuro/verde/azul):** los botones «Ver el tutorial» e «Informe del mes» ponían fondo pero no color de texto, así que heredaban el negro del estilo base y no se leían salvo en tema Claro. Ahora usan `var(--text)` como el resto.

## [3.76.0] — 2026-07-04
### Arreglos gordos de UX (tabs, ayudas, informe) + interés TR + avisos
- 🐛 **Tabs que "a veces" no se podían mover ni quitar:** si la app arrancaba en la pantalla de bloqueo (PIN/huella) o en el onboarding, los listeners de arrastre de pestañas no se instalaban nunca en esa sesión. Ahora se enganchan al desbloquear. (Por eso fallaba en la demo y en casa: dependía de si la app abría bloqueada.)
- 🐛 **Ayudas «?» que salían en Resumen:** el track de páginas lleva un `transform` permanente y capturaba el `position:fixed` del overlay — la tarjeta de ayuda se pintaba sobre otra pestaña. Ahora va en un portal a `<body>`: sale centrada, estés en la pestaña que estés.
- 🎨 **Informe del mes a prueba de móviles:** los colores ya no se leen de las variables CSS (que el "modo oscuro automático" de algunos Android reescribe, dejando textos negros ilegibles) sino de una paleta fija por tema. El tutorial y las tarjetas de ayuda declaran su color explícito por la misma razón.
- ❓ **Ayudas «?» en (casi) todas las tarjetas:** de 5 a 23 — Resumen (distribución, culpable, tendencia, ahorro, meta), Gastos (suscripciones), Inversiones (rentabilidad, por tipo, evolución), Patrimonio (cuentas+ROLES, desglose TR, inversiones, bienes) y Fijos (recibos, cuotas, nómina/transfers, puntuales). ES/EN/CA.
- 🎓 **Tour más completo:** 3 pasos nuevos — mover/quitar/añadir pestañas, la pestaña Patrimonio, y qué son los «?».
- 💶 **Interés del efectivo TR (Inversiones → Round-up):** campo «% anual»; al cerrar cada mes la app abona el interés sola. Era la fuga principal del descuadre lento con TR (TR paga intereses el día 1 y la app no los contaba). El desglose TR ahora explica los descuadres pequeños legítimos (intereses + TR invierte round-ups los días 2/9/16/23).
- 🔔 **Avisos al apuntar un gasto** (in-app; las push de verdad llegarán con el APK): pasarse del presupuesto, cruzar el 80 %, o un gasto tocho (≥15 % del presupuesto).

## [3.75.0] — 2026-07-04
### Roles de cuenta + gasto por Open Banking + informe del mes en imagen
- 🎭 **Roles de cuenta (Patrimonio → Editar):** cada cuenta puede ser **🏦 Recibos** (los fijos/cuotas salen de ahí, como siempre), **🛒 Gasto diario** (de ahí sale lo que apuntas en Gastos — lo que antes era "la TR" fija) o **🔁 Todo** (una sola cuenta para ambas cosas, como usa mucha gente). Solo puede haber una de gasto diario; al cambiar el rol **el saldo mostrado se conserva** (re-anclaje automático, nada "salta"). Motor completo: saldo dinámico, cierre de mes y conciliación entienden los tres roles.
- 🏦 **Compras con tarjeta → Gastos, solas:** si tu cuenta de gasto diario es un banco conectado por Open Banking, sus compras con tarjeta **entran automáticamente como gastos** (idempotente por ext_id, solo tarjeta — recibos y bizums fuera, sin doble conteo: primero entran los gastos y luego se re-ancla con el saldo real). Para el creador es inerte (su gasto va por TR, que no está en OB); es la pieza que hace la app usable por gente con ING/CaixaBank para el día a día.
- 💶 La **inyección de nómina de TR (1500 €)** deja de ser un número global hardcodeado: ahora es un campo por cuenta (`inject`, sembrado para la cuenta del creador) — otro paso para compartir la app.
- 📸 **Informe del mes (Ajustes):** genera una imagen bonita (1080×1350, colores de tu tema) con el gasto del mes vs presupuesto, top categorías y patrimonio, y abre el compartir del móvil (o descarga el PNG). Todo en el dispositivo.
- 🐛 Arreglado de paso: editar a mano el saldo TR no revertía el aporte periódico (anclaba 50 € desviado).

## [3.74.0] — 2026-07-03
### Botón «Nueva versión» + plan de ahorro TR (los 50 €/mes al FTSE cuadran solos)
- ✨ **Aviso de actualización con botón:** cuando hay una versión nueva esperando, aparece un pill verde arriba «✨ Nueva versión · toca para actualizar»; al tocarlo se activa y recarga al momento (tú decides cuándo). Si no lo tocas, entra sola en el siguiente arranque, como siempre. Blindado para que la PRIMERA instalación del SW no recargue sola (guard `_mcUserInitiated`; el viejo bug de v3.20 no vuelve).
- 💶 **Aporte periódico a inversión (plan de ahorro TR):** nuevo campo «Aporte periódico» en la tarjeta Round-up & Saveback (Inversiones). Los 50 €/mes que van del efectivo de TR al FTSE ahora **se descuentan solos del efectivo** (en vivo, con su línea en el Desglose del efectivo TR) y al cerrar el mes **compran participaciones** en la inversión destino (mismo mecanismo probado del round-up: valores absolutos, sin doble conteo, patrimonio total intacto). Sembrado con tus 50 € → FTSE All-World.
- ✅ Verificado: cierre de mes 6000 +1500 nómina −50 aporte = 7450 en TR y el FTSE sube exactamente +50 € en coste y participaciones.

## [3.73.0] — 2026-07-03
### UX para no-técnicos (padres): tour guiado + modo Sencillo de verdad + ayudas «?»
- 🎓 **Tour de bienvenida (coach-marks):** la primera vez tras el onboarding, la app señala con un foco los sitios clave (tu dinero, Gastos, Fijos, Ajustes, la nube) con una frase llana por paso. Saltable, y relanzable cuando quieras desde **Ajustes → 🎓 Ver el tutorial**. Los usuarios existentes no lo ven de golpe (solo bajo demanda).
- 🧓 **Modo Sencillo de verdad:** además de dejar 3 pestañas, ahora también simplifica el Resumen (fuera widgets avanzados: distribución, tendencias, rachas…) y **habla sin jerga**: «Patrimonio neto» → «Tu dinero en total», «Fijos» → «Recibos», «Activos» → «Lo que tienes» (ES/EN/CA).
- 🔍 **Letra grande:** nuevo botón en Ajustes que escala toda la app un 12 % (accesibilidad).
- ❓ **Ayuda contextual:** botón «?» en las tarjetas complejas (round-up, importador, proyección, simulador, conciliación) que explica en cristiano qué hace cada una.
- 🧹 **Des-personalización:** el override «mapfre→bares» del creador ya no va hardcodeado para todo el mundo (ahora es una semilla solo de su cartera); el mes de la cabecera respeta el idioma elegido (antes siempre en español).

## [3.72.0] — 2026-07-03
### Importador CSV del bróker — sync de inversiones sin dar credenciales a nadie
- 📥 **Nueva tarjeta «Importar del bróker (CSV)» en Inversiones:** exporta tus movimientos desde la app del bróker (Trade Republic exporta CSV), súbelo o pega el texto, y la app **re-ancla tus posiciones a la verdad del extracto** (participaciones + coste absolutos, con coste medio y ventas parciales bien calculadas). Previsualización SIEMPRE antes de aplicar, con mapeo por posición (sugerido por ISIN guardado o por nombre) y opción «no tocar». Tras aplicar se refrescan los precios para recalcular el valor de mercado.
- 🔒 **Todo se procesa en el móvil**: el CSV no se sube a ningún servidor. Cero credenciales, cero dependencias de terceros.
- 🧠 **Parser tolerante:** detecta separador (`;`/`,`/tab), fila de cabeceras y columnas por nombre en ES/EN/DE (fecha/date/datum, cantidad/shares/anzahl…) o por la pinta de los valores (ISIN por regex, fechas). Entiende compras, ventas, planes de inversión, **saveback/round-up** (son compras), e informa de **intereses y dividendos** detectados (p. ej. el interés de TR que descuadraba el efectivo).
- 🔁 **Sin doble conteo con el round-up modelado:** el import fija valores ABSOLUTOS (re-ancla), no suma deltas; el motor sigue proyectando desde el ancla nuevo.
- 📝 Contexto: investigado el sync automático de inversiones (mandato "no se puede no existe"). SnapTrade no cubre TR/Revolut/MyInvestor (verificado contra su API pública), Plaid Investments es US/CA, y las vías reales (Flanks —lo que usa Getquin—, wealthAPI) son B2B con contrato → encajan en Fase 3 junto a Enable Banking producción. El CSV es lo que usan los trackers serios sin pedir login del bróker.

## [3.71.0] — 2026-07-03
### Tabs dinámicas + arranque instantáneo + adiós CDNs de terceros
- ➕ **Tabs dinámicas (idea del compi del curro):** botón **«+»** al final de la barra para añadir pestañas ocultas (sale una hoja con las disponibles; al tocar una se añade al final y salta a ella), y **papelera al arrastrar**: mantén pulsada una pestaña y suéltala sobre la papelera para quitarla (el Resumen no se puede quitar). Se persiste en `settings.tabHidden` y sincroniza entre dispositivos. El modo Sencillo de Ajustes ahora es un preset de esto mismo (retrocompatible: quien tenía modo sencillo sigue viendo lo mismo).
- 🖐️ **El drag de pestañas ahora levanta la que tocas** (antes levantaba siempre la activa, aunque mantuvieras pulsada otra).
- 🐛 **Fix swipe:** con pestañas ocultas (p. ej. modo Sencillo), deslizar más allá de la última saltaba de golpe al Resumen (usaba el total de pestañas en vez de las visibles). Ahora hace la resistencia de borde normal.
- ⚡ **Arranque instantáneo (Service Worker stale-while-revalidate):** la app abre AL MOMENTO desde caché (incluso con red lenta o sin conexión) y la versión nueva se descarga por detrás y entra en el siguiente arranque — mismo modelo de actualización de siempre, pero sin esperar a la red al abrir.
- 📦 **Cero CDNs de terceros:** supabase-js auto-hospedado y **con versión fijada** (`vendor/supabase.min.js` v2.110.0; antes jsdelivr con `@2` flotante, que podía romper la app sola el día menos pensado) y fuentes Manrope/Fraunces auto-hospedadas (`fonts/`, variables, latin+latin-ext; antes CSS bloqueante de Google Fonts). Todo cacheado por el SW ⇒ la app entera va offline y carga menos.
- 🗜️ **Minificación en CI:** nuevo `scripts/minify-html.mjs` (esbuild; solo espacios+sintaxis, sin renombrar símbolos) en el workflow de deploy. El `index.html` del repo sigue siendo la fuente legible; el artefacto desplegado pesa ~14% menos (~26% menos el código propio).
- 🎨 **Temas redondeados:** el tema elegido se aplica **antes del primer pintado** (adiós fogonazo oscuro del splash en tema claro), la barra de estado del móvil (`theme-color`) se tiñe del color del tema, la pantalla de bloqueo y el splash respetan el tema, y el degradado de la barra de tabs y los puntitos de página ya no llevan colores oscuros fijos.

## [3.70.1] — 2026-07-01
### Cuentas extra de Open Banking: nombres bonitos + editables
- ✏️ Las cuentas extra sincronizadas (compartidas, 2ª cuenta de un banco) traían nombres feos del banco (los titulares de una conjunta, un tipo técnico o nada). Ahora se muestran con un **nombre "bonito" automático** (`niceObName`: conjunta/ahorro/corriente, o el final del IBAN si no hay nombre) y se pueden **renombrar a mano** en Patrimonio → Editar (se guarda en `state.obLabels` y sincroniza). Sigue el mismo formato que las cuentas manuales.

## [3.70.0] — 2026-07-01
### UX y motor — feedback tras probar Open Banking multibanco
- 🔙 **Gesto/botón "atrás" ya no saca de la app:** el cajón de Ajustes, la sección "Mis bancos" y su buscador de bancos ahora meten una entrada de historial al abrirse (History API), así el gesto de retroceso del móvil los **cierra** en vez de salir de la PWA. Se cierran en orden (primero el de encima) y el cierre por botón/swipe también consume su entrada. Nuevo hook `useBackClose` con pila global.
- 🔁 **Ingresos y transferencias: mensual o puntual.** Nuevo toggle "🔁 Cada mes / 📅 Una vez" al añadir un flujo; los puntuales (`f.once={y,m}`) solo cuentan ese mes/año concreto, muestran un badge "📅 mes año" y desaparecen de la lista al pasar. Así un ingreso o traspaso de una sola vez no se repite cada mes.
- 🔎 **Desglose del efectivo de TR (Patrimonio):** tarjeta plegable que enseña de dónde sale el saldo mostrado (`base + nómina − gasto del mes − round-up = saldo`) y lista los gastos del mes con su etiqueta 💳 tarjeta / 🔄 bizum y el round-up que aporta cada uno. Diagnóstico para cuadrar descuadres (p.ej. detectar un bizum mal marcado 💳 que infla el round-up). Solo lectura, no cambia el comportamiento.
- 🏦 **"Banco sin cuentas" claro:** cuando un banco autoriza pero vuelve sin cuentas dadas de alta (modo restringido), "Mis bancos" ahora lo muestra con estado propio **"sin cuentas"** + explicación persistente del paso que falta (enlazar la cuenta en el panel de Enable Banking) y botón "Volver a intentar", en vez de pintarlo como "caducado".
- 🏦🏦 **Open Banking MULTI-CUENTA (genérico, cualquier banco):** hasta ahora solo se traía **una** cuenta por banco. Ahora se sincronizan **todas** las cuentas de cada banco enlazado. La cuenta "primaria" (la que ya tienes creada) se re-ancla como siempre; las demás (p.ej. la **compartida de Revolut**, o todas las de un banco recién conectado sin cuenta manual) aparecen como **cuentas aparte** en Patrimonio (`state.obAccounts`) — saldo real que suma al patrimonio **sin tocar el motor de cash-flow** (cero doble conteo). Nueva migración `0004_bank_accounts.sql` (columna `accounts` JSONB, aditiva) + `bank-callback` guarda todas las cuentas autorizadas + `bank-sync` las recorre (cada una en su try/catch; el fallo de una no tumba las demás) manteniendo los campos top-level de la primaria para retrocompatibilidad. "Mis bancos" muestra el nº de cuentas. ⚠️ Requiere aplicar la migración 0004 y whitelistear cada cuenta en el panel de Enable Banking. **Nota:** las carteras de valores/acciones (Revolut, TR, fondos) NO vienen por Open Banking (PSD2 solo cubre cuentas de pago) → siguen manuales.

## [3.69.3] — 2026-06-30
### Causa raíz del "0 cuentas" (Revolut, MyInvestor, CaixaBank…) — no era un bug
- ✅ **Confirmado por la FAQ de Enable Banking:** en **modo restringido (restricted production)** la API compara las cuentas autorizadas contra las que tienes **enlazadas (whitelisted)** en el panel de control y **descarta el resto** → una sesión autorizada que vuelve con 0 cuentas significa que esa cuenta **no está dada de alta** en la app. Hoy solo está enlazada la de Sabadell; por eso Revolut (y MyInvestor/CaixaBank) volvían "sin cuenta". **El arreglo es enlazar cada cuenta en el panel de Enable Banking**, no es código.
- 💬 **Mensaje accionable en vez de texto críptico:** cuando la sesión está autorizada pero vuelve con 0 cuentas, `bank-callback` ahora devuelve un código corto (`nolink:<banco>`) y la app muestra "{Banco}: esta cuenta aún no está dada de alta en Enable Banking (modo restringido). Enlázala en el panel y vuelve a conectar." (ES/EN/CA). El diagnóstico crudo se reserva solo para el caso raro en el que ni siquiera hubo sesión.

## [3.69.2] — 2026-06-30
### Diagnostics — Revolut devuelve la sesión con 0 cuentas
- 🔍 Confirmado con el diagnóstico real: Revolut crea la sesión (hay `session_id` y `access`) pero `accounts` viene **vacío** y sin `accounts_data`. `bank-callback` ahora **reintenta `GET /sessions/{id}` con espera** (×3, por si las cuentas se rellenan con retardo) y, si sigue sin cuenta, el error incluye un diagnóstico completo: conteos de POST y GET, `status` de la sesión y el `access` concedido. Sirve para cerrar el caso Revolut en el próximo intento.

## [3.69.1] — 2026-06-30
### Fixed — Conexión de bancos que devolvían 0 cuentas
- 🐛 **MyInvestor/Revolut/Caixa daban "sin cuenta utilizable (recibidas: 0)":** Enable Banking entrega las cuentas en formas distintas según el banco; solo leíamos `session.accounts` como objetos. Ahora `bank-callback` lee también `accounts_data` y los UID sueltos, y si el `POST /sessions` viene vacío hace fallback a `GET /sessions/{id}`. Si aún así no hay cuenta, el error incluye un diagnóstico real (claves y conteos de la respuesta) en vez de un mensaje opaco. (Sabadell ya conectaba bien.)

## [3.69.0] — 2026-06-30
### Fixed — Proyección y Open Banking (la app se "volvía loca")
- 🐛 **Doble conteo de la nómina / "= a fin de mes" disparado:** la heurística pagado/pendiente usaba `<` estricto, así que lo que ocurre **hoy** (nómina, IRPF, fijos del día) se contaba como pendiente y se sumaba **encima** del saldo real del banco. Cambiado a `<=` en `isPaidIn`, `isPaidThisMonth`, `flowPaid`, `monthNetForAccount` y `debtPaidCount`. (Reproducido: `2673 + 3333 − 146 = 5860` → ahora `2673`.)
- 🐛 **Sync de Sabadell tumbaba a todos los bancos:** `bank-sync` sincronizaba en un bucle donde un único fallo lanzaba 500 y obligaba a resincronizar todo. Ahora cada banco va en su propio try/catch; el fallo de uno no afecta a los demás y un 401/403/404 marca **solo** ese enlace como `expired` (reconectar). La app aplica los saldos de los que sí funcionaron y avisa del banco concreto.
- 🐛 **Bancos nuevos salían "caducado" al conectar:** `bank-callback` cogía a ciegas `accounts[0]`; si no traía `uid` guardaba `status:error`. Ahora busca la primera cuenta con `uid` (soporta string/objeto) y, si no hay cuenta utilizable, devuelve un error honesto en vez de un falso `ok`.
- 🐛 **"Aún no aparece en el banco" (IBI) falso positivo:** la conciliación solo marca un cargo como "no aparece" si el feed del banco **cubre realmente ese día**; con sync vieja o parcial ya no inventa el aviso.

## [3.39.0] — 2026-06-23
### Added — Idiomas COMPLETO (ES/EN/CA) · [#14](https://github.com/JuanjoAvila/Mi-Cartera/issues/14)
- Traducidas las pestañas restantes: **Inversiones** (incluida la proyección y el rendimiento por posición), **Patrimonio**, **Deudas** y el **login/cuenta** (pantalla de bloqueo y panel de sesión). Con esto **toda la app está disponible en español, inglés y catalán**.

## [3.38.0] — 2026-06-23
### Added — Idiomas (fase 3): Fijos (motor) · [#14](https://github.com/JuanjoAvila/Mi-Cartera/issues/14)
- Traducida al completo (ES/EN/CA) la pestaña **Fijos**: próximos cargos, cash-flow, alarmas, servicios, cuotas de deuda, ingresos/transferencias y cargos puntuales, con todos sus formularios. Frecuencias y meses traducidos.

## [3.37.0] — 2026-06-22
### Added — Idiomas (fase 2): Resumen y Gastos · [#14](https://github.com/JuanjoAvila/Mi-Cartera/issues/14)
- Traducidas al completo (ES/EN/CA) las pestañas **Resumen** y **Gastos**, incluidos meses, categorías, fechas (locale) y «Hoy/Ayer». Helper `tf()` para textos con variables.

## [3.36.0] — 2026-06-22
### Added — Idiomas (fase 1) · [#14](https://github.com/JuanjoAvila/Mi-Cartera/issues/14)
- **Selector de idioma en Ajustes: Español / English / Català.** Sistema de traducción (`t()`) con diccionario y **fallback a español** (lo que aún no está traducido se ve en español, nada se rompe).
- Traducido en esta fase: **navegación (pestañas), Ajustes y la bienvenida/onboarding**. El contenido de cada pestaña se irá traduciendo en las siguientes fases.

## [3.35.0] — 2026-06-22
### Fixed
- **Arrastre del Resumen:** al mantener pulsada una tarjeta ya no se selecciona el texto (se bugeaba el movimiento). Las tarjetas no son seleccionables.
- **Texto del ahorro:** «¿De dónde sale el ahorro?» → «¿A dónde va tu ahorro?» (es hacia dónde va, a inversión).

## [3.34.1] — 2026-06-21
### Added
- **Más restaurantes autodetectados:** KFC, Five Guys, Goiko, TGB, Taco Bell, Domino's, Subway, Starbucks, Foster's, 100 Montaditos, La Sureña, Dunkin', Popeyes, Nando's, Udon, La Tagliatella, Ginos y muchos más caen ahora en «Bares y restaurantes» (🍽️) en vez de «Otros». Los que entren por sincronización se recategorizan solos.

## [3.34.0] — 2026-06-21
### Added — Feedback de amigos: ingresos, borrar, presupuesto rápido, color deuda
- **Gastos variables: borrar y añadir ingresos** ([#13](https://github.com/JuanjoAvila/Mi-Cartera/issues/13)): en «Apuntar» puedes elegir **Gasto o Ingreso** (p.ej. cuando alguien te devuelve dinero); el ingreso resta del gasto del mes y se muestra en verde. Cada gasto/ingreso tiene una **✕ para borrarlo** (con tombstone para que no reaparezca al sincronizar).
- **Editar el presupuesto desde el Resumen** ([#12](https://github.com/JuanjoAvila/Mi-Cartera/issues/12)): un **lápiz** junto a «Presupuesto» abre una cajita para cambiarlo al vuelo, sin ir a Ajustes.
- **Color de la deuda = su barra** ([#16](https://github.com/JuanjoAvila/Mi-Cartera/issues/16)): la bolita de cada deuda y su barra de progreso usan ahora el mismo color (con variedad por deuda).

## [3.33.0] — 2026-06-21
### Changed — Arrastre del Resumen más fluido + auto-scroll
- **Las demás tarjetas se apartan con animación** al hacer hueco mientras arrastras (transición suave), en vez de una línea fija. Mucho menos "robótico".
- **Auto-scroll:** al arrastrar una tarjeta hacia el borde superior o inferior, la pantalla se desplaza sola para poder soltarla más arriba/abajo de lo que se ve.

## [3.32.0] — 2026-06-21
### Added — Arrastrar tarjetas del Resumen (mantener pulsado) · [#7](https://github.com/JuanjoAvila/Mi-Cartera/issues/7)
- **Reordenar arrastrando:** mantén pulsada una tarjeta del Resumen y arrástrala para moverla, con línea que marca dónde caerá (más "pro" y dinámico). Un toque rápido no la mueve, así que abrir/cerrar tarjetas y el scroll siguen igual. El botón «Personalizar» se mantiene para ocultar/mostrar (y reordenar con flechas como alternativa).

## [3.31.0] — 2026-06-21
### Added — Resumen personalizable · [#7](https://github.com/JuanjoAvila/Mi-Cartera/issues/7)
- **Reordenar y mostrar/ocultar las tarjetas del Resumen.** Botón «✎ Personalizar»: cada tarjeta puede subir/bajar y ocultarse o mostrarse. El orden y lo oculto se guardan y se sincronizan. El «Patrimonio neto» se puede reordenar pero no ocultar (queda fijo).
- _Nota: el reordenado es con flechas ↑/↓ (robusto en móvil); el arrastre con el dedo se puede añadir más adelante._

## [3.30.0] — 2026-06-21
### Added — Dashboard de inversiones más rico · [#6](https://github.com/JuanjoAvila/Mi-Cartera/issues/6)
- **Rendimiento por posición:** nueva tarjeta en Inversiones con la ganancia (€ y %) de cada activo, ordenado de mejor a peor, con barra de color (verde/rojo) y resaltado del mejor y el peor. Respeta el toggle €/$ de la pestaña.
- **Evolución del valor invertido:** se guarda un punto por día del total invertido y se dibuja una mini-gráfica de evolución (se va construyendo a partir de ahora).

## [3.29.0] — 2026-06-21
### Added — Onboarding / arranque limpio · [#3](https://github.com/JuanjoAvila/Mi-Cartera/issues/3)
- **Los usuarios nuevos arrancan con la cartera VACÍA** (ya no heredan los datos de ejemplo). Pantalla de bienvenida para meter el presupuesto y las cuentas (banco + saldo); inversiones, deudas y gastos fijos se añaden luego en sus pestañas.
- **Volver en otro móvil:** botón «Ya tengo cuenta · Iniciar sesión» en la bienvenida para recuperar tus datos de la nube sin tener que rellenar nada.
- **Sin afectar a los usuarios actuales:** el estado existente se marca como `onboarded` y se conserva igual; las semillas de la cartera de ejemplo quedan atadas solo a esa cartera (un usuario nuevo no recibe la nómina/transferencias de ejemplo).

## [3.28.1] — 2026-06-21
### Fixed
- **Tema claro salía oscuro en algunos móviles:** el «modo oscuro automático» de Chrome Android oscurecía a la fuerza el tema claro. Se declara `color-scheme` (meta + por tema) para que el navegador respete el tema elegido y no lo invierta.

## [3.28.0] — 2026-06-21
### Added — Temas de color · [#4](https://github.com/JuanjoAvila/Mi-Cartera/issues/4)
- **4 temas seleccionables en Ajustes:** Verde (el de siempre), **Oscuro** (negro neutro), **Claro/blanco** y **Azul**. Se cambian al vuelo (variables CSS por `data-theme`), se guardan en ajustes y se sincronizan entre dispositivos. Se aplican antes del primer pintado, sin parpadeo.
- El panel de Ajustes y el cajón lateral ahora usan variables de color, así que también se adaptan al tema elegido.

## [3.27.0] — 2026-06-21
### Added — Inversiones: moneda €/$ por pestaña + contribuciones por bróker
- **Toggle €/$ en la pestaña Inversiones:** cambia la moneda solo de esa pestaña (todo se calcula en € y se muestra en € o $ con el cambio del BCE). Así puedes ver, p.ej., el bloque de Revolut en dólares y compararlo con su app, sin cambiar la moneda de toda la app. El toggle global de Ajustes sigue ahí como opción.
- **Contribuciones vs ganancias por bróker:** la tarjeta ahora desglosa Revolut / Trade Republic / MyInvestor por separado (invertido, valor y ganancia de cada uno), además del total. Resuelve la confusión de ver todo mezclado y en una sola moneda.
- Aclarado que «Invertido» es la **base de coste** (no las «contribuciones netas» del bróker, que difieren tras ventas parciales) y que la ganancia mostrada es la **plusvalía latente** (valor − coste).
### Changed
- **Sin toast al iniciar:** la sincronización con la nube al abrir la app ya no muestra el aviso «✓ Sincronizado» (solo avisa si falla). Era molesto en cada arranque.

## [3.26.0] — 2026-06-21
### Fixed — Cash-flow: aviso del bajón ANTES de cobrar
- **El orden importa:** «Próximos cargos» ahora simula el saldo **día a día** durante el resto del mes. Si los fijos se cobran antes de que entre la nómina (último día), avisa del **punto más bajo** aunque a fin de mes cuadres. Ej.: Sabadell 225 € con 359 € de fijos pendientes y nómina el día 30 → muestra «⚠ punto más bajo (día 29): −134 €» y la 🚨 alarma «se queda en −134 € sobre el día 29 (antes de que entre la nómina)».
- La alarma usa ese mínimo (cubre tanto el bajón intra-mes como no llegar a fin de mes). Cargos sin día se asumen al principio (peor caso) y los ingresos sin día al final, para avisar de forma conservadora.

## [3.25.0] — 2026-06-20
### Added — Deuda dinámica · [#2](https://github.com/JuanjoAvila/Mi-Cartera/issues/2)
- **El saldo de cada deuda baja solo cada mes** según lo que amortizas, sin tocarlo a mano. Se calcula proyectando desde un ancla (`asOf`): saldo de hoy = saldo anclado − amortización/mes × meses transcurridos. No muta el dato guardado (no descuadra la sync entre dispositivos); cuando metes el saldo real del banco, se vuelve a anclar solo.
- **Cuota ≠ amortización:** se puede separar lo que **pagas en efectivo** (cuota, lo que usa el cash-flow del Sabadell) de lo que **amortiza el principal** (cuánto baja el saldo). Resuelve el préstamo de mamá: pagas 197 € pero la deuda baja 250 €/mes. Se edita en Fijos → Cuotas de deuda (campo «amortiza/mes»).
- El **patrimonio neto** usa el saldo proyectado, así que sube solo conforme amortizas.

Con esto queda **completo el motor dinámico**: calendario de fijos, día de cobro (pagado/pendiente), cobros a medida, cash-flow de nómina/transferencias, cargos puntuales y deuda dinámica.

## [3.24.0] — 2026-06-20
### Added — Cargos puntuales · [#17](https://github.com/JuanjoAvila/Mi-Cartera/issues/17)
- **Cargos de una sola vez:** nueva tarjeta «Cargos puntuales» (pestaña Fijos) para apuntar un cobro único en un mes/año concreto — imprevistos o amortizaciones. Con importe, mes, año, día y banco.
- Entra en «Próximos cargos» el mes que toca (se tacha al pasar su día, cuenta para disponible y alarma) y **desaparece de la lista cuando pasa el mes** (solo cuenta una vez).
### Changed
- `.claude/` (tooling local de preview/ajustes) añadido a `.gitignore`: deja de aparecer como cambios en cada release.

## [3.23.0] — 2026-06-20
### Added — Cobros a medida + nómina/transferencias a día laborable
- **Importes y días distintos por cobro:** un gasto no mensual puede tener un **calendario a medida** (toggle «Importes/días distintos por cobro» al editar). Resuelve los pagos que NO son mitades exactas: seguro del coche 172,05 + 166,94, o Hacienda 146,14 (30 jun) + 97,42 (5 nov). Cada cobro con su importe y su día.
- **Nómina y transferencias a día laborable:** los movimientos recurrentes pueden fijarse a **último día laborable** (la nómina) o **primer día laborable** (las transferencias automáticas a TR/MyInvestor) en vez de un número de día fijo. Se recalcula solo cada mes. Las transferencias manuales puntuales siguen con día fijo.
### Changed
- **Cancelar al añadir:** los formularios de «añadir gasto fijo» y «añadir ingreso/transferencia» tienen botón **Cancelar** para cerrar la sección sin guardar.

## [3.22.0] — 2026-06-20
### Added — Cash-flow automático: nómina y transferencias · [#18](https://github.com/JuanjoAvila/Mi-Cartera/issues/18)
- **El Sabadell se calcula solo:** nuevo bloque «Ingresos y transferencias» (pestaña Fijos) para definir movimientos recurrentes: la **nómina** que entra y las **transferencias automáticas** que salen (1550 € a Trade Republic, 500 € a MyInvestor). Cada uno con importe, **día** y banco(s).
- **Disponible proyectado a fin de mes:** «Próximos cargos» muestra ahora el cash-flow completo del Sabadell: *hoy + nómina por entrar − transferencias pendientes − fijos pendientes = a fin de mes*. Los movimientos cuyo día ya pasó no se recuentan (ya están en el saldo).
- **Alarma mejorada:** salta si un banco se queda **en negativo a fin de mes** una vez contadas nómina, transferencias y fijos pendientes (antes solo miraba los cargos contra el saldo de hoy).
- Sembrado con tus datos reales: 3333 − 1550 − 500 = 1283 € para fijos. Ajusta los días en «Editar» a cuándo te pasan cada cosa.

## [3.21.0] — 2026-06-20
### Added — Cuotas de deuda editables en Fijos
- **Día y banco por cuota de deuda:** la tarjeta «Cuotas de deuda» (pestaña Fijos) ahora tiene «Editar» como los gastos fijos: se puede fijar el **día de cobro**, el **banco** del que se descuenta y la **cuota mensual**. Así las cuotas se **tachan al pagarse** en «Próximos cargos» y la alarma/disponible las cuentan bien. El saldo pendiente de la deuda se sigue editando en la pestaña Deudas.

## [3.20.0] — 2026-06-20
### Added — Motor dinámico: día de cobro (pagado vs pendiente) · [#1](https://github.com/JuanjoAvila/Mi-Cartera/issues/1)
- **Día de cobro por gasto:** cada gasto fijo puede llevar el **día del mes** (1-31) en que se cobra (en «Añadir» y «Editar»). Los cargos cuyo día **ya pasó** este mes se marcan como **✓ pagado** (tachados) y **no restan** del disponible; los que faltan son **pendientes**.
- **«Próximos cargos» más realista:** el cuadro «te quedarían» y la **🚨 alarma** miran solo lo **pendiente** (el saldo del banco ya refleja lo pagado). Lista separada de «Pendiente» y «Ya pagado este mes», con una etiqueta «día N» en cada cargo.
### Fixed
- **La app ya no se recarga sola al abrir:** el service worker dejaba de forzar la actualización a media sesión (`skipWaiting` + recarga en `controllerchange`). Ahora la versión nueva se descarga en segundo plano y se aplica sola en el siguiente arranque, sin parpadeo.

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
