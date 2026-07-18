# Roadmap — Mi Cartera

> Estado a 2026-07-18 · **v4.1.0** — Open Banking solo a demanda (botón «Sincronizar bancos» en Cartera; el auto-sync al abrir caducaba los consentimientos), gráfico de Cartera multiseleccionable, editor de cuentas v4 completo (nombre+rol+bienes; el rol se había quedado inaccesible), Hogar/Compartido de vuelta (Ajustes → Conexiones), huella + cerrar sesión de vuelta en Ajustes, monedas £/CHF, sugerencias con pantalla propia, `useUpdates()` (fin del spaghetti de updates en App) y nav inferior flotante sin bloque al esconderse.

## Listo para uso diario

Multi-cuenta, ingest TR, OTA/APK, gamificación, onboarding, inversiones, deudas, Open Banking, MyInvestor, RGPD mínimo, tests unit + E2E, código modular, **Hogar Fase 1+2** (+ fix RLS `0014`), informe mensual, fin de mes en paz, presupuesto por categoría, recibos gordos, widget Android, export JSON + informe imagen, **multi-banco en Gastos** + filtro por banco, tutorial/roles claros, **FX multi-divisa (USD/GBP/CHF + costEur)**, **sugerencia de categoría (KW + IA opcional)**, **diccionario ampliado de comercios** (impuestos/multas, **Pádel**), **Sentry en prod**, perfil pull-down, sheets sin velo negro, brókers en tarjetas planas, **APK nueva se ofrece sola** (noti + instalador al abrir).

## Versión actual (alineación)

| Qué | Valor |
|-----|--------|
| Web / OTA (`VERSION`) | **4.1.0** |
| APK (`versionName` / `versionCode`) | **4.0.12** / **28** — assembleRelease compilado e instalado en el móvil del usuario (adb, 2026-07-17) con el bundle 4.0.14 horneado. Los cambios de 4.0.15 y 4.1.0 son OTA (web + Edge), sin cambios nativos. Falta subir el APK a un release de GitHub + `apk.json` si se quiere OTA de APK. |
| `public/apk.json` | debe coincidir con el release publicado |

## Pendiente / limitaciones conocidas

| Tema | Notas |
|------|--------|
| **MyInvestor reCAPTCHA** | Mitigado desde 4.0.12: el login sale del MÓVIL (`CapacitorHttp`, IP residencial) en vez de la Edge (IP datacenter que dispara SECURITY_001). Requiere el bundle ≥4.0.12 en el dispositivo — el APK 28 ya lo hornea. Si aun desde el móvil saliera captcha (raro), es su anti-bot: reutilizar `device_id`, esperar y reintentar. Falta confirmación end-to-end con el login real del usuario. |
| **Play Store** | Formulario Data safety + justificar NotificationListener |
| **Pulido de diseño** | Claude Design (no tocar aquí a ciegas) |
| **OPENAI_API_KEY** | Opcional en Supabase Secrets → Edge `categorize`. Ver [CATEGORIZE.md](CATEGORIZE.md) |

## Solo si lo pides

| Tema | Notas |
|------|--------|
| **Play Store** | Cuando quieras publicar |
| **Pulido visual gordo** | SPEC-v4 / handoff en `docs/design/` |

## Widget Android (ya existe)

En el móvil: **mantener pulsado en el escritorio → Widgets → Mi Cartera**.  
Muestra gasto del mes vs presupuesto + saldo de la cuenta diaria.

## Export / informe

| Qué | Dónde | Estado |
|-----|--------|--------|
| Backup JSON | Ajustes → Copia de seguridad → Exportar | ✅ |
| Informe del mes (imagen WhatsApp) | Ajustes → Personalización · popup día 1 | ✅ |

## Mantenimiento habitual

1. Bugs en uso (feedback real)  
2. Features pedidas  
3. **Cada release:** alinear `VERSION` + `package.json` + `CHANGELOG` + `RELEASE_NOTES` + APK (`build.gradle` + `apk.json` + release GitHub) + `docs/ROADMAP.md`  
4. Preparación Play Store (cuando quieras)

Ver [CHANGELOG.md](../CHANGELOG.md) · [ARQUITECTURA.md](ARQUITECTURA.md) · [TESTING.md](TESTING.md) · [SENTRY.md](SENTRY.md) · [HOGAR.md](HOGAR.md) · [CATEGORIZE.md](CATEGORIZE.md) · [AGENTS.md](../AGENTS.md)
