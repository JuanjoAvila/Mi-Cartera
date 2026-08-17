<!-- GENERADO POR scripts/sync-memoria.mjs — NO EDITAR A MANO.
     Espejo de la memoria del agente (ota-no-cambia-contrato-nativo.md). Se regenera con `npm run memoria`.
     Pasado por el filtro de datos personales: el repo es PÚBLICO. -->

---
name: ota-no-cambia-contrato-nativo
description: "⚠ El canal beta cambia el HTML pero NO la APK. Si el bundle cambia las claves que manda a `updateWidget`, el nativo viejo las ignora y el widget PIERDE la línea. Un arreglo repartido entre cliente y nativo no puede viajar por OTA."
metadata: 
  node_type: memory
  type: project
  originSessionId: 0ad6824b-08b7-4339-b951-588c7b4217cc
  modified: 2026-08-17T21:21:23.666Z
---

**2026-08-17 noche.** El arreglo del widget («no puede contradecirse a sí mismo») tiene **tres
mitades** y se quedaron repartidas entre ramas:

| Pieza | Dónde | Viaja por |
|---|---|---|
| Servidor — `_shared/presupuesto.ts`, `ingest/index.ts` | `main` (4.18.2) | Deploy Supabase |
| Cliente — `11-app-main.js` manda `budgetLeft` + `safeLiq` | solo `beta` | **OTA** (bundle) |
| Nativo — `MiCarteraWidget.java` hace la resta | solo `beta` | **APK, no OTA** |

El bundle de `beta` dejó de mandar `afford`. El plugin de la APK 41 (compilada de `main`) hace
`else ed.remove("afford")`, y `build()` hace `setViewVisibility(R.id.w_afford, View.GONE)`.
**Resultado: con la beta puesta y la APK 41, la línea «✅ Puedes gastar …» desaparece del widget.**
No se queda rancia — se va. La familia no se enteró porque `main` sigue mandando `afford`.

Y al subir de APK **40** (compilada de `beta`, 4.16.2, tenía el nativo) a **41** (de `main`, que no
lo tiene), perdió la mitad nativa. **Nunca ha tenido las tres a la vez** — por eso el veredicto de
la 4.16.2 con la 40 puesta no significaba lo que parecía.

**Why:** el canal beta se vende como «pruébalo antes que nadie», pero solo reemplaza el HTML/JS
dentro del caparazón nativo instalado. Cualquier cambio en las claves de `updateWidget` /
`MiCarteraPlugin` es un **contrato entre dos artefactos que se despliegan por vías distintas**, y
el OTA solo mueve uno. Se nota como «el widget está peor que antes» y se diagnostica como
regresión del cálculo, que es mirar donde no es.

**How to apply:**

1. **Antes de tocar `updateWidget` (o cualquier `@PluginMethod`), preguntar: ¿esto cambia las
   claves?** Si sí, el cambio **no puede ir solo por beta**: necesita APK en la misma tanda.
2. **Compatibilidad hacia atrás como norma:** si el cliente empieza a mandar claves nuevas, que
   **siga mandando la vieja** hasta que la APK con el nativo nuevo esté instalada. Un `afford`
   calculado de más no cuesta nada; perder la línea sí.
3. **`apk.json` de `beta` tiene que apuntar a una APK compilada DE `beta`.** Si apunta a la de
   `main` (pasó al alinear los 41 para desactivar la mina del `-X theirs`), el canal de pruebas
   entrega bundle nuevo con nativo viejo.
4. **Al leer un veredicto suyo del widget, mirar de qué APK venía** — el número está en el
   evento (`node scripts/errores.mjs --kind=beta`). Ver [[feedback-no-dar-por-hecho]].

Relacionado: [[mi-cartera-deploy]], [[mi-cartera-android-build]], [[promote-cada-cristo]].
