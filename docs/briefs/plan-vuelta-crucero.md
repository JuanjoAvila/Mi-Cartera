# Plan — Vuelta del crucero (2026-08-17)

## 📍 DÓNDE ESTAMOS — mirar esto primero (última actualización: 17/8 noche, 4.18.1)

Cualquiera (Cursor, Claude, él desde el móvil) puede retomar desde aquí sin preguntar a nadie.

| Tanda | Estado | Notas |
|---|---|---|
| 0 · Pages / familia | ✅ **Prod 4.17.1** · APK **41** | Él: «subió perfecta a prod». Widget NO entra. |
| 1a · Widget coherente | ⏸ **PARADA** — hasta que compre y re-pruebe | Rechazada 4.16.2 (907 vs 709). Arreglo ingest **4.17.2** sigue en `beta`, **no** va en 4.18.x. Causa real más abajo. |
| 1b · Revolut −204 del padre | 🟡 **Se puede mirar** con APK 41 | Dejaba el nativo de 4.12.0 |
| 2 · Gastos: qué cuenta / «Movimiento» / banco | ✅ **EN PRODUCCIÓN 4.17.1** | Aprobada 17/8 |
| 3 · Fecha en `+`/editar + calendario + filtro gasto diario | 🔧 **EN 4.18.1 beta** (re-revisión) | Aprobó el filtro y el calendario. Extra: el banco al apuntar es pastilla que se despliega (como filtros de Gastos), no la fila de chips. |
| 4 · Más categorías + KW | 🔧 **EN 4.18.1 beta** (re-revisión) | Aprobó heladería/joyería/videojuegos. Extra: **Recibos** + IA en cualquier gasto (ALLOWED completo). |
| 5 · Meta = gasto del mes | ⛔ **NO EMPEZAR** | Reescribe `monthBudgetStats`. Esperar a que la 1a esté aprobada |
| 6 · Efectivo | ⬜ Libre | Opus 1 página, Cursor v1 |
| 7 · Import histórico 3 meses | ⬜ Plan sellado | `plan-import-historico-seguro.md`. La 3 deja Gastos listo para que entre como un banco más. |
| 8 · Destello / scroll / overscroll | 📌 **Después de probar la 3** | Se nota MÁS con temporada, **también SIN**. Brief: `brief-claude-destello.md`. **Opus/Ultra**, no Sonnet. |
| 9 · Ajustes → Dinero | ✅ **HECHO en 4.14.0** | No hay tanda. El plan viejo estaba rancio: presupuesto y bancos de gasto diario ya salieron de Ajustes (viven en Resumen / Cartera); comparar monedas es el conversor. |
| 10 · MyInvestor nativo | ⬜ Más adelante | WebView nativa si el reCAPTCHA OTA no cuela (ver ROADMAP) |
| 11 · Hogar · diseño | ⬜ Más adelante | Funciona; falta diseño OK (Claude Design) |
| 12 · Push FCM | ⬜ Más adelante | Notis reales con la app cerrada, no solo el listener de Wallet |
| 13 · Pensiones | ⬜ Más adelante | |
| 14 · Informe mensual | ⬜ Más adelante | Favorito de la pareja. Ya hay imagen WhatsApp; pulir / automatizar |
| 15 · Splash nativo | ⬜ Más adelante | APK: el hueco antes del icono en Android 12+ |
| 16 · Limpieza del repo | ⬜ Otra tanda, no visual | Basura + docs rancio. **No** es Clean Code de libro ni va a hacer la app más rápida. Alcance abajo. |
| ∞ · Play Store | ⬜ **LO ÚLTIMO** | Data safety + NotificationListener. **Nunca se adelanta.** Si entra algo nuevo, se inserta ANTES. Si se implementa, él se tienta de publicar, y no quiere hasta que esté hiper pulida a su criterio. |

**Play Store no se mueve de última.** Pedido 17/8 noche. Sideload / APK de GitHub sigue valiendo.

**Estado del repo:** `main` = **4.17.1** (producción, APK 41). `beta` = **4.18.1** (tandas 3+4 + Recibos/IA/banco del +). El ingest/widget **4.17.2** sigue en el historial de `beta` pero **no se promociona** con esta tanda (misma trampa que la 2: cherry-pick, no `beta` entera).
Migración **0021** (`ob_name`) ya está en `main` (4.17.0). El ingest 4.17.2 **NO** se redespliega a prod hasta que él re-pruebe el widget.

### ⚠ NO PULSAR «Promocionar beta» VACÍO (17/8 noche, Claude asustó con razón)

`e282ec59` (widget 4.17.2: `presupuesto.ts` + `ingest/index.ts`) está **solo en `beta`**, no en `main`. Comprobado: `git merge-base --is-ancestor e282ec59 origin/main` falla.

Si Actions → Promocionar beta se lanza **sin** `tandas` ni `commits`, hace `merge -X theirs origin/beta`. Eso **sí** mete el widget en `main`.

Matices que Claude mezcló:

