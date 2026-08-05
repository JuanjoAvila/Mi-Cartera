<!-- GENERADO POR scripts/sync-memoria.mjs — NO EDITAR A MANO.
     Espejo de la memoria del agente (feedback-scrollear-puede-ser-entre-pestanas.md). Se regenera con `npm run memoria`.
     Pasado por el filtro de datos personales: el repo es PÚBLICO. -->

---
name: feedback-scrollear-puede-ser-entre-pestanas
description: "Cuando dice «al scrollear», puede querer decir DESLIZAR ENTRE PESTAÑAS, no bajar la lista — preguntar antes de montar el banco de pruebas."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 9925d8cc-e219-4716-b8b7-729019c1d9ca
  modified: 2026-08-05T19:47:55.984Z
---

Cuando describe un fallo «al scrollear», hay que confirmar **qué gesto** es antes de medir nada:
para él eso incluye **deslizar de una pestaña a otra**, no solo bajar dentro de una lista.
El 5/8 lo dijo a media sesión: «es scrolleando entre tabs no en la misma tab scrolleando hacia
abajo tenlo en cuenta».

**Por qué:** son dos gestos con DOM distinto. Al arrastrar el carrusel se quita
`page-scroll-host` de la página activa, así que cualquier efecto colgado del fondo de esa clase
se apaga justo durante el gesto. Tres builds seguidas (.9, .11, .12) se publicaron «arregladas»
midiendo scroll vertical, que era el gesto que NO fallaba. Ver [[season-destello-saga]].

**Cómo aplicarlo:** antes de montar el banco de pruebas, preguntar «¿deslizando entre pestañas o
bajando dentro de una?». Y si describe algo que «aparece y desaparece», preguntar también si pasa
en reposo — la mitad de las veces el estado en reposo ya lo descarta solo.
Encaja con [[feedback-de-uno-en-uno]]: nada se da por arreglado sin reproducir SU caso.
