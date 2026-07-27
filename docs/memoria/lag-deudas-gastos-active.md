<!-- GENERADO POR scripts/sync-memoria.mjs — NO EDITAR A MANO.
     Espejo de la memoria del agente (lag-deudas-gastos-active.md). Se regenera con `npm run memoria`.
     Pasado por el filtro de datos personales: el repo es PÚBLICO. -->

---
name: lag-deudas-gastos-active
description: Causa del lag Deudas→Gastos — prop active re-renderizaba Expenses (2026-07-27 Cursor)
metadata:
  type: project
---

**CERRADO con medida en SU móvil (CDP, beta .42):** Deudas→Gastos hacía **+1 render** de
`Expenses` (`active` pasa a true); Deudas→Cartera hacía **0**. Esa asimetría era exactamente su
«hacia Cartera fluido / hacia Gastos lagazo».

La prop `active` iba en el `useMemo` de Gastos (`gastosActiva`). El expediente LAG-DESLIZAR ya lo
había anotado («dejar active fijo quita la asimetría, pero no vale») y se descartó mal.

**Arreglo:** `mcSetGastosActive` / `mcOnGastosActive` en `00-core.js`. heavyOk y reset de chips
siguen; el árbol de Gastos no se reconstruye al aterrizar. Guardián:
`tests/gastos-active-bus.test.mjs`. Herramienta: `tools/movil/medir-renders.mjs`.

⚠ Los arreglos del gesto cancelado / preventDefault (§0 del expediente) se quedan — eran fallos
reales — pero NO eran lo que él seguía notando tras la .38. No los deshagas ni los vuelvas a
«arreglar».

Veredicto pendiente suyo con el repro: Gastos arriba → Deudas (moverte) → deslizar a Gastos.