1. Ese merge **no despliega Edge Functions al momento.** El push del promote usa `GITHUB_TOKEN` y GitHub no dispara otros workflows (por eso el promote lanza `deploy.yml` a mano para Pages). **No** lanza `supabase.yml`.
2. El susto de verdad es el **siguiente** `supabase functions deploy` (push humano a `supabase/**` o «Run workflow» de Deploy Supabase): despliega **todas** las funciones del árbol de `main`. Si el widget ya está en `main`, se va a prod aunque nadie lo haya aprobado.
3. Hay **un** proyecto Supabase. La app en canal beta habla con las mismas funciones que la familia. El widget con la app **cerrada** no se puede re-probar de verdad sin desplegar ingest, y eso lo ven todos.

**Para subir las tandas 3+4 a la familia sin el widget:** vía `commits` del promote (o cherry-pick a mano) de `a2cf7367` + `302f2784` (tocan `ingest_logic.ts` y `categorize`, **no** `ingest/index.ts` ni `presupuesto.ts`). **No** mezclar `e282ec59`. **No** dejar que una IA pulse el promote vacío «porque prod ya está mal».

**No se promociona nada hasta que él lo pida** tras revisar 4.18.1 en el móvil.

### ★ POR QUÉ EL WIDGET Y LA APP NO CUADRAN — 17/8, corregido la misma noche

Medido con `node scripts/diag-widget.mjs` (lee su nube) **y con el extracto de Trade Republic**.

1. **La fórmula NO es el problema.** Servidor y cliente dan lo mismo con la misma entrada.
2. **El widget cuenta filas que la app ya no ve.** Ingest leía la tabla `expenses` a pelo:
   - lápidas en `state.deleted` que siguen vivas en la nube (`deleteExpense` traga errores);
   - **notis gemelas del mismo cargo.** Caso medido: dos filas de 230 € APOLLON GALLERY el 13/8
     (11:31 `regalos` y 13:08 `bares`), las DOS `macrodroid`. El extracto de TR tiene **un** 230
     y **un** 115. Wallet avisó a una hora y TR a otra (97 min, fuera de la ventana de 10 min).
     Claude tomó las horas distintas por «dos compras reales». El banco dice que no.
3. **NO meter la hora en la clave de fusión.** Eso haría que la app también sumara el gemelo
   y mentiría igual que el widget. La app ya hace bien: `día|importe|comercio`.

**Arreglo (4.17.2, ingest, sin APK):** `filasComoLaApp` (lápidas + una fila por clave) antes de
`statsDelMes`, y al insertar se ignora un segundo aviso el mismo día / mismo comercio / mismo
euro. Desplegar `ingest` desde `beta` para probarlo. No borrar filas de la nube a mano: el
conteo ya las ignora; el insert deja de criar más.

**Descartado:** «1b-B meter la hora en la clave». Era el arreglo al revés.

**Su rechazo de la 4.17.0.1 y qué se hizo** (`node scripts/errores.mjs --kind=beta`):

1. *«De otros bancos no hace nada y tampoco se ve para qué está, dado que ya puedes elegir los
   bancos abajo»* → **chip retirado**. No hacía nada porque el filtro de bancos arrancaba
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

**Decisión suya 17/8 (ya no está abierta):** si un banco está **marcado como gasto diario**, sus
movimientos cuentan en el presupuesto **siempre** (Revolut + Trade Republic, no solo el
principal), **salvo** inversión/traspaso (`CAT_NEUTRAS`). Un banco que no está marcado (Sabadell)
se ve al pedirlo y no come el techo. Así el import de 3 meses entra como un banco normal.

**Para:** Cursor (coordinación + tandas de código) y Claude personal (diseño / chicha de dinero).  
**Repo:** `E:/Mi cartera` · trabajo en **`beta`** · **de uno en uno** · nada a `main` sin su OK.  
**No fable.** Cursor no lanza Claude: él pega el brief en Claude Code / Claude personal.

---

## Foto ahora (17/8 noche)

| Qué | Estado real |
|-----|-------------|
| `VERSION` en esta rama | **4.18.0** (`beta`, tandas 3+4) |
| Pages live / familia | **4.17.1** · APK **41** |
| Widget 4.17.2 | En historial de `beta`, **no** promocionar con la 4.18.0 |
| Pareja / padre | 4.17.1 por OTA |
| Crucero pendiente | Destello/overscroll = tanda 8 |

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

### 3. Filtro guapo también en + y al editar + calendario propio — **HECHO en 4.18.0 / pulido 4.18.1**
Calendario de la casa (`McCal`), no el nativo de Android. Fecha al apuntar y al editar.
**Y** el filtro de Gastos arranca con **todos** los marcados como gasto diario (`expenseBankEnts`), no solo el principal. Decisión suya 17/8.
En 4.18.1 el banco al apuntar es una pastilla que se despliega (como el cuadradito de filtros), no la fila de chips.

