# Roadmap — Mi Cartera

Tablero de tareas en GitHub:
- **Project (Kanban):** https://github.com/users/JuanjoAvila/projects/1
- **Issues:** https://github.com/JuanjoAvila/Mi-Cartera/issues

> Estado a 2026-06-20. Tras completar Fase 0 + Fase 1 (Supabase) y el bloque de Inversiones (v3.17.0).

## 🔴 Prioridad alta

| # | Tarea | Área |
|---|-------|------|
| [#1](https://github.com/JuanjoAvila/Mi-Cartera/issues/1) | Motor dinámico: gastos fijos con periodicidad (auto-descuento del líquido Sabadell) | motor |
| [#2](https://github.com/JuanjoAvila/Mi-Cartera/issues/2) | Motor dinámico: deuda que resta su cuota cada mes | motor |
| [#3](https://github.com/JuanjoAvila/Mi-Cartera/issues/3) | Onboarding: arranque limpio para usuarios nuevos | onboarding |

## 🟡 Prioridad media

| # | Tarea | Área |
|---|-------|------|
| [#4](https://github.com/JuanjoAvila/Mi-Cartera/issues/4) | Temas de color (verde / oscuro / claro) | ui |
| [#5](https://github.com/JuanjoAvila/Mi-Cartera/issues/5) | Multi-usuario en función ingest (verify_jwt + JWT) | infra |
| [#6](https://github.com/JuanjoAvila/Mi-Cartera/issues/6) | Dashboard inversiones más rico: rendimiento por posición + evolución | inversiones |

## 🟢 Prioridad baja

| # | Tarea | Área |
|---|-------|------|
| [#7](https://github.com/JuanjoAvila/Mi-Cartera/issues/7) | Widgets reordenables del Resumen (drag/add/remove) | ui |
| [#8](https://github.com/JuanjoAvila/Mi-Cartera/issues/8) | Android: empaquetado APK con Capacitor | android |
| [#9](https://github.com/JuanjoAvila/Mi-Cartera/issues/9) | Regenerar INGEST_TOKEN | infra |
| [#10](https://github.com/JuanjoAvila/Mi-Cartera/issues/10) | Precios manuales: fondo MyInvestor y Meta TR | inversiones |
| [#14](https://github.com/JuanjoAvila/Mi-Cartera/issues/14) | Idiomas: inglés y catalán | ui |
| [#15](https://github.com/JuanjoAvila/Mi-Cartera/issues/15) | Retos de ahorro con recompensa | ui |
| [#16](https://github.com/JuanjoAvila/Mi-Cartera/issues/16) | Color de la deuda igual que su barra | ui |

## 💬 Feedback de amigos (nuevas, media)

| # | Tarea | Área |
|---|-------|------|
| [#11](https://github.com/JuanjoAvila/Mi-Cartera/issues/11) | Financiación con pagos grandes + amortización (coche) | motor |
| [#12](https://github.com/JuanjoAvila/Mi-Cartera/issues/12) | Editar el presupuesto desde el Resumen (lápiz) | ui |
| [#13](https://github.com/JuanjoAvila/Mi-Cartera/issues/13) | Gastos variables: editar, borrar y añadir ingresos | ui |

---

## ✅ Ya hecho

- **Fase 0:** cajón de ajustes con gesto (estilo Twitter/Revolut), gasto manual a tabla `expenses`, filtro de categorías multiselección, paginación, cambio €/$ dinámico (frankfurter.app / BCE).
- **Fase 1 — Supabase:** migración completa BD + Auth (email+password) + Edge Functions; Apps Script jubilado; login con huella (WebAuthn); sincronización multi-dispositivo (`app_state` + tabla `expenses`); ingesta MacroDroid → Supabase.
- **Inversiones:** precios automáticos (acciones US vía Finnhub, ETF VWCE + oro vía Yahoo), proyección estilo TR con slider, venta parcial + líquido vendido, desglose por tipo de activo, conversor €/$, tarjeta "contribuciones vs ganancias".
- **Motor dinámico de gastos fijos ([#1](https://github.com/JuanjoAvila/Mi-Cartera/issues/1), v3.18–3.19):** calendario de meses por gasto (multiselección), importe anual repartido entre los meses marcados, banco por gasto, tarjeta «Próximos cargos» con líquido del Sabadell tras los fijos del mes, alarma de saldo insuficiente y aviso de mes cargado.

_Para detalle por versión ver [CHANGELOG.md](../CHANGELOG.md)._
