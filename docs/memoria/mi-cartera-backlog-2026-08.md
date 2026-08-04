<!-- GENERADO POR scripts/sync-memoria.mjs — NO EDITAR A MANO.
     Espejo de la memoria del agente (mi-cartera-backlog-2026-08.md). Se regenera con `npm run memoria`.
     Pasado por el filtro de datos personales: el repo es PÚBLICO. -->

---
name: mi-cartera-backlog-2026-08
description: "INVENTARIO VIVO ordenado de fácil→difícil (2026-08-04). Todo lo pendiente tras cerrar la saga de duplicados de TR. Incluye el crucero (liras, VIERNES 7/8 = fecha dura), la limpieza de Ajustes→Dinero, el presupuesto/widget descuadrados y el import histórico seguro (lo que más le importa, quiere confiar al 100% para su padre y su pareja)."
metadata: 
  node_type: memory
  type: project
  originSessionId: d6ae387e-f9d4-460d-b8dc-c43511bd8b4c
  modified: 2026-08-04T17:38:43.766Z
---

**Regla suya para esta etapa (2026-08-04, textual): «vamos a ir de 1 en 1».** Nada de tandas
paralelas. Ver [[feedback-de-uno-en-uno]].

## ⏰ CON FECHA DURA — el crucero sale el VIERNES 7/8/2026
**Multidivisa de verdad (liras turcas).** Paga con Revolut, que permite cambiar EUR→TRY. Quiere que
la app detecte la moneda, haga el cambio sola, y que **los gastos en lira salgan bien**, «pulidísimo».
Hoy `settings.moneda` («moneda visualización») **existe pero NO funciona nada**, y la lira ni está en
la lista. Es lo único con fecha: si no llega, se va sin ello.

## 🐛 BUGS PENDIENTES (de más fácil a más difícil)

1. **Ajustes → «Dinero» está lleno de cosas muertas o duplicadas** (petición suya, limpieza):
   - `Presupuesto mensual` → **quitar**, ya se edita en Resumen.
   - `Moneda de visualización` → hay monedas pero **no hace nada**, y falta la lira turca.
   - `Comparar monedas` → «un montón de filas y todo vacío».
   - `Bancos de gasto diario` → **quitar**, ya está en Cartera (se puso ahí a propósito, decisión suya).
   - `Total de gastos` → **ESE SÍ se queda**.
2. **El presupuesto del mes en Resumen no cuadra**: «no pilla correctamente el balance correcto de lo
   que queda realmente para gastar». Sospechar de `monthSummary` (04-tab-gastos.js) + `reservedSince`
   + las categorías neutras nuevas (`CAT_NEUTRAS`: inversion/traspaso) — puede que Resumen use otro
   cálculo distinto al de Gastos y ahora diverjan.
3. **El widget de fuera está descontrolado**: no actualiza bien lo que queda para gastar. Ya se tocó
   el 1/8 (`MiCarteraWidget.build()` compara el mes de `updated` con el de ahora; `updatePeriodMillis`
   0→6h) pero **nunca lo llegó a validar**. Es nativo → APK, ver [[mi-cartera-android-build]].
4. **Gastos de bancos que no son el de gasto diario no entran** (Revolut sale vacío, Sabadell solo
   ingresos). **Es POR DISEÑO** (evita duplicar con los Fijos modelados) pero él lo vive como bug:
   «todos los malditos gastos que no sale ni uno». Existe `settings.expenseBanks` para ampliarlo —
   **decidir con él**, tiene el coste de doble conteo con Fijos. Relacionado: la salida del traspaso
   no se ve en Sabadell (solo la entrada en TR).

## 🚀 EVOLUTIVOS PENDIENTES

5. **★★★ IMPORT HISTÓRICO SEGURO — lo que más le importa.** Quiere poder decirle a su pareja y a su
   padre «dale a importar 3 meses sin miedo a cargarte nada». **HOY NO SE PUEDE.** Auditado el
   2026-08-04 (`BankHistoryImport`, 10-app-components.js), cuatro agujeros reales:
   - `defDest` manda a **"recibo"** todo cargo que no sea de tarjeta → crea un **Fijo mensual
     PERMANENTE** que resta todos los meses para siempre.
   - `fixNames` compara **nombre exacto + importe + cuenta**: el banco pone «RECIBO ENDESA ENERGIA
     XXI SA» y él tiene «Luz» → no los reconoce → **duplica**.
   - **No cruza contra `state.debts`** (él tiene 5 deudas): sus cuotas están en el extracto y se
     reimportarían → doble conteo. Tampoco contra metas/ahorro (él lo pidió explícitamente).
   - **No hay deshacer.**
   Riesgo por persona: padre BAJO (empieza de cero, 3 fijos — es justo su caso de uso), pareja MEDIO
   (8 fijos), él ALTO (15 fijos + 5 deudas).
   Lo que haría falta: casar recibos por **importe+fecha** en vez de por nombre, cruzar deudas/metas,
   y **«deshacer la última importación»**.
   ⚠ **Y debe valer para CUALQUIER banco, no solo TR** (aviso suyo): con Google Wallet se meten
   tarjetas de cualquier banco y todas registran importes.

6. **MyInvestor nativo** (WebView que cargue myinvestor.es y genere el reCAPTCHA en su dominio).
   Trabajo Java + APK + su login real. Arrastrado desde la 4.10.0.
7. **Splash: dos renders distintos sin unificar** (icono nativo suelto + tarjeta del splash JS).
   Aparcado en `wip/splash-icono-nativo`, ver [[splash-nativo-saga]].
8. Las tres de `docs/AMENAZAS.md` que siguen abiertas: **validar la entrada de las 10 Edge Functions**
   (único ROJO), auditar logs, extender rate limit.

## ✅ CERRADO EL 2026-08-04 (la sesión de los duplicados de TR)
Todo en `beta` 4.13.0, pendiente de su veredicto formal en el panel. **Él lo dio por bueno en
caliente: «U,u ahora siiiiiii porfin!!!!! maravillaaaaa».**
- Duplicados de TR, cashback y parking → ver [[tr-duplicados-saga]] (las 3 vueltas y sus lecciones).
- Categoría **📈 Inversión** (aporte automático por importe exacto de `monthlyInvest`; round-up y
  cashback a mano) y **🔄 Traspaso** (dinero suyo que cambia de cuenta: se apunta, ancla «Mi ciclo»,
  pero NO suma a ingresos — elección suya entre 3 opciones).
- Ventana con **8 días de margen** hacia atrás: lo del último día del mes ya no se tira.
- **Ajustes → «Importaciones»** (hoja de Excel + histórico juntos) y fuera el exportar/importar JSON
  a mano.

## Dato que NO hay que volver a levantar
Su histórico **empieza el 15 de junio de 2026** y no hay nada anterior: cuando dijo «el filtro Todo
solo llega al 18 de junio» **no era un bug**. Los gastos viven en la tabla `expenses` (no en
`app_state`, ver `slimForCloud`) y **no se podan por antigüedad**.
