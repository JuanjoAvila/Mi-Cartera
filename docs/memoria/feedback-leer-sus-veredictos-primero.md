<!-- GENERADO POR scripts/sync-memoria.mjs — NO EDITAR A MANO.
     Espejo de la memoria del agente (feedback-leer-sus-veredictos-primero.md). Se regenera con `npm run memoria`.
     Pasado por el filtro de datos personales: el repo es PÚBLICO. -->

---
name: feedback-leer-sus-veredictos-primero
description: "Antes de tocar una línea, leer lo que él YA reportó (errores.mjs --kind=beta + sugerencias) — hacerle repetir un fallo es el error que más le quema"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 0042f241-fc1e-4bc9-909f-14672c6f988e
  modified: 2026-08-01T09:17:50.451Z
---

**Lo PRIMERO de cada sesión, antes de mirar el código:**

```bash
node scripts/errores.mjs --kind=beta --limit=40
node scripts/errores.mjs --kind=feedback --limit=20
```

Necesita `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` (ya está puesta en su portátil).

**Why:** el 2026-08-01 revisé nueve commits del Claude del móvil, encontré bugs de verdad y le
entregué un informe entero **sin haber mirado ni una vez lo que él ya había reportado**. Llevaba
dos tandas rechazadas desde el móvil (`gestos` y `arranque`, rechazadas el 29/7 y OTRA VEZ el 1/8 a
las 09:19) y nadie las había tocado. Encima le dije que el panel «empieza en limpio» como si fuera
un detalle. Su respuesta: *«respecto a los errores que apunté la última vez no me los
corregiste..... lo reseteaste todo a 0 y te has quedado tan pancho, joder, ya he repetido los
mensajes 3 veces, estoy hasta los cojones»*. Y tenía razón: `EMPIEZA-AQUI.md` §3 ya lo dice
—«míralas al empezar»— y me lo salté.

**Su trabajo de prueba es el recurso caro de este proyecto.** Escribir esos partes le lleva días,
con la app delante, y él es el único que puede hacerlo. Perderlo o ignorarlo cuesta más que
cualquier bug.

**How to apply:**
- El parte trae el `tanda`, la `version`, el `apk` y el `detalle` con **el punto exacto y lo que
  escribió a mano**. Eso ES la lista de tareas: no hace falta preguntarle nada.
- **Nunca le pidas que repita un fallo que ya reportó.** Si algo se ha perdido por el camino,
  recupéralo del servidor: los veredictos están en `app_events` desde que los envió.
- Desde 2026-08-01 los ✗ y sus comentarios **sobreviven a la compilación nueva** en el panel
  (`_betaReviewOk` + `_betaReviewNotas`, por TEXTO del punto). Antes se borraban con el argumento
  de que «una cruz es justo lo que se acaba de arreglar» — falso, el panel no sabe si esa
  compilación tocó ese punto, y el que pagaba el error era él. No lo vuelvas a revertir.
- Si un arreglo suyo no se ha hecho, dilo **antes** de contar lo que sí has hecho.
- Relacionado: [[feedback-canal-beta-siempre]], [[mi-cartera-roadmap]], [[feedback-siempre-se-puede]].
