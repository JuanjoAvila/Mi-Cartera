# Plan — Leer las notis de Google Wallet (cualquier tarjeta) y apuntar en su divisa

**Pedido suyo, 2026-08-06:** «*no lee todas?? solo las de trade republic pues eso habría que corregirlo
para todas las de Google Wallet porque en el crucero pagaré con revolut en otra moneda y me gustaría que
me lo leyera... y me lo apuntará bien como debe ser*».

**Urgencia:** el crucero sale el **7/8** (mañana). **Esto NO llega** — necesita APK nueva. Ver §6, que es
lo que sí puede hacer durante el viaje.

---

## 1. Por qué hoy solo entra Trade Republic

`TrExpenseListener.onNotificationPosted()` tiene exactamente dos caminos:

- `de.traderepublic.app` → parsea el gasto y lo manda a `ingest`.
- Bancos españoles (`BANK_PACKAGES`) → **no parsea nada**, solo despierta el sync de Open Banking,
  porque «las notis suelen ser genéricas y se rompen; PSD2 trae el movimiento real».

Todo lo demás se descarta. **Google Wallet no está en ninguna de las dos listas**, y es justo el que
notifica *todas* las tarjetas — incluida Revolut, que no tiene Open Banking conectado aquí.

De hecho las dos capturas que originaron esta tanda **eran de Google Wallet**, no de TR.

---

## 2. El formato real (dos muestras suyas, no inventadas)

```
Título: 10638 CORNELLAÂ▯ SPLAU SC
Texto:  76,08 € con Trade Republic Visa Card ••9116
```

```
Título: 1331 BAR
Texto:  31,00 €  ·  ...e Republic Visa Card ••7510 · Visa
```

**El comercio va en el TÍTULO y el importe en el TEXTO — al revés que TR**, que lo mete todo en una
frase («Has gastado 12,50 € en Mercadona»).

Por accidente, el parser actual ya lo haría bien: `extraerComercio` no encuentra « en » en el texto y cae
al título, y `extraerImporte` saca los 76,08. **Pero es accidente, no diseño**, y trae el problema de §3.1.

---

## 3. Las cuatro trampas (leerlas antes de codear)

### 3.1 `clasificar()` SÍ mira el título — y en Wallet el título es el comercio

El 6/8 se arregló que el ruido de TR no se buscara en el nombre del comercio, porque «BAR STOP» picaba en
`stop` y el gasto se tiraba en silencio. **Ese arreglo cubre el texto, no el título**: `frase` sigue
siendo `norm(titulo + " " + …)`.

