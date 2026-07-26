<!-- GENERADO POR scripts/sync-memoria.mjs — NO EDITAR A MANO.
     Espejo de la memoria del agente (feedback-canal-beta-siempre.md). Se regenera con `npm run memoria`.
     Pasado por el filtro de datos personales: el repo es PÚBLICO. -->

---
name: feedback-canal-beta-siempre
description: "Todo lo que el usuario vaya a notar se publica primero en la rama `beta` y lo prueba ÉL; a `main` solo doc, tests y tooling"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 326ba5c6-600a-4459-8f95-360e2f7cbcbc
  modified: 2026-07-25T18:35:30.628Z
---

**Nunca pushear a `main` un cambio que el usuario vaya a notar.** Va a la rama **`beta`** →
`beta.yml` publica `bundle.zip` + `version.json` en la release fija `beta` (versión
`VERSION.RUN_NUMBER`, siempre mayor que producción) → él activa el canal en Ajustes → Dev →
Pruebas, lo prueba con el panel «🔍 Revisar esta beta» → Actions → «Promote beta» mezcla a `main`.

**Why:** el canal existe desde la 4.8.0 justo para esto. El 2026-07-25 se publicó la 4.10.0
directa a `main` y la estrenaron él, su padre y su pareja sin que nadie la hubiera abierto en un
móvil — salió con el splash invisible. Su respuesta: «¿pa qué tengo el canal beta? ¿no habíamos
quedado que siempre pruebo antes de subir nada????? estoy cansado en serio». Publicar sin su OK
convierte a su familia en el banco de pruebas.

**How to apply:** `git checkout -B beta` → commit → `git push origin refs/heads/beta:refs/heads/beta`
(el refspec completo hace falta: existe también una RELEASE llamada `beta` y si no `git push`
dice «matches more than one»). Verificar que la release `beta` queda con la versión nueva.
A `main` directo solo doc, tests y tooling. Esto **deroga** el «push directo al acabar» de
[[mi-cartera-deploy]], que es de antes de que existiera el canal.
