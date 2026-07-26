<!-- GENERADO POR scripts/sync-memoria.mjs — NO EDITAR A MANO.
     Espejo de la memoria del agente (pendiente-manana-4-12-0.md). Se regenera con `npm run memoria`.
     Pasado por el filtro de datos personales: el repo es PÚBLICO. -->

---
name: pendiente-manana-4-12-0
description: Lo que queda abierto de la 4.12.0 al cerrar la noche del 2026-07-26, con lo medido y las hipótesis ya descartadas
metadata:
  type: project
---

Se cierra la noche con la **beta 4.12.0.27** publicada y **tres cosas sin resolver**. Él lo dejó
cansado y con razón: «pensaba que lo resolverías... pero que va, ni una ni la otra».

## 1. Abrir el perfil: ~300 ms, causa identificada, sin arreglar

Cerrar quedó inmediato; **abrir sigue con el tope**. Medido a rate 12: ~300 ms de tareas largas
(el swipe de pestañas, tras los arreglos, son 0). **Dos hipótesis PROBADAS Y DESCARTADAS, no
repetirlas:** desacoplar el candado de scroll de `gesture-freeze` para no tocar `pointer-events`
(300 vs 310, ruido) y `contain:paint` en el panel durante el arrastre (304 vs 300, ruido). Las dos
revertidas.

Lo que dice la traza: **482 `RasterTask` y 278 `Paint`**. Se escala un panel de ~1.680 px de alto
**desde 0,12 hasta 1** y el navegador lo re-rasteriza mientras crece. No se arregla con una
propiedad suelta → hay que **reducir lo que se pinta durante el crecimiento** (¿escalar solo una
cabecera y pintar el resto al terminar? ¿un panel de altura de viewport?). Es rediseño del gesto.

## 2. La APK no pasa de la 34 a la 35

`apk.json` anuncia 35, él está en 34, y al intentarlo **no pasa nada**. Sospecha concreta y barata
de comprobar: `installApk` en `10-app-components.js` empieza con
`if(!nat||!nat.installApk||!apkUpd) return;` — **un `return` MUDO**. Si la APK 34 no expone
`installApk`, o `apkUpd` viene vacío, no se instala y no se dice ni una palabra. Primer paso:
que ese camino AVISE siempre (por qué no se puede) en vez de callarse; con eso él nos dice qué
sale y se acaba la adivinanza. ⚠ El icono nuevo depende de esto: sin la 35 no se ve.

## 3. Deudas: sigue diciendo que no va

En el banco de pruebas está a 0 ms (entrar, sub-pestañas, scroll y salir deslizando). En el vídeo
de las 23:23 se ve que al final **Gastos se queda a medio pintar / desvaído**, que es un síntoma
distinto del lag. ⚠ **Antes de tocar nada, confirmar en qué compilación lo probó**: los arreglos
entraron en la **.25** y esa noche se publicaron seis betas seguidas (.22 a .27), así que es muy
posible que probara una anterior. Lección aparte: **no publicar varias betas mientras él prueba**,
porque cada push le vuelve a pedir actualizar y no sabe qué está probando.

## Lo que SÍ quedó cerrado y medido esa noche

Lag al deslizar entre pestañas **170 → 0 ms** (ver [[lag-gesto-cuatro-causas]]), el «stopper» que
en realidad **abría Ajustes**, y la versión del APK visible en Ajustes (`4.12.0 (35)`; era el
`versionName`, idéntico a la web).
