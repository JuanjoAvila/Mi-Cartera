# Plan — Vuelta del crucero (2026-08-17)

## 📍 DÓNDE ESTAMOS — mirar esto primero (última actualización: 17/8, tras la beta 4.17.0)

Cualquiera (Cursor, Claude, él desde el móvil) puede retomar desde aquí sin preguntar a nadie.

| Tanda | Estado | Notas |
|---|---|---|
| 0 · Pages | ⏸ **A PROPÓSITO SIN LANZAR** | Decisión suya: la familia salta de golpe al promocionar. Live sigue 4.15.0 / apk.json 4.12.0 |
| 1a · Widget coherente | 🔁 **RECHAZADA (17/8 noche)** — arregló la incoherencia interna pero NO el desfase | 4.16.2 · APK 40. Widget 907 · app 709. **Causa raíz ya diagnosticada abajo, con sus datos reales** |
| 1b · Revolut −204 del padre | 🔴 **BLOQUEADA** | Su padre corre el NATIVO de 4.12.0: no se puede diagnosticar hasta que promocionemos |
| 2 · Gastos: qué cuenta / «Movimiento» / banco | 🔁 **RECHAZADA 4.17.0.1** (7 ok / 2 fallos) → arreglada en **4.17.1**, esperando re-prueba | Sin APK (web + migración 0021) |
| 3 · Filtro en `+` y editar + calendario propio | ⬜ Siguiente candidata | No depende de nada |
| 4 · Más categorías + IA | ⬜ Libre | Buena para Cursor: anchura mecánica × 3 idiomas |
| 5 · Meta = gasto del mes | ⛔ **NO EMPEZAR** | Reescribe `monthBudgetStats`, que es lo que estabiliza la 1a. Esperar a que la 1a esté aprobada |
| 6 · Efectivo | ⬜ Libre | |
| 7 · Import histórico | ⬜ Plan sellado | `plan-import-historico-seguro.md`, tanda 1 motor |
| 8 · Parpadeo tabs / overscroll | ⬜ Libre | Necesita que él grabe |

**Estado del repo:** `beta` = **4.17.0** (por delante de `main` = 4.16.1). APK publicada: **40 / 4.16.2**.
Migración **0021** (`ob_name`) en el repo — ⚠ las Edge Functions y las migraciones **solo se
despliegan al pushear a `main`**; `ingest` se desplegó a mano el 17/8 con
`gh workflow run supabase.yml --ref beta`, pero **la 0021 NO está aplicada todavía**: el cliente
reintenta sin la columna (`_isMissingObNameCol`), así que el renombrado funciona pero sin la
protección anti-duplicado hasta que se aplique.

### ★ POR QUÉ EL WIDGET Y LA APP NO CUADRAN — cerrado el 17/8 con sus datos reales

Medido con `node scripts/diag-widget.mjs` (lee su nube y pasa LAS MISMAS filas por las dos
implementaciones). **No hace falta volver a investigarlo, solo arreglarlo.**

1. **La fórmula NO es el problema.** Servidor 914,96 € y cliente 914,96 € con la misma entrada.
   Que nadie toque `statsDelMes` ni `monthBudgetStats` buscando aquí.
2. **El widget cuenta filas que la app ya descartó** → widget MÁS ALTO. Dos vías:
   - **9 filas con lápida** en `state.deleted` siguen vivas en la tabla `expenses`. `ingest`
     consulta la tabla y **no sabe nada de las lápidas**; la app las filtra al bajar
     (`syncCloudExpenses`, 11-app-main.js ~297). `cloud.deleteExpense` traga los fallos con
     `.catch(()=>{})`, así que un borrado que no llegó a la nube no deja rastro.
   - Gemelos que `reconcileObDupes` quita en local y en la nube se quedan.
3. **Y al revés: la app esconde cargos de verdad** → app MÁS BAJA. Fusiona con
   `keyOf = día|importe|comercio` (sin hora) mientras la nube guarda por `fecha` completa (su
   clave única es `user_id,fecha,importe,comercio`). Caso medido: **230 € a las 11:31 y otros
   230 € a las 13:08 en el mismo sitio el 13/8** — dos compras reales, una sola fila en el móvil.