Con TR daba igual (el título es «Trade Republic»). **Con Wallet el título ES el comercio**, así que el bug
del bar vuelve entero por la otra puerta. Un «BAR STOP» o un «SEGURIDAD 24H SL` en el título de una noti de
Wallet se descartaría como ruido.

→ **Hay que meter `fuente` en el payload** (`"tr"` / `"wallet"`) y que `clasificar()` sepa que en Wallet
el título no se escanea. No vale con parchear `extraerComercio`.

### 3.2 Doble notificación = doble gasto

Una compra con la tarjeta de TR dispara **las dos** notis: la de TR y la de Wallet. Hoy no pasa nada
porque Wallet se ignora; en cuanto se lea, cada compra entra dos veces.

El dedup del servidor (mismo `user_id` + mismo `importe` a menos de 10 min) **lo tapa mientras el importe
sea idéntico**. Deja de valer en cuanto haya divisa: si TR notifica 41,80 € y Wallet 1.520,00 TRY, son dos
importes distintos y entran los dos. → El dedup necesita mirar también **comercio + ventana**, o que Wallet
tenga preferencia sobre TR cuando la tarjeta es la misma.

### 3.3 Wallet notifica cosas que no son compras

Transporte (validar en el metro), pases de embarque, devoluciones, tarjetas de fidelización. La lista
`IGNORAR` está escrita contra el vocabulario de **Trade Republic** (intereses, round-up, saveback, órdenes)
y no dice nada del de Wallet. Hay que ampliarla con muestras reales, **no a ojo**.

### 3.4 El paquete hay que verificarlo en su móvil

Google Wallet suele ser **`com.google.android.apps.walletnfcrel`**, pero según versión y país también posta
`com.google.android.gms`. Mismo criterio que el comentario de `TR_PACKAGE`: **verificar en Ajustes → Apps**,
no darlo por bueno.

---

## 4. Qué hay YA de multidivisa (y qué falta)

De la 4.14.0, hecha justo para este crucero:

- `CUR_LIST` / `CUR_SYM` con **TRY** incluida; tipos del BCE vía `api.frankfurter.dev` (ojo: `.dev`, el
  `.app` hace 301 y la CSP lo cortaba).
- `toEurAmt(n, cur, state)` convierte con `state.fxRates` (XXX→EUR).
- **La regla de la casa, que aquí manda:** «**sin tipo no guarda**». Si falta el cambio, se avisa; no se
  inventa un número. Lo mismo debe valer para el ingest.
- Al apuntar a mano, la moneda del apunte es independiente de la de visualización, y se guarda **siempre
  en €** con `origAmount` / `origCur` como informativos.

**El agujero que hay que tapar antes de nada:** `origAmount` / `origCur` **solo existen en el cliente**
(`src/modules/14-v4-screens.js:588`). No hay columna en `expenses` y `rowToExpense` (`00-core.js`) **no los
lee de vuelta**. O sea: apuntas 1.520 ₺, se guardan 41,80 €, y **en cuanto el gasto da la vuelta por la
nube te has quedado sin saber que fueron liras**. Con las notis de Wallet esto pasa de molestia a problema,
porque el histórico del crucero entero saldría en € pelados.

→ Migración additiva: `alter table public.expenses add column if not exists importe_orig numeric,
add column if not exists divisa text;` + mapear en `rowToExpense` + escribir desde `ingest`.

**Y el tipo de cambio en el servidor:** `ingest` ya lee `app_state` para el presupuesto, así que puede leer
`st.data.fxRates` y convertir **con exactamente los mismos tipos que ve la app**. Si no hay tipo para esa
divisa: guardar `importe_orig` + `divisa`, dejar el gasto marcado como pendiente de cambio y **no inventar
el euro**.

---

## 5. Plan por pasos

| # | Paso | Dónde | Verificable sin móvil |
|---|---|---|---|
| 1 | `fuente` en el payload (`tr`/`wallet`), por defecto `tr` | `TrExpenseListener.java` + `ingest/index.ts` | sí |
| 2 | `clasificar(texto, titulo, fuente)`: con `wallet`, el título no se escanea | `_shared/ingest_logic.ts` | **sí, con tests** |
| 3 | `parseWallet(titulo, texto)`: comercio del título, importe + divisa del texto | `_shared/ingest_logic.ts` | **sí, con tests** |
| 4 | Migración `importe_orig` + `divisa`; escribir en `ingest`; leer en `rowToExpense` | `supabase/migrations/` + `00-core.js` | sí |
| 5 | Conversión con `app_state.data.fxRates`; sin tipo → no inventar | `ingest/index.ts` | sí |
| 6 | Dedup TR vs Wallet de la misma compra (§3.2) | `ingest/index.ts` | sí |
| 7 | Paquete de Wallet + ruta en el listener (reusa la cola de reintentos) | `TrExpenseListener.java` | **no: Android Studio** |
| 8 | Enseñar la divisa original en el detalle del gasto | `src/modules/04-tab-gastos.js` | sí (e2e) |
| 9 | Ampliar `IGNORAR` con el vocabulario de Wallet | `_shared/ingest_logic.ts` | solo con muestras reales |

Los pasos 1-6 y 8 se pueden hacer y testear **sin tocar el móvil**. El 7 es el que exige APK, y el 9 exige
que él mande capturas.

---

## 6. Qué puede hacer él en el crucero (esto sí está listo hoy)

**Apuntar a mano con la moneda del sitio ya funciona desde la 4.14.0.** En Apuntar hay chips de moneda
(₺ / € / $…), recuerda la última elegida, y guarda en € con el tipo del BCE. Si no hay tipo, avisa en vez
de guardar mal.

Dos cosas que le vendría bien saber antes de salir:

1. **Que compruebe que la lira tiene tipo** antes de embarcar (Ajustes → Dinero → aplicar TRY). Si el
   móvil se queda sin datos en alta mar, sin tipo descargado no podrá apuntar en liras.
2. **Que haga una captura de la PRIMERA noti de Google Wallet de un pago con Revolut en liras.** Es el
   dato que falta para el paso 3: **nadie sabe cómo escribe Wallet un importe en divisa** (`1.520,00 ₺`,
   `TRY 1520.00`, `₺1,520.00`…) ni si añade el equivalente en €. Sin esa muestra, cualquier parser que
   se escriba es una adivinanza — y aquí las adivinanzas se pagan en números mal pintados.

---

## 7. Modelo recomendado

**Opus alta.** Toca dinero real, divisas y una migración: el tipo de error que sale caro es el silencioso
(un importe convertido con un tipo inventado no lo caza ningún test). **No fable.**
