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

## [3.79.0] — 2026-07-05
### Bug del Bizum arreglado + huella nativa + widget + notificaciones de verdad (APK 4.0.0-alpha2)
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
