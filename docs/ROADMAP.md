# Roadmap — Mi Cartera

> Estado a 2026-07-25 · **v4.11.0** (EN EL CANAL `beta`, pendiente de aprobación del usuario) — **el splash existía en el HTML y no lo veía nadie**: estaba dentro de `#root` y `ReactDOM.createRoot()` vacía su contenedor al montar, así que React se lo llevaba por delante (medido: fuera del DOM a los 150 ms); y React/ReactDOM/supabase iban en el `<head>`, bloqueando el parser, así que el navegador no tenía nada que pintar hasta ejecutar ~600 KB — el negro del vídeo. Ahora es hermano de `#root`, los scripts van después, con mínimo de 520 ms en pantalla y dos rAF antes de montar. **Corrección a la 4.10.0:** el patrimonio no venía mal, es una animación que cuenta hasta la cifra final. **Bienes separado de «Tus cuentas»** como bloque ordenable propio. **Perfil: cerrar = abrir al revés** — una sola curva y un solo umbral para los dos sentidos (iban con números distintos y el de abrir pedía casi el triple de arrastre), y candado durante la animación para que un dedo puesto a medias no la corte en seco. E2E 62 → 69. **Lleva mezclada la 4.10.2**: sin ella este bundle no se puede ni descargar. **Segunda vuelta (2026-07-26): la rechazó desde el móvil, 3 ok / 2 fallos, los dos del perfil** — unificar los umbrales dobló el de cerrar (52 → 94 px) y el candado de la animación se activaba también en el rebote y en un toque suelto, dejando la app sorda medio segundo al segundo intento. Curva compartida sí, umbral no (`PROF_TH_OPEN`/`PROF_TH_CLOSE`). Y dos del canal, que estrenaba móvil: el bundle se sellaba con un número distinto del que anunciaba el manifiesto (**la misma beta ofrecida en bucle**, ahora `MC_STAMP_VERSION` + el workflow no publica si no cuadran) y **apagar la beta no devolvía a producción** (`_mcApplyChannelBundle`: cambiar de canal instala en la dirección que sea).
>
> Anterior: 2026-07-25 · **v4.10.2** — publicación MÍNIMA, capítulo 2: **la CSP era solo la mitad**. Los assets de las releases de GitHub **no mandan cabeceras CORS** en ninguno de los dos saltos del redirect (verificado con `curl -H Origin`), así que el `fetch` de la WebView (origen `https://localhost`) los tira igual con la CSP arreglada — mismo síntoma, causa distinta. Ahora el manifiesto lo pide **Android** (`CapacitorHttp`), como el login de MyInvestor. Y `mcFetchManifest` solo cae a estable con un **404**: cualquier otro fallo sale en el toast y en `app_events`, porque disfrazarlo de «no hay nada nuevo» es lo que escondió esto durante semanas. El `bundle.zip` de la beta **nunca se había descargado** (`downloadCount: 0`). Guardián: `tests/updates.test.mjs` ejecuta el trozo real del monolito con `fetch`/`CapacitorHttp` de mentira.
>
> Anterior: 2026-07-25 · **v4.10.1** — publicación MÍNIMA: **el canal beta llevaba roto en silencio**. Los assets de las releases de GitHub redirigen a `release-assets.githubusercontent.com` (antes `objects.githubusercontent.com`) y ese dominio no estaba en `connect-src`, así que el `fetch` moría; la caída a estable de `mcFetchManifest` convertía el fallo en un «✓ estás a la última» con el canal activado y la beta publicada. No podía arreglarse POR beta, porque es lo que impide bajarla. **El resto del trabajo del día (splash que no se veía, bienes separados de cuentas, perfil con una sola curva para abrir y cerrar) está en la rama `beta` = release `beta`, esperando la prueba del dueño.**
>
> Anterior: 2026-07-25 · **v4.10.0** — **el gesto del perfil, ahora con el caso real**: el panel SCROLLEA (su contenido mide ~1.680 px y no cabe en un móvil), y el arrastre medía desde el `touchstart`, así que al llegar arriba saltaba de golpe a la miniatura (medido: 1,000 → 0,122 en un frame) y con el rebote del scroll volvía a pantalla completa — ese ida y vuelta era el parpadeo del vídeo. Además **abrir** se había quedado sin los dos arreglos que sí recibió el cierre (opacidad y radio por frame), porque los dos gestos estaban duplicados; ahora comparten `profileGrab()`. **El CSV de Revolut ya no rechaza el extracto de la cuenta en €** —justo el que hace falta para el coste del oro—: lo confirma, guarda los euros y dice qué falta; los ficheros se pueden soltar de uno en uno. **Splash de entrada** con la marca de la app que espera al primer dato bueno (se acabó ver el patrimonio viejo un segundo). **Cartera ordenable** y **Hogar mudado al perfil**. **Seguridad del servidor**: CORS con lista blanca en las diez funciones, límite de peticiones en `ingest` y `myinvestor-connect`, y el `state` del OAuth caduca a los 30 min y solo vale una vez. **Presupuesto de rendimiento** en `npm test` (987 KB / 278 KB gzip / 3 bloqueantes). E2E 53 → 62.
>
> Anterior: 2026-07-25 · **v4.9.2** — **incidente del APK 32, corregido**: se empaquetó copiando `public/`→`www/` a mano en vez de con `build-www.mjs`, así que salió con `APP_VERSION: "dev"` — y como `_mcNewerVer` hace `parseInt("dev")`→`NaN`, la comparación de versiones daba `false` siempre y **ese móvil no volvía a actualizarse nunca**, sin error visible. Además, reescribir un módulo con `Get-Content|Set-Content` de PowerShell lo leyó como Windows-1252 y corrompió 95 líneas (el «✓» de TR salía como tres símbolos sin sentido). **APK 33 / 4.9.2 la sustituye.** Guardianes: `build-www.mjs` aborta si no sella, `npm run apk:prep` encadena el proceso entero, y `docs-frescura` caza el mojibake.
>
> Anterior: 2026-07-25 · **v4.9.1** — **los brókers los elige el usuario** (chips «¿Qué brókers usas?»; antes se pintaba el login de TR/MyInvestor/Revolut aunque no tuvieras cuenta) y **sus tarjetas se pliegan** con el mismo acordeón que los bancos (`bkBrand()` compartido). **Cierre del perfil sin superponer dos pantallas**: se quitó el fundido de opacidad del arrastre —el panel ocupa la pantalla entera, así que fundirlo dejaba ver perfil y resumen a la vez— y ahora escala hacia el avatar, opaco, como la apertura en reversa. **`docs-frescura` vigila que no quede código publicable sin subir `VERSION`**, que fue el fallo del día: todo desplegado en Pages con la versión intacta y el móvil sin enterarse. **APK 32 / 4.9.0 publicada** (fix de sesión de TR + token de ingest en cabecera). E2E 49 → 53.
>
> Anterior: 2026-07-25 · **v4.9.0** — **Trade Republic en frío CERRADO de verdad** (capítulo 3, verificado por el usuario matando la app): la causa era `snapshotCookies` quedándose con la copia CADUCADA de `tr_refresh` —sale dos veces en la cabecera, con dos paths— y re-guardándola en cada vuelta, así que una vez estropeada no se recuperaba nunca (`put` → `putIfAbsent`); además la WebView se aparca en `about:blank` al pasar a segundo plano para que la SPA de TR no rote la sesión a nuestras espaldas, y los errores llevan pegado el estado del jar para diagnosticar sin cable. **Coste del oro de Revolut automático** cruzando el extracto de metales con el de la cuenta en € por marca de tiempo (verificado: 0,258218 oz / 1.000 € / 3.872,70 €/oz). **«Mis bancos» en acordeón**. **Gesto de cerrar el perfil** sin repintar la pantalla entera por frame. **Seguridad**: token de ingest en cabecera; `app_events` recupera los grants de `service_role` (la telemetría del ingest llevaba dos semanas muerta en silencio). **`scripts/errores.mjs`** para leer los errores del móvil desde la consola. **MyInvestor**: diagnóstico cerrado, el reCAPTCHA rechaza el token por dominio → hace falta WebView nativa. E2E 46 → 49.
>
> Anterior: 2026-07-24 · **v4.8.0** — **rendimiento**: el estado se guarda PARTIDO (los gastos en su propia clave, solo se reescriben cuando cambian) → volver a primer plano pasa de escribir 477 KB (2.000 gastos) / 1.912 KB (8.000) a **1 KB constante**, que es la causa real del «cuanto más la uso, más lenta va»; `totals` con dependencias reales, `parseDate` cacheado, filtrado de Gastos en una pasada y filas en `React.memo`. **Concepto de los movimientos** (mensaje del bizum / descripción del banco, editable y con relleno retroactivo al sincronizar). **Bancos caídos**: noti + deep-link al panel con el banco resaltado. **Entorno de pruebas** del dueño: banco de pruebas aislado + canal beta por release `beta`. **Seguridad**: CSP, token de ingest de 256 bits, comparación en tiempo constante. E2E de 10 → 34.
>
> Anterior: 2026-07-22 · **v4.7.0** — notis sin duplicados (gasto tocho y recibo de la víspera, éste además con importe exacto), roles de cuenta excluyentes y en el subtítulo del banco, brókers con animación + orden configurable, deudas con «Quedan n/tot cuotas» y «acabas en» uniformes, badge de reCAPTCHA oculto con errores diagnosticables. El fix del gasto tocho es Java → **APK 31 publicado**. **v4.6.4:** MyInvestor: intento OTA de resolver el reCAPTCHA en la WebView (pegando el site key). **v4.6.3:** «Gasto diario» multi-banco en el chip de siempre (quitado el duplicado). **v4.6.2:** barra inferior pegada abajo con letra pequeña/enorme, widget re-empuja al volver a la app. (4.6.1:) letra pequeña, Hogar movido a Cartera, animaciones de temporada con profundidad/parallax estilo Revolut. (Base:) **v4.6.0** — temáticas de temporada, accesibilidad (letra grande a nivel body sin descuadres, reducir animaciones, contraste), metas con teclado propio + banco, más monedas + comparativa, varios bancos de gasto diario, selección de Cartera persistida, Ajustes reordenados y encogidos al abrir, widget con «lo que te puedes permitir» (APK 30).