### 4. Más categorías + KW — **HECHO en 4.18.0 / Recibos+IA 4.18.1**
Heladería, joyería, videojuegos, **Recibos**. Tres idiomas. `autoCategory` / KW cliente + `ingest_logic.ts`. Crucero se queda en Viajes. IA (`categorize`): ALLOWED = todas las categorías; botón en cualquier gasto, no solo Otros. KW primero; IA solo si cae en otros y hay clave.

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
Pista: capa negra al tirar Cartera a la derecha; host transparente season. A/B temática Ninguna. No es de la APK Wallet (también 4.15). Brief: `brief-claude-destello.md`. **Opus/Ultra**.

### 9. Ajustes → Dinero — **HECHO en 4.14.0** (no hay tanda)
El plan del 4/8 pedía quitar «Presupuesto mensual» y «Bancos de gasto diario» (duplicados) y que «Comparar monedas» no saliera vacío. Ya está: presupuesto vive en Resumen, bancos de gasto diario en Cartera, comparar monedas es el conversor (`st_cur_convert`). Si Ajustes → Dinero se ve raro, es otra cosa: se mira entonces, no se reabre esta limpieza.

### 10. MyInvestor nativo — más adelante
Si el intento OTA de reCAPTCHA (4.6.4) no cuela, WebView nativa que cargue myinvestor.es. APK nueva.

### 11. Hogar · diseño — más adelante
La función existe (Perfil → Tu gente). Falta que se vea bien. Claude Design, no Cursor a ciegas.

### 12. Push FCM — más adelante
Notis de verdad con la app cerrada (presupuesto, bancos caídos), no solo el listener de Wallet/TR.

### 13. Pensiones — más adelante
Aún no hay diseño. Claude Opus una página antes de codear.

### 14. Informe mensual — más adelante (favorito pareja)
Ya hay imagen para WhatsApp (Ajustes → Avanzado + popup día 1). Pulir / que salga solo / que se pueda reenviar.

### 15. Splash nativo — más adelante
El hueco «algo raro antes del icono» con la app cerrada es `Theme.SplashScreen` en Android 12+. No viaja por OTA → APK.

### 16. Limpieza del repo — otra tanda, **no visual**, **no es rendimiento**
Pedido 17/8 noche: «limpiarme toda la basura, organizarmelo y Clean Code, es un caos a simple vista».

**Qué es (y qué no).** A simple vista parece un caos porque la fuente son 16 JS concatenados a un HTML, i18n a paladas y `10`/`11` gordos. Eso **no es suciedad**: está decidido ([`docs/adr/0002-monolito.md`](../adr/0002-monolito.md)) para que Pages + offline + cualquier IA toquen el mismo repo. Las prácticas de *esta* casa están en `AGENTS.md` (sin JSX, sin deps nuevas, tres idiomas, no inventar euros, tests que abortan si nadie los corre). Un Clean Code de libro (capas, TypeScript, JSX, renombrar módulos por dominio) **rompería** eso y no entra en esta tanda. El ROADMAP ya dice: se reagrupa por dominio **cuando duela**, no antes.

Borrar docs y volcados **no acelera el móvil**. Si un día duele el tamaño, eso es el presupuesto gzip (`tests/presupuesto-rendimiento`) y JS muerto que *sí* se ensambla — otra pasada, con medida, no «organizar carpetas».

**Sí entra (higiene de lo acumulado):**
- Restos de depurar: `tools/movil/_uidump*`, `_flicker_frames/` (los de esta noche ya fuera + gitignore). Barrer si queda más.
- Briefs y planes que **mienten** (foto de Pages 4.15, «Dinero a medio limpiar», decisiones ya cerradas). Un doc que afirma algo tiene que ser verdad hoy.
- Código muerto y comentarios del *qué* / de una versión anterior (norma §3 bis). Flags siempre a `false`.
- Scripts de un solo uso que se quedaron (`_algo.mjs` en raíz, sondas).
- ⚠ Ramas y worktrees: **preguntar antes**. Puede haber trabajo sin subir.

**No entra:** reescribir Gastos/Cartera «bonito», extraer servicios, prettier masivo, tocar fórmulas de dinero «de paso».

Ya había un 1-BIS en `docs/memoria/mi-cartera-backlog-2026-08.md`. Esta tanda es esa, con el corte de arriba. Cursor o Claude barato; **no** Opus. **No** mezclar con destello (8) ni con import (7).

### ∞. Play Store — **lo último de lo último**
Formulario Data safety + justificar NotificationListener. Nombre nuevo (ya hay otra «Mi Cartera» en Play) — ver ROADMAP.

**No se implementa hasta que él diga que la app está hiper pulida**, a su criterio. Si se hace antes, se tienta de publicar. Cualquier tanda nueva (limpieza, destello, lo que salga) se inserta **delante**, nunca detrás. El sideload / la APK de GitHub no esperan a esto.

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

- **Ajustes → «Dinero» a medio limpiar** — **ya no**. Hecho en 4.14.0 (ver tanda 9). El plan del crucero estaba rancio.
- **Qué bancos alimentan el presupuesto** — **decidido 17/8**: marcado como gasto diario → cuenta, salvo neutras. Implementado en la tanda 3 (filtro UI = `expenseBankEnts`).
- **RELEASE_NOTES por tanda** — regla de la casa; 4.18.0 lleva `filtro-apuntar` y `mas-categorias`.
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
