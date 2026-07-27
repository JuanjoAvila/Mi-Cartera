<!-- GENERADO POR scripts/sync-memoria.mjs — NO EDITAR A MANO.
     Espejo de la memoria del agente (feedback-coste-tokens-cursor.md). Se regenera con `npm run memoria`.
     Pasado por el filtro de datos personales: el repo es PÚBLICO. -->

---
name: feedback-coste-tokens-cursor
description: El usuario se queja del gasto de tokens y mete a Cursor a implementar — cómo repartir y qué NO recortar
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 1cea94c2-8439-4ebf-b1b5-3a1ef0ea93da
---

**2026-07-15, textual:** «tú te fundes las tokens que da gusto con 2 mierdas que te pido y a veces
1 y a veces hasta te quedas a medias, es absurdo». Por eso quiere que **Cursor contribuya en la
implementación**, y pidió un prompt para que Cursor «no la líe parda».

**Why:** no es un capricho de estilo: se queda sin presupuesto **a mitad de tarea**, y quedarse a
medias es lo que más le fastidia (la app es la que usan él y su pareja a diario). El problema no es
que las respuestas sean largas, es el trabajo tirado: releer el monolito de 870 KB de
`public/index.html`, navegar la UI a ciegas y volcar diffs enteros al contexto.

**How to apply:**
- **Localiza, no leas.** `Grep`/`sed -n` sobre `public/index.html`, nunca `Read` del fichero entero.
  Es ~870 KB: leerlo entero se come una sesión él solo.
- Para revisar tu propio diff: `git diff | grep "^[+-]" | grep -v "^[+-][+-]"` en vez de volcarlo todo.
- Antes de escribir, verifica supuestos con lo barato (banco de pruebas en Node contra el fichero
  real) y deja el navegador para lo que solo se ve corriendo.
- La respuesta en el chat, al grano y con el resultado primero.
- **Lo que NO se recorta** (recortar aquí es lo que le hace perder tiempo de verdad): probarlo de
  verdad antes de decir que funciona, los tres idiomas, la entrada de `RELEASE_NOTES`
  (ver [[feedback-release-notes-siempre]]) y no inventarse números.
- Puede tirar de subagentes con modelo barato para lo mecánico (ver [[feedback-modelos-dinamicos]]).

**Reparto con Cursor:** las reglas de la casa viven en `AGENTS.md` (raíz del repo, creado
2026-07-15) — Cursor lo lee solo, no hace falta pegarle el contexto en cada prompt. Si cambia una
convención (fuente única, minify, diálogos propios, idiomas, versionado), **actualizar AGENTS.md**
o Cursor la romperá. Ver [[mi-cartera-deploy]].
