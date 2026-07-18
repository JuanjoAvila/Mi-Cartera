# Roadmap — Mi Cartera

> Estado a 2026-07-18 · **v4.2.0** — «¿Me lo puedo permitir?» también A PLAZOS (cuota, impacto en fijos, margen mensual y crear la deuda de un toque), banco elegible en gastos manuales (+ y ficha; viaja en `source` como `manual:<ent>`), Sincronizar de Cartera incluye TR + MyInvestor, fix del alta de Hogar (**pegar migración 0015 en Supabase**), entrada de Ajustes sin blur/scale raros, «Ver más» del Inicio aterriza al principio, cartelito de Mi ciclo con aire, editar Bienes sin nombres partidos, textos de bancos a dieta y persistencia local debounced (menos micro-tirones).

## Listo para uso diario

Multi-cuenta, ingest TR, OTA/APK, gamificación, onboarding, inversiones, deudas, Open Banking, MyInvestor, RGPD mínimo, tests unit + E2E, código modular, **Hogar Fase 1+2** (+ fix RLS `0014`), informe mensual, fin de mes en paz, presupuesto por categoría, recibos gordos, widget Android, export JSON + informe imagen, **multi-banco en Gastos** + filtro por banco, tutorial/roles claros, **FX multi-divisa (USD/GBP/CHF + costEur)**, **sugerencia de categoría (KW + IA opcional)**, **diccionario ampliado de comercios** (impuestos/multas, **Pádel**), **Sentry en prod**, perfil pull-down, sheets sin velo negro, brókers en tarjetas planas, **APK nueva se ofrece sola** (noti + instalador al abrir), **OB a demanda** (botón en Cartera), **gráfico de Cartera multiseleccionable**, **editor de cuentas v4** (nombre+rol, saldo bloqueado si viene del banco), **bienes editables**, **monedas £/CHF**, **huella + logout en Ajustes**, **Hogar accesible desde Ajustes**, **«¿Me lo puedo permitir?» a plazos** (cuota + crear deuda), **banco elegible en gastos manuales**, **Sincronizar de Cartera con TR/MI**.

## Versión actual (alineación)

| Qué | Valor |
|-----|--------|
| Web / OTA (`VERSION`) | **4.2.0** |
| APK (`versionName` / `versionCode`) | **4.0.12** / **28** — assembleRelease compilado e instalado en el móvil del usuario (adb, 2026-07-17) con el bundle 4.0.14 horneado. Los cambios de 4.0.15 → 4.2.0 son OTA (web + Edge + SQL), sin cambios nativos. Falta subir el APK a un release de GitHub + `apk.json` si se quiere OTA de APK. |
| `public/apk.json` | debe coincidir con el release publicado |

## Pendiente / limitaciones conocidas

| Tema | Notas |
|------|--------|
| **MyInvestor reCAPTCHA** | Mitigado desde 4.0.12: el login sale del MÓVIL (`CapacitorHttp`, IP residencial) en vez de la Edge (IP datacenter que dispara SECURITY_001). Requiere el bundle ≥4.0.12 en el dispositivo — el APK 28 ya lo hornea. El usuario reportó captcha de nuevo (2026-07-18) → la 4.1.0 apunta a `app_events` **por qué vía salió el login**. **Sigue pendiente (2026-07-18 tarde):** las fotos de Actividad que mandó no incluían el error de MI — falta el TEXTO exacto del toast/error de MyInvestor (o un pantallazo de Actividad tras intentar conectar) para saber si es captcha vía Edge, fallo del login nativo u otra cosa. La 4.2.0 añade además el sync de MI al botón de Cartera, que hará el fallo más visible/reproducible. |
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
