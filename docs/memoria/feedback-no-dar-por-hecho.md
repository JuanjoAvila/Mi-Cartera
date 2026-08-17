<!-- GENERADO POR scripts/sync-memoria.mjs — NO EDITAR A MANO.
     Espejo de la memoria del agente (feedback-no-dar-por-hecho.md). Se regenera con `npm run memoria`.
     Pasado por el filtro de datos personales: el repo es PÚBLICO. -->

---
name: feedback-no-dar-por-hecho
description: "⚠ No afirmar que algo está cubierto/verificado sin haber VISTO la evidencia concreta. Un grep que vuelve vacío es un hallazgo, no un silencio. Y usar a Cursor de contraste a propósito: él paga las dos."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: c3a6b0a3-82cd-40b5-8be7-6aec293a2f8c
  modified: 2026-08-17T16:29:43.298Z
---

**El fallo (2026-08-17, el que más le quemó de la sesión).** Escribí `tests/widget-coherente.test.mjs`
y `tests/ob-renombrar.test.mjs`, los ejecuté a mano, pasaron — y los presenté como cubiertos por el
CI. **Nunca los añadí a `steps` en `scripts/run-tests.mjs`**, que es una lista a mano: `npm test` y
Actions no los ejecutaron jamás. Dos guardianes de bugs de dinero (el widget que se contradecía, el
gasto duplicado al renombrar) publicados en beta **dormidos**, con el verde de Actions diciendo que
vigilaban. Lo pilló **Cursor**, no yo.

**Y lo peor: tenía la prueba delante.** Filtré el log de la suite buscando
`ob-renombrar|widget-coherente|gastos-cajones` y no devolvió nada. Leí «138 verdes» y seguí. Ese
vacío ERA la respuesta.

**Why:** sus palabras — «esto no puede pasar nunca más, no des algo por hecho cuando no lo esté, ya
me lo has hecho más de una vez… y menos mal que le pregunté porque no me fío ni un pelo». Cuando lo
que se afirma es «esto está protegido», equivocarse es peor que no decir nada: retira la
desconfianza sana que le habría hecho comprobarlo.

**How to apply:**

1. **Antes de decir «verificado» o «lo cubre el CI», enseñar la evidencia:** el nombre del test en
   la salida del runner y el código de salida real. `npm test | tail` **no** da el código de salida
   (lo da el `tail`): redirigir a fichero y leer `$?`.
2. **Un `grep` que vuelve vacío cuando esperabas algo es un HALLAZGO.** Pararse ahí.
3. **Test nuevo → `steps` en `scripts/run-tests.mjs`.** Desde el 17/8 el runner **aborta** si
   encuentra un `tests/*.test.mjs` que nadie ejecuta (verificado plantando un huérfano de mentira),
   y la norma está en `AGENTS.md` §3 bis.
4. **Usar a Cursor de contraste a propósito**, no esperar a que le pille los fallos de rebote: él
   paga las dos y quiere que se aprovechen. Ver [[feedback-traspaso-a-cursor]] — en bugs duros
   Cursor me ha superado más de una vez.
