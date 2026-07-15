# Roadmap — Mi Cartera

Tablero de tareas en GitHub:
- **Project (Kanban):** https://github.com/users/JuanjoAvila/projects/1
- **Issues:** https://github.com/JuanjoAvila/Mi-Cartera/issues

> Estado a 2026-07-15. Tras v3.105.0 (dashboard inversiones #6).

## 🔴 Prioridad alta (calidad / escala)

| # | Tarea | Área | Estado |
|---|-------|------|--------|
| — | Tests golden CSV + crypto + CI Deno | calidad | ✅ v3.102 |
| — | Cifrado tokens MyInvestor/banco en BD | seguridad | ✅ v3.102 |
| — | RGPD: privacidad + borrado cuenta | legal | ✅ v3.102 |
| — | Sync app_state sin pisar otro dispositivo | infra | ✅ v3.102 |
| — | Tabla `profiles` / admin sin email en cliente | infra | ✅ v3.102 |
| [#1](https://github.com/JuanjoAvila/Mi-Cartera/issues/1) | Motor dinámico: gastos fijos con periodicidad | motor | ✅ hecho |
| [#2](https://github.com/JuanjoAvila/Mi-Cartera/issues/2) | Motor dinámico: deuda que resta su cuota cada mes | motor | ✅ v3.103 |
| [#3](https://github.com/JuanjoAvila/Mi-Cartera/issues/3) | Onboarding: arranque limpio para usuarios nuevos | onboarding | ✅ v3.104 |

## 🟡 Prioridad media

| # | Tarea | Área | Estado |
|---|-------|------|--------|
| [#5](https://github.com/JuanjoAvila/Mi-Cartera/issues/5) | Multi-usuario en función ingest (verify_jwt + JWT) | infra |
| [#6](https://github.com/JuanjoAvila/Mi-Cartera/issues/6) | ~~Dashboard inversiones más rico~~ | inversiones | ✅ v3.105 |
| [#4](https://github.com/JuanjoAvila/Mi-Cartera/issues/4) | ~~Temas de color~~ | ui | ✅ hecho |
| [#19](https://github.com/JuanjoAvila/Mi-Cartera/issues/19) | ~~Round-up TR en efectivo~~ | inversiones | ✅ hecho |
| — | Tests reconcile / bank engine | calidad | ✅ v3.103 |
| — | Modularización fuente (concat, sin partir artefacto) | arquitectura |

## 🟢 Prioridad baja

| # | Tarea | Área |
|---|-------|------|
| [#7](https://github.com/JuanjoAvila/Mi-Cartera/issues/7) | Widgets reordenables del Resumen | ui |
| [#8](https://github.com/JuanjoAvila/Mi-Cartera/issues/8) | Android: empaquetado APK con Capacitor | android |
| [#14](https://github.com/JuanjoAvila/Mi-Cartera/issues/14) | Idiomas: inglés y catalán | ui |
| [#15](https://github.com/JuanjoAvila/Mi-Cartera/issues/15) | Retos de ahorro con recompensa | ui |
| — | Play Store + monetización | producto |

---

## ✅ Ya hecho (reciente)

- **v3.105.0:** dashboard inversiones (#6): evolución valor+coste, cambio % del periodo, snapshot al actualizar precios.
- **v3.104.0:** onboarding 4 pasos (#3), tarjeta primeros pasos, sync nube salta wizard, tests onboarding.
- **v3.103.0:** motor de deudas dinámico (#2), re-cifrado tokens legacy, tests reconcile/bank/motor-debt.
- **v3.101.0:** tests automáticos (syntax, lógica pura, ingest Deno), guard privacidad CI, DATA sintética en repo, categorías ingest alineadas.
- **Fase 0–1 Supabase:** auth, sync, ingest MacroDroid, Open Banking, MyInvestor, inversiones TR/MI, motor gastos fijos.

_Para detalle por versión ver [CHANGELOG.md](../CHANGELOG.md)._
