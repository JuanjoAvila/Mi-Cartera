<!-- GENERADO POR scripts/sync-memoria.mjs — NO EDITAR A MANO.
     Espejo de la memoria del agente (season-destello-saga.md). Se regenera con `npm run memoria`.
     Pasado por el filtro de datos personales: el repo es PÚBLICO. -->

---
name: season-destello-saga
description: "Saga del destello de temporada (.9→.13) y, sobre todo, cómo medir un efecto visual de verdad — restar dos capturas con el gesto congelado."
metadata: 
  node_type: memory
  type: project
  originSessionId: 9925d8cc-e219-4716-b8b7-729019c1d9ca
  modified: 2026-08-05T19:48:07.331Z
---

Seis intentos entre el 4 y el 5/8/2026 para un destello de temporada que no cambiara. Cerrada el
5/8 con la build .13 (commit `528322ac`, rama beta), pendiente de su veredicto.

**La técnica que lo desbloqueó, y que sirve para cualquier efecto visual:** el Δ de un píxel
durante un gesto NO mide el efecto, mide el contenido que se desliza. Medido: el salto de 228 RGB
que se perseguía desde la .9 salía **idéntico sin destello ninguno**. Para aislar el efecto:

1. `Input.dispatchTouchEvent` con `touchStart` + `touchMove` hasta la mitad y **sin `touchEnd`**:
   el gesto se queda congelado con el dedo puesto.
2. Ahí, dos capturas seguidas: una con el efecto y otra con **solo** el gradiente apagado
   (ojo: apagar de más —esconder la capa entera— mide otra cosa y da restas negativas).
3. La resta es la aportación exacta del efecto en ese composite.

Criterio útil: aporte en reposo ≈ aporte en gesto (no cambia), aporte ≠ 0 (no desaparece),
aporte ≈ 0 sobre la barra de estado (mismo tono).

**Lo estructural que costó tres builds:** al arrastrar el carrusel se QUITA `page-scroll-host` de
la página activa, y `.track` lleva `will-change:transform`, así que las páginas pintan como
contenido en flujo — cualquier capa fija con `z-index >= 0` a nivel de `body` les queda ENCIMA.
Por eso no vale ni hornear el degradado en el fondo del host ni meter una capa «detrás».

Detalle completo del porqué en `CHANGELOG.md` (4.15.0, punto 12), los invariantes en
`tests/season-detalle.test.mjs` y los comentarios de `src/shell.html`.
Ver [[feedback-scrollear-puede-ser-entre-pestanas]] y [[depurar-webview-en-su-movil]].
