# Brief — Import histórico OB seguro (sesión nueva)

**Plan detallado (para segunda opinión):** [`plan-import-historico-seguro.md`](plan-import-historico-seguro.md) — decisiones híbrido C, arquitectura, tests, pedido a Claude. **Leer ese plan antes de opinar o codear.**

**Modelo recomendado:** Claude **Opus alta / Ultra** (chicha + riesgo de romper datos reales). Alternativa Cursor: Opus solo si él lo autoriza (quema tokens Cursor); si no, él lanza en Claude personal. **No fable.**

**Repo:** `E:/Mi cartera` · rama de trabajo **`beta`**  
**Reglas:** `AGENTS.md` · canal beta primero · editar `src/` + `npm run build` · textos es/en/ca · no `alert` nativo.

---

## Contexto paralelo (NO pisar)

Otra sesión / Claude personal está con el **destello temporada** (`docs/memoria/brief-claude-destello.md`).

**NO tocar:** `src/shell.html` (season/botnav host), portal season en `11-app-main.js`, `tests/season-detalle.test.mjs`, tandas glow en RELEASE_NOTES.

**SÍ tocar para esta tarea:** `BankHistoryImport`, motor bank, dedup, tests de import, i18n, CHANGELOG de esta feature.

Prod sigue en **4.14.1**; ronda **4.15.0** en beta **bloqueada por destello** — esta feature puede ir en **4.15.x o 4.16.0** en beta, pero **no promover 4.15 entera** hasta glow OK. Coordinar versión con él.

---

## Objetivo (palabras suyas)

Que pueda decirle a pareja y padre: **«dale a importar 3 meses sin miedo»**.  
Hoy **NO se puede**. Auditado 4/8. Debe valer **cualquier banco** (no solo TR / Google Wallet de cualquier banco).

Feedback sesión 5/8: el sync diario solo trae ventanita reciente (suelo ~inicio mes−8d, cap 150, 1ª cuenta). El pasado **exige** Importar histórico — y ese flujo es el que hay que blindar.

---

## Código de partida

| Pieza | Dónde |
|-------|--------|
| UI import | `BankHistoryImport` en `src/modules/10-app-components.js` |
| Sync histórico servidor | `cloud.bankSyncHistory` → `supabase/functions/bank-sync` con `dateFrom` + paginación |
| Sync diario / suelo | `importObExpenses` en `08-motor-bank.js` (NO reutilices su suelo de 8 días para el histórico) |
| Dedup actual | claves día+importe+comercio; `ext_id`; gemelos MacroDroid |
| Persistencia gastos | `expenses` partido (`micartera_v3_exp`) — no reescribir a lo loco |

Backlog canónico: `docs/memoria/mi-cartera-backlog-2026-08.md` §3 ítem **6 ★★★**.

---

## Cuatro agujeros auditados (4/8) + prueba real

1. **`defDest` → "recibo"** en cargos que no parecen tarjeta → crea **Fijo mensual PERMANENTE** que resta todos los meses. Catastrófico.
2. **`fixNames` frágil** — nombre exacto + importe + cuenta. Banco: «RECIBO ENDESA ENERGIA XXI SA» vs su «Luz» → **duplica**.
3. **No cruza** `state.debts` ni metas/ahorro (lo pidió él).
4. **No hay deshacer.**

Prueba suya 3/8: «me dice que hay duplicados y lo tacha, y selecciona uno que no es duplicado que realmente SÍ lo es, y me lo duplica en recibos».

Riesgo por perfil: padre BAJO · pareja MEDIO · él ALTO (15 fijos + 5 deudas).

---

## Done criteria (propuesta — validar con él al arrancar)

- [ ] Import 1–3 meses **preview** antes de escribir; nada permanente sin confirmación explícita.
- [ ] Default seguro: **NO** crear Fijos nuevos a ciegas (`defDest` / recibo permanente fuera o solo «sugerir»).
- [ ] Dedup robusto: `ext_id` OB, día+importe+comercio normalizado, cruce MacroDroid ±N días, cruce Fijos **fuzzy** (no solo nombre exacto), cruce deudas/metas.
- [ ] Deshacer de la última importación (o al menos “papelera” de lo recién creado).
- [ ] Funciona Sabadell, Revolut, Caixa, etc. (todas las cuentas del enlace, no solo `lk.transactions` primario si el histórico ya trae `accounts[]`).
- [ ] Tests unitarios de los casos de duplicado / no-crear-fijo; e2e si toca UI.
- [ ] RELEASE_NOTES es/en/ca cristiano + CHANGELOG técnico; beta primero; él prueba en móvil **antes** de promote.

---

## Cómo empezar (sugerido)

1. Leer `BankHistoryImport` + flujos que escriben Fijos al confirmar.
2. Reproducir con datos de mentira en tests los 4 agujeros.
3. Plan corto de UX (preview → destino por fila → commit → deshacer) **antes** de codear a lo loco.
4. Implementar en tandas pequeñas en `beta`; nunca “importar y ya”.

---

## Fuera de alcance de esta sesión

- Destello / season UI.
- Promote 4.15.0 a main (bloqueado por glow).
- Widget / MyInvestor / Hogar (otra ronda).
