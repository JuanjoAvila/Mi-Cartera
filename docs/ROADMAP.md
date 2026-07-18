# Roadmap — Mi Cartera

> Estado a 2026-07-18 · **v4.4.0** — Reconexión a UN toque (banner en Cartera cuando un banco OB caduca → botón directo a autorizar; TR muerto → botón que abre Mis bancos con el teléfono puesto) y avisos con la app CERRADA: vísperas de recibos vía worker nativo (**APK 29 publicado**) y umbrales de presupuesto 50/95 añadidos a la Edge `ingest` (ya activos vía TR-notis). Antes el mismo día: 4.3.0 (avisos in-app 50/80/95/100% + víspera, deudas sin plazo con fecha estimada, tarjeta 🎉 última cuota, «Más…» cerrable, informe con ubicación, Ajustes animado, MI 3.150.0) y 4.2.0 (permitirse a plazos, banco por apunte, Hogar arreglado con 0015 aplicada por CI, sync total de Cartera, persistencia debounced).

## Listo para uso diario

Multi-cuenta, ingest TR, OTA/APK, gamificación, onboarding, inversiones, deudas, Open Banking, MyInvestor, RGPD mínimo, tests unit + E2E, código modular, **Hogar Fase 1+2** (+ fix RLS `0014`), informe mensual, fin de mes en paz, presupuesto por categoría, recibos gordos, widget Android, export JSON + informe imagen, **multi-banco en Gastos** + filtro por banco, tutorial/roles claros, **FX multi-divisa (USD/GBP/CHF + costEur)**, **sugerencia de categoría (KW + IA opcional)**, **diccionario ampliado de comercios** (impuestos/multas, **Pádel**), **Sentry en prod**, perfil pull-down, sheets sin velo negro, brókers en tarjetas planas, **APK nueva se ofrece sola** (noti + instalador al abrir), **OB a demanda** (botón en Cartera), **gráfico de Cartera multiseleccionable**, **editor de cuentas v4** (nombre+rol, saldo bloqueado si viene del banco), **bienes editables**, **monedas £/CHF**, **huella + logout en Ajustes**, **Hogar accesible desde Ajustes**, **«¿Me lo puedo permitir?» a plazos** (cuota + crear deuda), **banco elegible en gastos manuales**, **Sincronizar de Cartera con TR/MI**.

## Versión actual (alineación)

| Qué | Valor |
|-----|--------|
| Web / OTA (`VERSION`) | **4.4.0** |
| APK (`versionName` / `versionCode`) | **4.4.0** / **29** — release GitHub `v4.4.0` + `apk.json` publicados |
| `public/apk.json` | **29** / 4.4.0 → `Mi-Cartera-4.4.0.apk` |

## Pendiente / limitaciones conocidas

| Tema | Notas |
|------|--------|
| **MyInvestor reCAPTCHA** | CONFIRMADO con foto (2026-07-18): «Captcha required» salta TAMBIÉN por la vía del móvil (IP residencial, bundle 4.2.0). La 4.3.0 prueba la palanca documentada: `x-myinvestor-app` sube a 3.150.0 (cliente + Edge) — el anti-bot puntúa peor a clientes con versión vieja — y el error se explica en humano (esperar horas, no insistir). **Si tras unas horas y con la 4.3.0 sigue saliendo captcha, el siguiente escalón es resolver el reCAPTCHA de verdad en una WebView nativa (cambio de APK, no OTA) — decidir si compensa.** |
| **Open Banking: sync solo a demanda** | Desde 4.1.0 NO hay auto-sync al abrir/volver (caducaba consentimientos de Caixa/Sabadell por «uso robótico»). Syncs vivos: botón «↻ Sincronizar bancos» en Cartera, «Actualizar» en Mis bancos, tras autorizar (`?bank=ok`), bootstrap 1ª vez, y noti del banco (ajuste). Si aun así caducan, el problema es otro (límite 90 días PSD2 = normal). |
| **Play Store** | Formulario Data safety + justificar NotificationListener |
| **Pulido de diseño** | Claude Design (no tocar aquí a ciegas) |
| **OPENAI_API_KEY** | Opcional en Supabase Secrets → Edge `categorize`. Ver [CATEGORIZE.md](CATEGORIZE.md) |

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
| Hogar y gastos compartidos | Ajustes → Conexiones → «Hogar y gastos compartidos» (desde 4.1.0; antes tab Compartido) | ✅ |
| Sugerencias / errores del usuario | Ajustes → App → «Enviar sugerencia» (desde 4.1.0; antes dentro de Novedades) | ✅ |

## Mantenimiento habitual

1. Bugs en uso (feedback real)  
2. Features pedidas  
3. **Cada release:** alinear `VERSION` + `package.json` + `CHANGELOG` + `RELEASE_NOTES` + APK (`build.gradle` + `apk.json` + release GitHub) + `docs/ROADMAP.md`  
4. Preparación Play Store (cuando quieras)

Ver [CHANGELOG.md](../CHANGELOG.md) · [ARQUITECTURA.md](ARQUITECTURA.md) · [TESTING.md](TESTING.md) · [SENTRY.md](SENTRY.md) · [HOGAR.md](HOGAR.md) · [CATEGORIZE.md](CATEGORIZE.md) · [AGENTS.md](../AGENTS.md)
