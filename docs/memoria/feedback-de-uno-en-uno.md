<!-- GENERADO POR scripts/sync-memoria.mjs — NO EDITAR A MANO.
     Espejo de la memoria del agente (feedback-de-uno-en-uno.md). Se regenera con `npm run memoria`.
     Pasado por el filtro de datos personales: el repo es PÚBLICO. -->

---
name: feedback-de-uno-en-uno
description: "⚠ Desde 2026-08-04 se va de UNO EN UNO, no en tandas paralelas. Y antes de dar algo por arreglado hay que verificarlo contra sus datos REALES de la nube — no subir \"a ver si ahora sí\"."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: d6ae387e-f9d4-460d-b8dc-c43511bd8b4c
  modified: 2026-08-04T17:39:31.826Z
---

**Textual suyo (2026-08-04): «Vamos a ir de 1 en 1 porque ahora cualquier problema o feature es
imposible que la hagas bien a la primera te cuesta un montón»** y, al cerrar la sesión, **«vamos con
quick wins que hay mucho trabajo por hacer... y esta vez vamos a ir de 1 en 1»**.

**Why:** venía de una sesión de 6 agentes en paralelo (3/8) en la que casi todo volvió rechazado, y
de tres vueltas seguidas del mismo bug de duplicados en las que cada "ya está arreglado" resultó
falso. Lo que le quema no es que algo falle: es **que le hagan probar lo mismo tres veces**. Con
tandas paralelas eso se multiplica y además no sabe qué está probando.

**How to apply:**
- Un problema, un arreglo, una verificación, un push. No mezclar features en el mismo commit.
- **Antes de decirle que algo está arreglado: simularlo contra sus datos REALES de la nube**
  (service_role, ver [[tr-duplicados-saga]]). Si no se puede simular, decírselo en vez de dar por
  hecho que funciona.
- Cuando pregunte «¿esto es solo para mí o vale para mi pareja y mi padre?» — **mirar sus estados de
  verdad antes de responder** (`app_state` de los 3 usuarios). El 4/8 esa comprobación reveló que uno
  de ellos tiene Trade Republic como cuenta de gasto diario y habría heredado el mismo infierno.
- No prometer seguridad que no está verificada. El 4/8 preguntó si podía decirle a su pareja «dale a
  importar histórico sin miedo» y la respuesta honesta era **no todavía** — se la di con los cuatro
  agujeros concretos y lo agradeció más que un "sí" cómodo.