**Arreglo propuesto (pendiente de su OK, son dos tandas distintas):**
- **1b-A, barata y cierra el síntoma:** que `ingest` respete las lápidas. Ya carga `app_state`,
  así que solo tiene que descartar las filas cuya clave esté en `data.deleted`. Aparte, limpieza
  puntual de la nube para las que debieron borrarse ⚠ **una limpieza de datos no lleva flag**.
- **1b-B, delicada:** meter la hora en la clave de fusión del cliente. Toca el camino por el que
  entran TODOS los gastos, así que va sola, con su OK y con pruebas contra sus datos.

**Su rechazo de la 4.17.0.1 y qué se hizo** (`node scripts/errores.mjs --kind=beta`):

1. *«De otros bancos no hace nada y tampoco se ve para qué está, dado que ya puedes elegir los
   bancos abajo»* → **chip retirado**. No hacía nada porque el filtro de bancos arranca
   preseleccionado en la cuenta diaria y «de otros bancos» es justo lo contrario: cruce vacío
   siempre. El cajón `otrobanco` sigue vivo (es el que pinta «no es del día a día» en la fila).
2. *«Al modificarlo y guardarlo se bloquea la pantalla… solo si tiras para atrás puedes seguir»* →
   ⚠ **no era de la tanda**: viene de la **v3.108.0** y saltaba con cualquier blur del importe o
   del nombre. `ExpenseDetailSheet` se pintaba con `!exp || !editExp` pero sus candados iban con
   `!!exp`; al vaciar `editExp` el sheet desaparecía dejando `overflow:hidden` y el
   `preventDefault` de todo `touchmove`. Arreglado por los dos lados y con e2e que **cae** con el
   código anterior.

**Dos flakes de e2e cerrados el 17/8** (los arreglaron dos sesiones aparte, verificados y traídos a
`beta`): `rendimiento.spec.mjs` (la pasada «fría» usaba fechas que la app ya había parseado → medía
caliente contra caliente) y `bancos-acordeon.spec.mjs` (la app premonta las pestañas ocultas a los
3,2 s y `getByText(...).first()` cogía la copia escondida). Lección reutilizable en
`docs/memoria/e2e-getbytext-pestanas-premontadas.md`.

**Lo que queda decidido POR ÉL, no por nosotros:** ampliar `settings.expenseBanks` para que los
gastos de otros bancos cuenten en el presupuesto. Hoy no cuentan **por diseño** (evitar doble
conteo con los Fijos modelados), pero él lo vive como bug («no sale ni uno»). Tiene coste real.
La tanda 2 ya hace que al menos **se vea** cuáles son y por qué. **No elegir por él.**


**Para:** Cursor (coordinación + tandas de código) y Claude personal (diseño / chicha de dinero).  
**Repo:** `E:/Mi cartera` · trabajo en **`beta`** · **de uno en uno** · nada a `main` sin su OK.  
**No fable.** Cursor no lanza Claude: él pega el brief en Claude Code / Claude personal.

---

## Foto al volver

| Qué | Estado real |
|-----|-------------|
| `VERSION` en repo | **4.16.1** (`main` = `beta` tip `aeec4ad9`) |
| Pages live | **AÚN 4.15.0** / `apk.json` **35** — OTA de familia parada (outage de agosto; hay que relanzar deploy) |
| Su móvil | APK **4.16.0 (38)** o 4.16.1 (39). Wallet/divisa/presupuesto servidor = código 4.16 |
| Pareja / padre | Siguen en **4.15** por Pages |
| Crucero | Multidivisa + Wallet hechos. Pendiente: parpadeo tabs + overscroll Cartera |

**Primera higiene (Cursor, 10 min, sin Claude):** `gh workflow run deploy.yml --ref main` y comprobar `version.json` = 4.16.1. Sin eso, la familia no tiene 4.16 y el widget de ellos sigue con ingest viejo.

