<!-- GENERADO POR scripts/sync-memoria.mjs — NO EDITAR A MANO.
     Espejo de la memoria del agente (tr-duplicados-saga.md). Se regenera con `npm run memoria`.
     Pasado por el filtro de datos personales: el repo es PÚBLICO. -->

---
name: tr-duplicados-saga
description: "Los \"Movimiento\" de Trade Republic que no cuadraban eran gastos DUPLICADOS. Tres vueltas para cerrarlo (2026-08-03/04) y las dos lecciones que costaron cada una — limpiezas con flag, y limpiezas que solo tocan el móvil y no la nube."
metadata: 
  node_type: memory
  type: project
  originSessionId: d6ae387e-f9d4-460d-b8dc-c43511bd8b4c
  modified: 2026-08-04T17:39:14.767Z
---

**Enable Banking NO manda NADA de Trade Republic.** Volcado el payload crudo completo: de ~20 campos
llegan `null` **todos** salvo importe, signo, fecha y estado. Ni comercio, ni concepto, ni
`entry_reference`. En la app de TR sí se ven los nombres («Claudio Piso», «MAPFRE», «PADEL X TREM») —
es Enable Banking quien no los expone. **No se puede arreglar con código: cualquier "detección" de
comercio para TR sería inventada.** Otros bancos (CaixaBank, Sabadell, Revolut) sí mandan nombre.

**La causa de todo:** sus compras ya entraban por los avisos del móvil (macrodroid) con el comercio
de verdad; el banco las mandaba OTRA VEZ uno o dos días después y sin ningún dato, y el filtro de
repetidos no las reconocía. No eran «movimientos raros»: eran **gastos duplicados**.

## Las tres vueltas — y por qué las dos primeras no valieron
1. **Limpieza con flag** (`_fixMovInvasion`): corrió con la lista de gastos **todavía vacía** (los
   gastos NO viven en `app_state`, llegan de la tabla `expenses` en un segundo viaje) y aun así **se
   marcó como hecha**. El flag quedó escrito en su cuenta y la versión ya corregida salía por el
   early-return sin tocar nada: **él seguía viendo el mismo caos mientras desde fuera parecía
   aplicado.**
2. **Flag versionado** (`_fixMovInvasion2`): ya corría, pero **solo tocaba el array local**. La fila
   seguía viva en la tabla de la nube y **volvía al reconectar el banco** — que es justo lo que hizo.
   Los tombstones (`deleted`) tampoco bastaron: dependen de que la clave coincida al carácter y un
   signo distinto en el importe ya los deja pasar.
3. **`reconcileObDupes`** (08-motor-bank.js), la que funcionó: **sin flag** (corre en cada sync, es
   idempotente y devuelve el MISMO objeto si no hay nada que hacer) y **devuelve lo que hay que
   aplicar EN LA NUBE** — `syncCloudExpenses` lo ejecuta con `cloud.deleteExpense`/`setExpenseCat`.

## ⚠ LAS DOS LECCIONES, para no repetirlas jamás
- **Una limpieza de datos NO se marca "hecha" con un flag.** Se escribe idempotente y se deja correr
  siempre. Un flag mal puesto la deja muerta para siempre en cuentas reales, y encima **miente**: el
  diagnóstico dice "aplicada" mientras el usuario ve el destrozo intacto.
- **Tocar el estado local NO es arreglar nada.** Mientras la fila siga en la tabla `expenses`, vuelve
  al siguiente pull. Si una limpieza quita gastos, tiene que borrarlos también en la nube.

## Otros dos hallazgos de la misma saga
- **`cloud.setExpenseCat` NO EXISTÍA.** `syncCloudExpenses` reemplaza los gastos de origen "supabase"
  con lo que hay en la tabla, así que **cualquier recategorización hecha en el móvil se perdía sola**
  en el siguiente pull. Añadido.
- **«Inversión» nunca puede ser un override de comercio.** «Movimiento» no es una tienda: al marcar
  uno a mano, `setCat` aprendía «esto siempre es Inversión» y `migrate` re-categoriza en CADA carga
  todo lo que esté en "otros" y no sea manual → **un parking de zona azul de 9,50 € se volvía
  Inversión él solo cada vez que abría la app**. Blindado en `autoCategory` + `seedFlows` lo borra
  sin flag en cada carga.
- **El cashback son DOS apuntes y UN solo movimiento**: TR lo abona al efectivo (día 1) y lo retira
  hacia el fondo (día 3, primer día laborable). Corrección suya: «solo debe haber 1, solo pagan 1 vez
  al mes» → se deja **una línea** (la salida, marcada Inversión) y la entrada se borra.

## Método que lo cerró (repetible)
Leer su estado REAL de la nube con la service_role y **simular el arreglo contra esos datos antes de
subir nada** (`scripts/errores.mjs` para eventos; consultas directas a `app_state`/`expenses`/
`bank_links` para el resto). Cada vuelta que se subió "a ver si ahora sí" costó una tanda de su
tiempo y de su confianza.