## Listo para uso diario

Multi-cuenta, ingest TR, OTA/APK, gamificación, onboarding, inversiones, deudas, Open Banking, MyInvestor, RGPD mínimo, tests unit + E2E, código modular, **Hogar Fase 1+2** (+ fix RLS `0014`), informe mensual, fin de mes en paz, presupuesto por categoría, recibos gordos, widget Android, export JSON + informe imagen, **multi-banco en Gastos** + filtro por banco, tutorial/roles claros, **FX multi-divisa (USD/GBP/CHF + costEur)**, **sugerencia de categoría (KW + IA opcional)**, **diccionario ampliado de comercios** (impuestos/multas, **Pádel**), **Sentry en prod**, perfil pull-down, sheets sin velo negro, brókers en tarjetas planas, **APK nueva se ofrece sola** (noti + instalador al abrir), **OB a demanda** (botón en Cartera), **gráfico de Cartera multiseleccionable**, **editor de cuentas v4** (nombre+rol, saldo bloqueado si viene del banco), **bienes editables**, **monedas £/CHF**, **huella + logout en Ajustes**, **Hogar accesible desde el perfil** (4.10.0; antes en Cartera), **bloques de Cartera ordenables**, **«¿Me lo puedo permitir?» a plazos** (cuota + crear deuda), **banco elegible en gastos manuales**, **Sincronizar de Cartera con TR/MI**, **temáticas de temporada** (Mundial/Halloween/Navidad/Verano/Invierno/Pascua con animación ambiental), **accesibilidad** (letra grande a nivel body sin descuadres, reducir animaciones, contraste), **aportar a metas con teclado propio + banco**, **15 monedas + comparativa**, **varios bancos de gasto diario**, **selección de Cartera persistida**, **Ajustes reordenados/encogidos**, **widget con «lo que te puedes permitir»**.