---

## Cómo nos repartimos (sí, Cursor se ve capaz)

Regla: **Claude diseña / cierra trampas de dinero; Cursor implementa tandas ya selladas; no dos IAs en los mismos ficheros.**

| Quién | Modelo | Qué |
|-------|--------|-----|
| **Tú** | — | OK entre tandas, pruebas en el móvil, no mezclar 4 frentes |
| **Claude personal** | **Opus / Ultra** | 3 briefs de diseño (abajo). No codear import ni widget hasta el veredicto |
| **Cursor** (Composer / GPT) | barato | Higiene Pages, tandas 1–N ya diseñadas, cats+i18n, filtro UI, «Movimiento», efectivo v1, tests/build/beta |
| **Claude Code** (Sonnet / code) | si Cursor se atasca | Solo **una** tanda a la vez, mismos paths, **después** del diseño Opus |

No hace falta que Claude Code «planee el universo»: el plan ya está aquí. Claude Code entra cuando una tanda es gorda (import tanda 1, widget nativo) y Cursor no debe quemar el mes.

---

## Orden de tandas (uno en uno)

Cada fila = una beta que él prueba. No empezar la siguiente sin OK (o «no lo puedo probar»).

### 0. Higiene — Cursor ahora
Relanzar Pages. Confirmar Mis bancos → v4.16.1 en su móvil (OTA o ya la APK).

### 1. Bugs de cifras (él lo vio en el crucero) — **Claude Opus diseña, Cursor implementa**
Síntomas reales (capturas 17/8):

- **Widget:** app Inicio **686 €** de 1.000; widget **891 €** / quedan 109 / «Puedes gastar 324 €». Al abrir la app el widget se pone bien; **al cabo de un rato vuelve a mentir**.
- **Padre, Revolut −204,54 €** en Cartera; sincroniza y se arregla. TR de él por **integración directa** cuadra; **Open Banking no**.

Causa ya conocida a medias (no inventar otra):

- Widget: la app empuja `monthBudgetStats` (`11-app-main.js`). **Con la app cerrada**, `TrExpenseListener` pisa `spent` con lo que devuelve **ingest** (`saveMonth`). Si ingest y la app no coinciden, o si `saveMonth` **no toca `afford`/`cash`**, el widget se descuadra solo. 4.16 alineó ingest↔app; Pages en 4.15 + APK vieja de familia = recaída. El «al cabo de un rato» encaja con una **noti de TR/Wallet** reescribiendo prefs.
- Saldos OB: `pickBankBalance` prefiere ITAV→CLBD (`08-motor-bank.js`). Un snapshot rancio / tipo raro / cuenta extra puede pintar **−200** hasta el siguiente sync. TR directo no pasa por esa lista.

**Done tanda 1:** widget = cabecera de Gastos tras noti con app cerrada; saldo OB de TR/Revolut no salta a un negativo inventado (o se marca «stale» en vez de pintar basura). APK nueva si toca Java.

### 2. Gastos: caos que cuenta / no cuenta + «Movimiento» — Cursor
- Lista Gastos: bloques o marcas claras **cuentan / no cuentan / ingreso / inversión-traspaso**.
- OB de TR: poder **renombrar** el comercio «Movimiento» (y que el override se recuerde).
- Detectar **banco del ingreso/pago** (ya hay `ent`; UI debe enseñarlo y al apuntar a mano no perderlo).

### 3. Filtro guapo también en + y al editar + calendario propio — Cursor
Reutilizar el sheet de `04-tab-gastos.js` (no `alert`/date nativo de Android). Categoría + banco + fecha con el teclado/calendario de la casa.

### 4. Más categorías + IA más lista — Cursor (cats) + Claude Sonnet (diccionario KW)
Heladería, joyería, crucero, Steam, Instant Gaming, etc. Tres idiomas. Ampliar `autoCategory` / KW. IA (`categorize`) solo si él tiene la clave; si no, KW primero.

