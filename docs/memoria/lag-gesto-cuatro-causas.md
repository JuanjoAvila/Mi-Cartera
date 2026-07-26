<!-- GENERADO POR scripts/sync-memoria.mjs — NO EDITAR A MANO.
     Espejo de la memoria del agente (lag-gesto-cuatro-causas.md). Se regenera con `npm run memoria`.
     Pasado por el filtro de datos personales: el repo es PÚBLICO. -->

---
name: lag-gesto-cuatro-causas
description: El lag al deslizar tenía CUATRO causas y ninguna era el gesto — pointer-events heredado, translateX(%), offsetWidth por frame y prepMountTab (2026-07-26)
metadata:
  type: project
---

Cerrado tras **cuatro rechazos suyos** (.17, .19, .23) con la misma frase: «al entrar en Deudas,
**MOVERTE**, y luego deslizar». Esa palabra era la pista y tardamos en usarla: *entrar* ya costaba
0 ms; el problema solo salía **si habías scrolleado dentro**. Medido a **rate 12** (el CI es más
lento que un portátil: a rate 6 no se reproduce aquí y allí sí): **170 → 0 ms**.

1. **`pointer-events` es HEREDADA y se tocaba en la raíz.** `freezeShell` ponía `gesture-freeze`
   al shell, cuya única regla es `pointer-events:none` → invalida el estilo del árbol ENTERO. Un
   `UpdateLayoutTree` de 28,6 ms. Solo quitarlo del swipe de pestañas: 79 → 0-50 ms.
2. **`translateX(%)`**: un porcentaje en un `transform` se resuelve contra el ancho del propio
   elemento, o sea consultando layout. Por frame, saca la animación del compositor. 146 → 76 ms.
3. **`offsetWidth` leído en cada `touchmove`** — layout-thrashing. Y explica el «solo si te
   mueves»: sin scroll el layout está limpio y leer es gratis; congelar el scroll pone
   `overflow:hidden`, lo ensucia, y entonces cada lectura fuerza reflow completo. Dos ingredientes.
4. **`prepMountTab` en cada `touchmove`**: ~35 llamadas por arrastre para no cambiar nada.

**El «stopper» no era un freno: abría Ajustes.** Tres arrastres encadenados → `gastos → inicio →
ninguna pestaña activa`, y sin `.botnav-tab.active` significa cajón abierto. En Inicio, deslizar a
la derecha abre Ajustes desde toda la pantalla (atajo del 17/7): encadenando hacia atrás, la
deslizada de más te lo planta. Ahora el atajo de pantalla completa no cuenta si acabas de cambiar
de pestaña (<450 ms); desde el borde sigue igual.

**Esconder sin pagar dos veces:** los segmentos de Plan se quedan montados y CON layout
(`visibility:hidden`) para que entrar cueste 0, pero durante el arrastre (`.track.dragging`) pasan
a `content-visibility:hidden` y salen del pintado. Probadas las tres: visibility (entrar 0 /
deslizar 156), display:none (133 / 80), content-visibility fijo (124 / 86). Ninguna vale sola.

⚠ **MÉTODO, lo que más vale de aquí:** medir con **rueda de ratón NO reproduce nada** (el scroll
táctil pasa por el detector de ejes y `onPageScroll`, la rueda no) → toques por CDP. Y usar
**rate 12** además de 6, porque a 6 esto pasaba en verde en el PC y tumbaba el CI. Ver
[[mi-cartera-roadmap]] y AGENTS §7 bis.
