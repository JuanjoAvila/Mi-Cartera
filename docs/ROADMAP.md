# Roadmap — Mi Cartera

> Estado a 2026-07-16 · **v3.110.0** — producto en modo mantenimiento evolutivo.

## Listo para uso diario

Multi-cuenta, ingest TR, OTA/APK, gamificación, onboarding, inversiones, deudas, Open Banking, MyInvestor, RGPD mínimo, tests unit + E2E, código modular, **Hogar Fase 1+2**, informe mensual día 1 (imagen WhatsApp), fin de mes en paz, presupuesto por categoría, recibos gordos, **widget Android**, export JSON + informe imagen.

## Solo si lo pides

| Tema | Notas |
|------|--------|
| **Play Store** | Formulario Data safety + justificar NotificationListener |
| **Pulido de diseño** | Claude Design (no tocar aquí a ciegas) |
| **Sentry en prod** | Secret `SENTRY_DSN` + CI ya cableado — ver [SENTRY.md](SENTRY.md) |

## Widget Android (ya existe)

En el móvil: **mantener pulsado en el escritorio → Widgets → Mi Cartera**.  
Muestra gasto del mes vs presupuesto + saldo de la cuenta diaria. Se actualiza al abrir la app y al apuntar gastos de TR.

## Export / informe

| Qué | Dónde | Estado |
|-----|--------|--------|
| Backup JSON | Ajustes → Copia de seguridad → Exportar | ✅ |
| Informe del mes (imagen WhatsApp) | Ajustes → Personalización → Informe del mes · popup día 1 | ✅ |

## Mantenimiento habitual

1. Bugs en uso  
2. Features nuevas / feedback  
3. Preparación Play Store (cuando quieras)

Ver [CHANGELOG.md](../CHANGELOG.md) · [TESTING.md](TESTING.md) · [SENTRY.md](SENTRY.md) · [HOGAR.md](HOGAR.md)