### 5. Meta ahorrada = gasto del mes (temporal) — **Claude Opus diseña**
Palabras suyas: la meta marcada sustituye **temporalmente** el «gasto del mes»; gastar de esa hucha **no es** gasto corriente. Varios bancos ligados → al gastar de esos bancos se elige esa meta **sola**. Al llegar a **0**, vuelve el presupuesto normal.

Trampas (que Opus tiene que cerrar antes de codear):

- ¿Resta del saldo de la meta Y no cuenta en `monthBudgetStats`? ¿O sustituye el **techo** (budget) por el restante de la meta?
- Varios bancos + una meta vs varias metas.
- Widget e ingest tienen que usar **la misma regla** (lección 4.16).
- Sin inventar euros: si no hay tipo / no hay saldo, no se apunta.

### 6. Efectivo (cash) — Claude Opus 1 página, Cursor v1
Qué tienes, qué entra, qué sale, acorde con la app (cuenta `familia` / rol, no un segundo patrimonio inventado).

### 7. Import histórico seguro — plan YA sellado
[`plan-import-historico-seguro.md`](plan-import-historico-seguro.md) (híbrido C, agujeros A/B/C/N).  
**Cursor tanda motor** (tests rojo→verde, sin UI). Claude Opus solo si aparece un bloqueante nuevo. **No** destello/`shell.html`.

### 8. Parpadeo tabs / overscroll Cartera — Cursor cuando él esté para grabar
Pista: capa negra al tirar Cartera a la derecha; host transparente season. A/B temática Ninguna. No es de la APK Wallet (también 4.15).

### 9. Más adelante (no esta semana)
MyInvestor nativo, Hogar diseño OK, push FCM, pensiones, informe mensual (favorito pareja), splash nativo, Play Store.

---

## Briefs listos para pegar en Claude personal

### A — Widget + Revolut negativo (Opus / Ultra)

```
Repo: E:/Mi cartera · rama beta · VERSION 4.16.1 · canal beta
NO implementes. Diagnóstico + diseño de fix. No fable.

Síntomas (capturas 2026-08-17):
1) Widget «MI CARTERA · ESTE MES»: 891 € de 1.000, quedan 109, «Puedes gastar 324 €», TR 6.308 € · 07:38.
   App Inicio a la misma hora: gastado 686 € de 1.000, 22 €/día, patrimonio 190.649 €.
   Al abrir la app el widget se pone bien; al rato (app cerrada) vuelve a 891.
2) App del padre: Cartera Revolut −204,54 € (OB). Sync y se arregla. TR por integración directa SÍ cuadra; Open Banking de TR/Revolut a veces no.

Código:
- Widget prefs + saveMonth: android/.../MiCarteraWidget.java
- Noti pisa spent: TrExpenseListener.java → ingest JSON month.spent
- App empuja monthBudgetStats: src/modules/11-app-main.js ~1629
- Ingest alineado 4.16: supabase/functions/_shared/presupuesto.ts
- Saldos OB: pickBankBalance / applyBankBalances en 08-motor-bank.js

Criterios de diseño:
- Misma cifra widget = cabecera Gastos = ingest, también con app cerrada.
- saveMonth no debe dejar afford/cash de otro cálculo.
- Saldo OB: sin tipo claro o snapshot viejo → «—» o stale, NUNCA un negativo inventado.
- Tests: presupuesto-servidor ya exige ingest=app; ampliar al payload del widget.
- APK si tocas Java. Circuito: docs/RELEASE.md

Devuelve: causa raíz, parche mínimo, archivos, tests, si hace falta APK. No codear.
```

### B — Meta ahorrada sustituye gasto del mes (Opus / Ultra)