## Versión actual (alineación)

| Qué | Valor |
|-----|--------|
| Web / OTA (`VERSION`) | **4.11.0** (en `beta`, pendiente de aprobación; producción va por la 4.10.2) |
| APK (`versionName` / `versionCode`) | **4.9.2** / **33** publicada (release GitHub `v4.9.2`). La 4.10.0 **no toca nativo**, así que llega por OTA y el APK 33 se queda como está — es lo normal, no un descuadre. ⚠ La **32 quedó inservible** (sin sellar → nunca se actualiza) y su release está retirada. |
| `public/apk.json` | **33** / 4.9.2 → `Mi-Cartera-4.9.2.apk` |

## Pendiente / limitaciones conocidas

| Tema | Notas |
|------|--------|
| **MyInvestor reCAPTCHA** | **4.6.4:** intento OTA — la app carga el reCAPTCHA de Google bajo demanda con el **site key de MyInvestor** (que el usuario pega en la tarjeta MI; su web va tras Incapsula y no se puede extraer desde el CI), ejecuta la acción, y reintenta el login con `X-Recaptcha-Token`. **Riesgo:** reCAPTCHA v3 suele atar el token al dominio registrado (`myinvestor.es`); si MI valida el origen, rechazará el token de nuestra WebView → entonces el único camino es una **WebView nativa** que cargue la web de MI (APK). El intento OTA se prueba en 1 min: si el token cuela, resuelto sin tocar nativo. Palancas previas: `x-myinvestor-app`=3.150.0, mensaje humano, `captchaToken` en cabeceras (plumbing listo). |
| **Open Banking: sync solo a demanda** | Desde 4.1.0 NO hay auto-sync al abrir/volver (caducaba consentimientos de Caixa/Sabadell por «uso robótico»). Syncs vivos: botón «↻ Sincronizar bancos» en Cartera, «Actualizar» en Mis bancos, tras autorizar (`?bank=ok`), bootstrap 1ª vez, y noti del banco (ajuste). Si aun así caducan, el problema es otro (límite 90 días PSD2 = normal). |
| **Widget «Puedes gastar»** | El código va en el APK 30 (verificado: strings `Puedes gastar`/`te quedan` en `classes.dex`). Si en el móvil sigue saliendo solo el gasto: el widget se alimenta de `updateWidget` (app → plugin) y MIUI/HyperOS a veces no lo re-pinta. 4.6.2 re-empuja al volver a primer plano; si aún falla, **quitar y re-añadir el widget**. No es bug de código OTA. |
| **Play Store** | Formulario Data safety + justificar NotificationListener |
| **Pulido de diseño** | Claude Design (no tocar aquí a ciegas) |
| **OPENAI_API_KEY** | Opcional en Supabase Secrets → Edge `categorize`. Ver [CATEGORIZE.md](CATEGORIZE.md) |

