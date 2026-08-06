<!-- GENERADO POR scripts/sync-memoria.mjs — NO EDITAR A MANO.
     Espejo de la memoria del agente (misma-regla-en-dos-sitios.md). Se regenera con `npm run memoria`.
     Pasado por el filtro de datos personales: el repo es PÚBLICO. -->

---
name: misma-regla-en-dos-sitios
description: "Cuando una regla de dinero corre en cliente Y servidor, el test debe cargar LAS DOS y exigir el mismo número"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 272a31c7-fc62-419e-a958-cac67b02f7a5
  modified: 2026-08-06T15:34:38.594Z
---

**2026-08-06.** Le saltó «¡95% del presupuesto! 965 € de 1.000 €» en la noti y en el widget, y al
abrir la app no llegaba al 30%. Las dos cifras salían de la MISMA nube.

Causa: `monthBudgetStats()` (cliente) descarta bancos que no son de gasto diario, categorías neutras
(inversión/traspaso) y resta lo reservado; `ingest` sumaba **todas** las filas del mes. Nadie las
había mantenido alineadas porque **nada las obligaba a estarlo**.

**Why:** un test de constantes se queda verde cuando alguien cambia una implementación y se olvida
de la otra — que es exactamente cómo nació el bug. El widget y las notis se pintan con la app
cerrada, así que el servidor no puede reutilizar el JS del bundle: la regla vive dos veces a la
fuerza.

**How to apply:** el test carga LAS DOS implementaciones (el cliente con
`loadPureLogicFromFile()`, el `.ts` del servidor con `esbuild`) sobre el MISMO escenario y exige el
mismo resultado. Escribir el movimiento UNA vez y traducirlo a los dos formatos, si no el test puede
pasar con dos escenarios distintos y no probar nada. Comparar redondeando a céntimos: el servidor
redondea (sus cifras van a una noti) y el cliente arrastra el float crudo.

Ver `tests/presupuesto-servidor.test.mjs`. Mismo patrón aplicable a cualquier regla de dinero
duplicada. Y verificar siempre contra su nube real antes de darlo por bueno
([[feedback-de-uno-en-uno]]): aquí el número de la noti (964,58 €) se reprodujo clavado.

⚠ Trampa relacionada: `toEurAmt()` dice «no inventar tipo» pero **devuelve el número crudo** sin
tipo de cambio, o sea que aplica un 1:1. El freno real está en el botón de guardar. Cualquier
conversión nueva necesita su propio freno.
