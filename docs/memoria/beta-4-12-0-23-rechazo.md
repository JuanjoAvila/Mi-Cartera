<!-- GENERADO POR scripts/sync-memoria.mjs — NO EDITAR A MANO.
     Espejo de la memoria del agente (beta-4-12-0-23-rechazo.md). Se regenera con `npm run memoria`.
     Pasado por el filtro de datos personales: el repo es PÚBLICO. -->

---
name: beta-4-12-0-23-rechazo
description: Los 5 fallos del rechazo de la beta 4.12.0.23 y las dos MEDICIONES que los sitúan (2026-07-26 noche)
metadata: 
  node_type: memory
  type: project
  originSessionId: 88b46dc0-6f86-43d6-b0f3-4bda81906a3c
  modified: 2026-07-26T20:31:57.917Z
---

Beta **4.12.0.23 RECHAZADA** (5 ok / 5 fallos). Cursor había abarcado los cinco a la vez y quedaron
tres sin cerrar. Lo medido aquí es lo que evita volver a buscar a ciegas.

## 1. «Sigue relentizándose una barbaridad. Al entrar en Deudas, MOVERTE, y luego deslizar»

Es la cuarta vez que lo dice (.17, .19, .23) y **la frase importa**: no es *entrar*, eso ya está a
0 ms. Es *entrar → interactuar dentro → salir deslizando*. Medido con la CPU x6 y datos de prueba
(1.200 gastos, 6 deudas, 6 metas):

| Paso | Tareas largas |
|---|---|
| entrar en Plan | 0 ms |
| entrar en la sub-pestaña Deudas | 0 ms |
| **scroll con RUEDA** dentro de Deudas | 0 ms |
| deslizar a la pestaña anterior | 0 ms |
| **volver deslizando a Plan** | **55 ms** |

⚠ Dos avisos de método: con **rueda de ratón no se reproduce nada** — hay que mandar toques por
CDP, porque el scroll táctil pasa por el detector de ejes del gesto y `onPageScroll` (el
auto-ocultar de la barra) y la rueda no. Y con los datos de prueba salen 55 ms; **con los suyos
reales probablemente más**, así que el siguiente paso es sembrar un histórico grande de verdad
antes de dar nada por arreglado.

## 2. El «stopper»: tres deslizadas seguidas dejan la app SIN pestaña activa

Reproducido: tres arrastres «anterior» rápidos y encadenados dan `gastos → inicio → ?`, y al final
`.botnav-tab.active` **no existe**. Como el `active` de la barra se pinta con
`tab===0 && !drawerOpen && !profileOpen`, que no haya ninguna significa que **se abrió el cajón o
el perfil**. O sea: encadenando deslizadas rápidas, al llegar a la primera pestaña la siguiente
**abre Ajustes** en vez de no hacer nada. Eso es exactamente lo que él describe como «hay un
stopper o algo que no permite deslizar de manera seguida y rápida».

Mirar `onEnd`/`onStart` en `11-app-main.js`: el arrastre de prueba empieza en `x=80`, **fuera** de
la franja `EDGE_OPEN` (52 px), así que no debería abrir el cajón — hay que ver por qué lo abre.

## 3. La versión del APK: era `versionName`, no `versionCode`

«No sale la interesante, la de la APK, no sé si está en 34 o 35.» Tenía razón: se mostraba
`info.versionName`, que es `"4.12.0"` — **idéntico a la versión web**, así que la fila no aportaba
nada. Lo que distingue una APK de otra es el `versionCode`. **ARREGLADO**: ahora sale
`4.12.0 (35)`. Sin ese número no puede saber si un fallo nativo (el icono) es un bug o es que
lleva la 34.

## 4 y 5. Icono y CaixaBank

El **icono** solo se ve con la APK 35 instalada; hasta tener el punto 3 en su móvil no se puede
saber si es un bug. **CaixaBank `invalid_request`**: el log da 20:29 «2 bancos necesitan que los
reconectes» y 20:30 el error → se lanzaron **dos autorizaciones** y la segunda llegó con el
permiso ya gastado (caduca a 30 min y solo vale una vez). Encaja con que luego funcionara yendo de
una en una. Arreglo propuesto y pendiente de su OK: que la notificación **solo deje delante del
botón** en vez de abrir la autorización sola, y quitar así la doble vía.