```
Repo: E:/Mi cartera · rama beta · AGENTS.md §4 y §7 bis
NO implementes. Diseño de producto + modelo de datos. No fable.

Pedido suyo (crucero):
- Opción en una meta ahorrada: mientras esté activa, ESE bote es el «gasto del mes» (no el presupuesto corriente).
- Gastar de ahorros de la meta ≠ gastar del mes normal.
- Si marcas varios bancos en esa meta: un gasto de esos bancos elige la meta solo (si nació marcada así).
- Al llegar a 0 €, vuelve el presupuesto de siempre.

Hoy: monthBudgetStats + reservedSince + goals en 08-motor-bank / 09-tab-debts-goals. Widget e ingest tienen que compartir la regla (bugs 4.16).

Cierra:
- ¿Sustituye el techo (budget) o descuenta del spent o marca categoría neutra?
- Varias metas a la vez: ¿prohibido o prioridad?
- Qué pasa con Apuntar, Wallet/ingest, widget, «fin de mes en paz».
- Campos nuevos (goal.spendAsBudget, goal.banks[]) y migración si hace falta.
- Criterios de done en cristiano (RELEASE_NOTES) + tests (misma cifra en dos sitios).

Devuelve diseño cerrado o preguntas bloqueantes (máx 5). Sin código.
```

### C — Import histórico (solo si hace falta re-leer)

Ya hay luz verde Opus (5/8) en `docs/briefs/plan-import-historico-seguro.md`.  
Cursor ejecuta **tanda 1 motor**. No re-pedir diseño a menos que el diff abra A/B/C/N.

---

## Revisión Claude Code — 2026-08-17

Repasado el plan contra el repo y la nube. **El orden y la cobertura son correctos** (las 12 cosas
del crucero están todas). Cuatro correcciones de hecho:

### 1. El agujero de la familia es más gordo de lo que dice la tabla

| | Repo | **Live (Pages)** |
|---|---|---|
| `version.json` | 4.16.1 | **4.15.0** |
| `apk.json` | 39 / 4.16.1 | **35 / 4.12.0** |

No es solo que la web esté en 4.15: **`apk.json` publicado apunta a 4.12.0**. A padre y pareja la
app les dice que la APK más nueva es la de julio. El asset `Mi-Cartera-4.16.1.apk` (6,1 MB) **sí
existe** en la release v4.16.1, con **0 descargas** — coherente: nadie lo ha visto nunca.

Consecuencia para la tanda 1: **el móvil del padre corre el nativo de 4.12.0** — sin lector de
Google Wallet, con el `TrExpenseListener` y el widget viejos. Diagnosticar su Revolut contra ese
binario es perseguir un fantasma.

### 2. Por qué falló el deploy (no es un build roto)

Los 3 runs de `deploy.yml` del 6/8 fallaron con
`The job was not acquired by Runner of type hosted` — **era el outage de Actions**, el job nunca
cogió runner. Relanzar ahora debería pasar. Cursor tenía razón; queda confirmado para que nadie se
ponga a «arreglar» el workflow.

### 3. Tanda 1: el bug del widget YA está diagnosticado — no gastar una ronda de diseño en él

El brief A pide a Opus un diagnóstico que ya está hecho. **Causa raíz confirmada leyendo el código:**

Hay **dos escritores** de las prefs del widget y **no escriben lo mismo**:

