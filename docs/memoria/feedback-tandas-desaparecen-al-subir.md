<!-- GENERADO POR scripts/sync-memoria.mjs — NO EDITAR A MANO.
     Espejo de la memoria del agente (feedback-tandas-desaparecen-al-subir.md). Se regenera con `npm run memoria`.
     Pasado por el filtro de datos personales: el repo es PÚBLICO. -->

---
name: feedback-tandas-desaparecen-al-subir
description: "Una tanda aprobada Y subida se QUITA del array `tandas`, no se marca como hecha — y nunca recomendar subir a prod algo que mezcle aprobado con roto"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 0042f241-fc1e-4bc9-909f-14672c6f988e
  modified: 2026-08-01T19:59:13.140Z
---

**Regla suya, textual (2026-08-01): «si sube algo en prod, se quita de beta para probar porque ya
está listo — es como una especie de backlog: conforme apruebe la tanda sube y desaparece; si algo
falla se queda hasta que esté todo aprobado por mí».**

**Why:** `arranque` y `canal` (4.13.0) se aprobaron y se subieron (arranque → producción como
4.12.3; canal → su arreglo vive activo en `beta.yml`) pero sus bloques `{id:...}` se dejaron en el
array `tandas` de `RELEASE_NOTES` con un comentario de «ya hecha». Efecto: su panel «Revisar esta
beta» las seguía enseñando como pendientes. Su reacción: «no se reflejaba en las pruebas de la
beta... enserio ya se que me repito». Perder su confianza en que "aprobado = hecho" es caro: si el
panel miente sobre qué queda, deja de mirarlo.

**How to apply:**
- Cuando una tanda se aprueba Y se promociona (a `main`, o su arreglo ya vive activo sin que haya
  «producción» que tocar), **borra el bloque `{id:...}` entero** del array `tandas` de esa entrada
  de `RELEASE_NOTES` (`src/modules/10-app-components.js`). No comentarlo, no dejarlo con una nota
  de «hecha» — bórralo. Lo que hizo esa tanda queda documentado en `CHANGELOG.md` y
  `docs/ROADMAP.md`, que es donde se consulta el HISTÓRICO. `tandas` es solo la cola de lo que
  **queda** por revisar.
- **NUNCA recomendar «sube todo, incluido lo rechazado»** cuando algunas tandas están aprobadas y
  otras rechazadas en la misma ronda mezclada. Se lo propuse una vez (opción "Sube TODO ya
  (recomendado)") y su respuesta fue furia justificada: «me recomiendas subirlo todo de golpe aun
  sin estar corregido... para eso sirven las putas features, así vamos dando pequeños entregables
  no todo y algunas cosas rotas y otras no». Si las tandas están entrelazadas en el código
  (commits mezclados, sin rama `tanda/<id>` desde el primer commit), la respuesta es SEPARAR A
  MANO lo aprobado (ver [[mi-cartera-roadmap]], caso 4.12.2/4.12.3), no proponer subir todo.
- Si de verdad hay que preguntar algo sobre cómo trocear una promoción, pregúntalo — no le
  molesta que preguntes ("PREGUNTAME como ahora no te cuesta nada"), le molesta que la PRIMERA
  opción que ofrezcas sea la cómoda-pero-mala.
- Relacionado: [[mi-cartera-roadmap]] (el caso real del 1/8), [[feedback-canal-beta-siempre]].