## Review externa (ChatGPT, 2026-07-25) — qué falta de verdad

El usuario pidió una review del repo a ChatGPT y trajo el veredicto (arquitectura 9, organización
8,5, seguridad 8,5, rendimiento 8, CI/CD 9,5, tests 9). **La mitad de lo que propone ya está hecho**
y darlo por pendiente sería trabajar dos veces, así que la tabla separa las dos cosas. Lo que ya
existe se deja anotado con su prueba: si mañana alguien vuelve a proponerlo, aquí está la respuesta.

| Propuesta | Estado real | Qué falta (tarea) |
|-----------|-------------|-------------------|
| Beta cerrada con 10-20 amigos | **A medias.** Hay canal beta + panel de revisión (`docs/TESTING.md`), pero es de **un solo móvil**: el suyo. | Que la beta la puedan recibir otros: APK firmado repartible, alta de probador sin ser `is_admin`, y que los veredictos de varios convivan en el panel. |
| Feedback dentro de la app | **Ya está.** Ajustes → App → «Enviar sugerencia» (4.1.0) + `betaReport` del panel de beta. | — |
| Crash reporting | **Ya está.** Sentry en producción ([SENTRY.md](SENTRY.md)) + `app_events` propio, con `window.onerror` y `unhandledrejection` enganchados. | — |
| Analytics de uso | **No.** `app_events` solo guarda errores y un `ping` al abrir. | Saber **qué pantallas se usan** (no quién): contador por pestaña/acción, agregado y sin datos personales. Decidir antes si compensa: hoy los usuarios son 3. |
| Rate limiting | **A medias.** Migración `0019` + `_shared/ratelimit.ts`, aplicado en `ingest` y `myinvestor-connect` (4.10.0). | Extenderlo al resto de funciones (`prices`, `categorize`, `bank-*`) o dejar por escrito por qué no hace falta. |
| Validar TODO lo que entra | **Sin auditar.** | Pasada por las diez Edge Functions: tipos, tamaños y rangos de cada campo del `body`, con test que mande basura y espere un 400 (no un 500). |
| Logs sin información sensible | **A medias.** `guard-privacy` vigila el cliente. | Auditar qué acaba en `app_events` y en Sentry (mensajes de error con importes, correos o IBAN) y limpiarlo en origen. |
| Virtualización de listas | **Ya está.** La lista pagina — `e2e/rendimiento.spec.mjs`: 3.000 movimientos no son 3.000 nodos. | — |
| Memoización / no repetir trabajo | **Ya está** (4.8.0): estado partido, `totals` con dependencias reales, `parseDate` cacheado, filas en `React.memo`, presupuesto de rendimiento en `npm test`. | — |
| Lógica financiera independiente de React | **A medias.** La lógica pura se extrae y se testea sin React (`scripts/load-pure-logic.mjs`, 15 suites), pero convive en el mismo fichero que la UI. | Separar de verdad los servicios (cartera, movimientos, dividendos, precios) a módulos sin un solo `React.createElement`, y que la UI solo los llame. Sin prisa: es refactor, no arreglo. |
| Módulos por dominio, no por número | **No.** `src/modules/` va numerado por orden de ensamblado (`00-core`, `06-sync-brokers`, `10-app-components`…). | Reagrupar por dominio cuando duela — hoy 15 ficheros se siguen; el riesgo real es `10`/`11`, que son los que crecen sin parar. |
| Importadores PDF/CSV | **CSV sí** (Revolut, con parsers y golden tests). **PDF no.** | Importar extractos en PDF (los bancos que no dan CSV). |
| Sistema de backups | **A medias.** Export JSON a mano + estado en Supabase. | Copia automática periódica y **restaurar probado de verdad** (un backup que no se ha restaurado nunca no es un backup). |
| Sincronización bancaria con adapters | **A medias.** Cada banco/bróker tiene su módulo, pero sin interfaz común. | Interfaz única (conectar / sincronizar / desconectar / estado) para que añadir un banco no toque la UI. Enlaza con Enable Banking. |
| Play Store, cobrar, gestor fiscal | Ya estaba en el plan (ver «Solo si lo pides» y la nota de freemium). | Antes de cobrar un euro: **hablar con un gestor**. La consulta es barata comparada con regularizar tarde. |
| Más tests de lógica financiera | Hay 15 suites unitarias + 67 e2e. | Seguir sumando al tocar dinero: es la regla de la casa, no una tarea con final. |