| Escritor | Cuándo | Escribe |
|---|---|---|
| `MiCarteraPlugin.updateWidget` ([:151](../../android/app/src/main/java/com/micartera/app/MiCarteraPlugin.java#L151)) | app abierta | `spent`, `budget`, `cash`, `afford`, `cashLabel`, `updated` |
| `MiCarteraWidget.saveMonth` ([:47](../../android/app/src/main/java/com/micartera/app/MiCarteraWidget.java#L47)) | **noti con la app cerrada** | `spent`, `budget`, `updated` — **y nada más** |

`build()` sigue leyendo `afford` y `cash` de las prefs ([:71](../../android/app/src/main/java/com/micartera/app/MiCarteraWidget.java#L71)).
Así que cuando entra una noti de TR/Wallet con la app cerrada, `spent` se pisa con el número nuevo
y **`afford` se queda con el del último push de la app**. Eso es exactamente la captura: *«891 de
1.000 · quedan 109 · ✅ Puedes gastar 324 €»* — 109 y 324 no pueden salir del mismo cálculo.

Y encaja con el síntoma entero: abres la app → `updateWidget` escribe todo coherente → cierras →
llega una noti → `saveMonth` pisa solo `spent` → **vuelve a mentir**. `cash` se queda rancio igual.

**Descartada** una hipótesis por el camino: `ingest` **sí** manda el número bueno
(`month = { spent: stats.shown, … }`, [ingest/index.ts:256](../../supabase/functions/ingest/index.ts#L256)),
así que no hay lío `shown`/`spent` en la frontera. El cliente y el servidor comparten fórmula
(`CAT_NEUTRAS` + `reservadoDesde` en [`_shared/presupuesto.ts`](../../supabase/functions/_shared/presupuesto.ts)).

**Lo que NO queda explicado y necesita sus datos reales:** el salto 891 vs 686 (Δ 205 €). Misma
fórmula en los dos sitios ⇒ la diferencia viene de **datos de entrada distintos**, no del cálculo.
Sospecha principal: `ingest` calcula sobre el `app_state` **de la nube**, que puede ir por detrás
del estado local del móvil. Eso se cierra simulando contra su nube, no leyendo código.

→ **Partir la tanda 1 en dos.** El widget y el Revolut del padre no comparten ni ficheros ni causa
(él mismo dijo «quizás son dos cosas diferentes»). Juntas, un rechazo se lleva las dos por delante.

- **1a — widget coherente.** Fix confirmado en Java (que `saveMonth` deje de mentir sobre
  `afford`/`cash`) + test. **Cambia nativo ⇒ APK nueva.**
- **1b — saldo OB inventado.** `pickBankBalance` ([08-motor-bank.js:16](../../src/modules/08-motor-bank.js#L16))
  recorre `ITAV→XPCD→CLBD→OTHR→PRCD` y, si no casa ninguno, **cae a `balances[0]` a ciegas** sin
  mirar tipo ni fecha. Ahí es donde puede colarse un −204,54. Candidato fuerte, **pero sin la
  respuesta real de Enable Banking para el Revolut del padre no se confirma.**

### 4. Cosas pedidas que el plan se deja fuera

- **Ajustes → «Dinero» a medio limpiar** (petición suya del 4/8, sigue viva): quitar «Presupuesto
  mensual» y «Bancos de gasto diario» (duplicados), «Comparar monedas» sale vacío. Barato y se ve.
- **La decisión de fondo detrás de «gastos que no cuentan»** — la tanda 2 arregla cómo se *pintan*,
  pero su queja «todos los malditos gastos que no sale ni uno» es **qué bancos alimentan el
  presupuesto** (`settings.expenseBanks`). Eso es **una decisión suya con coste de doble conteo**,
  no un bug. Ver [`brief-gastos-que-no-entran.md`](brief-gastos-que-no-entran.md). Hay que
  preguntárselo, no elegir por él.
- **RELEASE_NOTES por tanda** — no aparece en el plan y es regla de la casa.
- **Tanda 5 (meta = gasto del mes) depende de la 1.** Reescribe `monthBudgetStats`, que es justo lo
  que la 1 estabiliza, y tiene que aterrizar en **tres** sitios (cliente, ingest, widget). No
  empezarla hasta que la 1 esté aprobada.

### Reparto (actualizado: él está en Claude Code, no en Claude web)

La tabla de arriba asumía «Claude diseña, Cursor implementa». Con Claude Code en el repo el corte
natural es otro: **Claude Code se lleva lo que toca dinero, nativo o la nube (diseño + código +
tests, de punta a punta); Cursor se lleva la anchura mecánica** (categorías × 3 idiomas, i18n,
reutilizar el sheet de filtros, textos). Sigue en pie: **no dos IAs en los mismos ficheros**.

---

## Qué no tocar en paralelo

- Destello / `src/shell.html` / portal season (salvo tanda 8, sola).
- `MICARTERA_WEBDEBUG=1` en release.
- Cherry-pick a `main`.
- Inventar tipos de cambio ni saldos.
