<!-- GENERADO POR scripts/sync-memoria.mjs — NO EDITAR A MANO.
     Espejo de la memoria del agente (feedback-memoria-siempre-al-repo.md). Se regenera con `npm run memoria`.
     Pasado por el filtro de datos personales: el repo es PÚBLICO. -->

---
name: feedback-memoria-siempre-al-repo
description: Todo lo que guardes en memoria hay que replicarlo en el repo (npm run memoria) — él trabaja también desde el móvil y con otras IAs
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 88b46dc0-6f86-43d6-b0f3-4bda81906a3c
  modified: 2026-07-26T19:31:26.574Z
---

**Nada que necesite una sesión para no meter la pata puede vivir SOLO en mi memoria local.** Todo
lo que guarde aquí se replica en el repo con `npm run memoria`, que espeja esta carpeta en
`docs/memoria/`. En la misma tanda, no «luego».

**Why:** el 26/7/2026 una sesión del Claude del móvil se gastó **medio presupuesto de tokens**
investigando sobre una rama cortada de `main` desactualizada. Lo que hacía falta para no hacerlo
—que el trabajo vivo está en `beta`— estaba escrito, pero en la memoria local del Claude del PC.
Él trabaja también desde el móvil y a veces le pide cosas a Cursor: «no quiero que pasen estas
cosas». Y a mí se me acaban los tokens a media faena, así que el relevo tiene que poder entrar
frío.

**How to apply:**
- `npm run memoria` tras escribir memoria. `npm test` lo vigila (paso `memoria-espejo`), y en una
  máquina sin memoria local (el CI) sale en verde sin hacer nada.
- ⚠ **El repo es PÚBLICO**: `scripts/sync-memoria.mjs` tacha IBAN, correos, teléfonos y rutas de
  Windows, y **aborta sin escribir** si algo sensible sobrevive al filtro. Había un IBAN real en
  [[mi-cartera-escalado]]. Tipo de dato nuevo → filtro nuevo.
- El punto de entrada de cualquier agente es `EMPIEZA-AQUI.md` (raíz). Lo que le habría ahorrado
  tiempo a la siguiente sesión, va ahí. La norma completa, en `AGENTS.md` §6 ter.
- Relacionado: [[mi-cartera-deploy]] (el tag `beta` que rompe el push), [[feedback-canal-beta-siempre]],
  [[feedback-coste-tokens-cursor]].