## Solo si lo pides

| Tema | Notas |
|------|--------|
| **Play Store** | Cuando quieras publicar |
| **Pulido visual gordo** | SPEC-v4 / handoff en `docs/design/` |
| **Logos de banco reales** | Idea 2026-07-18: sustituir el monograma (Sb/Cx…) por el logo del banco. Regla de la casa: cero CDNs → habría que auto-hospedar los ~8 logos habituales en `public/vendor/banks/` (los de Enable Banking vienen de fuera y solo se usan en el picker). |
| **Freemium / suscripciones** | Idea 2026-07-18 (medio en broma, medio en serio): gratis = cuentas manuales (importe editable a mano); plan de pago = sync bancaria automática. El nombre editable en ambos. La 4.1.0 ya deja la semántica lista (manual = saldo editable; conectada = solo nombre/rol). Para monetizar de verdad faltan pasarela de pago + entitlements en Supabase — se diseña cuando lo pidas, no se mete de tapadillo. |

## Widget Android (ya existe)

En el móvil: **mantener pulsado en el escritorio → Widgets → Mi Cartera**.  
Muestra gasto del mes vs presupuesto + saldo de la cuenta diaria.

## Export / informe

| Qué | Dónde | Estado |
|-----|--------|--------|
| Backup JSON | Ajustes → Copia de seguridad → Exportar | ✅ |
| Informe del mes (imagen WhatsApp) | Ajustes → Avanzado · popup día 1 · si el share de la WebView falla, descarga el PNG (4.1.0) | ✅ |
| Hogar y gastos compartidos | **Perfil → «Tu gente»** (toca tu avatar en Inicio). Movido aquí en 4.10.0 porque al final de Cartera no lo veía nadie; antes en Cartera (4.6.1) y antes aún en Ajustes → Conexiones | ✅ |
| Sugerencias / errores del usuario | Ajustes → App → «Enviar sugerencia» (desde 4.1.0; antes dentro de Novedades) | ✅ |

## Mantenimiento habitual

1. Bugs en uso (feedback real)  
2. Features pedidas  
3. **Cada release:** alinear `VERSION` + `package.json` + `CHANGELOG` + `RELEASE_NOTES` + APK (`build.gradle` + `apk.json` + release GitHub) + `docs/ROADMAP.md`  
4. Preparación Play Store (cuando quieras)

Ver [CHANGELOG.md](../CHANGELOG.md) · [ARQUITECTURA.md](ARQUITECTURA.md) · [TESTING.md](TESTING.md) · [SENTRY.md](SENTRY.md) · [HOGAR.md](HOGAR.md) · [CATEGORIZE.md](CATEGORIZE.md) · [AGENTS.md](../AGENTS.md)
