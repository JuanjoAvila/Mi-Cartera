# Brief — Gastos que no entran (traspaso a Claude de PC)

**Sesión origen:** Claude Code en la web (móvil), 2026-08-06. **Rama:** `claude/gasto-no-registrado-az0b8z`
(dos commits: `232f0a4` y `c758ab2`).
**Repo:** `E:/Mi cartera` · **Reglas:** `AGENTS.md` — canal beta primero, editar `src/` + `npm run build`,
textos es/en/ca, nada de `alert` nativo.

Esta sesión salió de dos capturas suyas: un gasto de **76,08 € en Splau (6/8)** que no entró, y otro de
**31,00 € en «1331 BAR» (dom 19/7, 9:52)** que su padre lleva meses diciendo que no le sale.

> **Lo que se puede tocar sin miedo:** `supabase/functions/`, `tests/`, `android/app/src/`, `docs/`.
> Del bundle web solo se ha tocado **`src/modules/00-core.js`** (una keyword de categoría).

---

## 1. Lo que ya está hecho y verificado

| Qué | Dónde | Verificado con |
|---|---|---|
| El ruido de TR ya no se busca en el nombre del comercio | `_shared/ingest_logic.ts` → `clasificar()` | 9 comercios trampa + 9 notis de ruido reales, `tests/ingest-classify.test.mjs` |
| `limpiarTexto()`: fuera controles, NUL e invisibles antes de guardar | `_shared/ingest_logic.ts` | tests + `ingest.test.ts` |
| `extraerComercio` con `\b` (ya no parte por el «en» de «ordEN») | `_shared/ingest_logic.ts` | `ingest.test.ts` |
| Cola de reintentos del lector de notis | `TrExpenseListener.java` | **solo sintaxis** (ver §2) |
| «bar» sin espacio: los bares que ACABAN en bar salen de «otros» | `ingest_logic.ts` + `src/modules/00-core.js` | `tests/categories.test.mjs` + `ingest-classify` |
| Los tests dejan de usar una copia desfasada de `clasificar()` | `tests/ingest-classify.test.mjs` | carga el `.ts` real vía esbuild |

**Prueba de regresión de verdad** (comparando contra el código de producción `3a47eaf`):

```
BAR STOP                antes=ignorado  ahora=gasto
AUTOESCUELA STOP        antes=ignorado  ahora=gasto
RESTAURANT EL LIMITE    antes=ignorado  ahora=gasto
BAR EL DEPOSITO         antes=ignorado  ahora=gasto
CAFE RECARGA            antes=ignorado  ahora=gasto
CODIGO BCN              antes=ignorado  ahora=gasto
CONFIRMA SL             antes=ignorado  ahora=gasto
CORNELLA\u0000 SPLAU    comercio: "CORNELLA\u0000 SPLAU" → "CORNELLA SPLAU"
```

---

## 2. Lo que NO se pudo hacer desde la web — te toca a ti

1. **Compilar el Java.** No hay Android SDK en el contenedor. `TrExpenseListener.java` pasó por `javac`
   y **todos** los errores son `cannot find symbol` / `package does not exist` (falta `android.jar`):
   ni un error de sintaxis. Pero eso **no es compilar**. Ábrelo en Android Studio antes de nada.
2. **Generar la APK.** La cola de reintentos es nativa: **sin APK nueva el móvil no la tiene.**
   `build.gradle` sigue en `versionCode 35` / `versionName 4.12.0` a propósito — **no lo toqué** porque
   `public/apk.json` tiene que apuntar a una release que exista de verdad (AGENTS §6.5), y desde aquí no
   se puede publicar el asset. Al subir versión: `versionName` = `VERSION`, `versionCode` += 1,
   `npm run apk:prep` (**nunca copiar `public/` a `www/` a mano**), release y `apk.json`.
3. **Mirar el panel de errores.** `npm run errores` necesita credenciales que aquí no hay. **Es lo que
   decide el diagnóstico del gasto de Splau** — ver §3.
4. **Publicar.** Lo del servidor entra solo al llegar a `main` (`supabase.yml`). Lo de
   `src/modules/00-core.js` es bundle web → **subir versión y pasar por beta**, como manda la casa.

---

## 3. Lo que sigue SIN saberse (no te lo inventes, compruébalo)

### El gasto de Splau, 76,08 €, 6/8 ~11:01

Descartado que sea la clasificación: `10638 CORNELLA SPLAU SC` entra como `gasto` con el código de
producción, importe y comercio correctos. Quedan dos causas y **el panel de errores las separa**:

- **Si en `app_events` hay un `INGEST: no se pudo guardar el gasto`** → fue la basura de codificación del
  datáfono (en la noti salía `10638 CORNELLAÂ▯ SPLAU SC`). Si el carácter que coló era un NUL, Postgres
  rechaza el INSERT entero. **Ya está arreglado** por `limpiarTexto()`.
- **Si no hay NADA en `app_events`** → la petición no llegó nunca al servidor: el POST moría en
  `catch (Exception ignored)`. **Ya está arreglado** por la cola de reintentos, pero necesita APK.

### El bar del padre, 31,00 €, dom 19/7 9:52

`1331 BAR` **no** lo tira el clasificador: entra como gasto en producción. Lo que sí estaba mal era la
categoría (caía en «otros»), y eso ya está arreglado. **Pero hay que comprobar si la fila existe:**

- **Si el gasto está en la BD pero en «otros»** → era solo la categoría. Cerrado.
- **Si no está** → misma bifurcación que arriba, más una tercera pista: esa compra la hizo con
  **Google Pay** (la noti dice que se usó una cuenta virtual de Visa acabada en 9754). Si en su móvil
  **solo salta la notificación de Google Wallet y no la de Trade Republic**, el lector no ve nada:
  `TrExpenseListener` solo escucha `de.traderepublic.app`. Eso es justo lo que pide el
  [plan de notis de Wallet](plan-notis-wallet-multidivisa.md).

**Ninguno de los dos arreglos recupera lo ya perdido**: los dos gastos hay que meterlos a mano.

---

## 4. El promote de anoche está limpio (comprobado, no hace falta que lo repases)

Preguntó si lo lió el promote de beta → main (`3a47eaf`). **No.** Lo del `-X theirs` de la 4.13.0 no se
repitió, y por una razón estructural: el merge-base de `main` y `beta` **era `main`** (`31aa523`), o sea
que `beta` iba por delante en línea recta y **`main` no tenía nada propio que descartar**.

- `git diff 3a47eaf 4322ea1` → **vacío**: el árbol promocionado es idéntico al de beta.
- `check-syntax`: 7 bloques OK. Sin `const` duplicados (`USO_OK`, `gastosForceAll`, `hojaOpen`: uno o cero).
- `npm test` en `3a47eaf`: todo verde **menos** `docs-frescura`.
- `VERSION` / `package.json` / `CHANGELOG` / `README`: los cuatro en 4.15.0.

### Los dos flecos del promote (esto sí es para ti)

1. **`docs-frescura` falla en `main` con un falso positivo.** Dice «no hay código publicable sin subir
   VERSION» y lista los 5 fixes de glow22. El bump a 4.15.0 se hizo en `beta` (`ff25ecb`) y esos fixes
   vinieron después; en `beta` el test se salta a propósito (cada push publica `VERSION.RUN_NUMBER`),
   pero al promocionar se re-arma y se queja de commits **que ya están publicados como 4.15.0**.
   Se repetirá en **cada** promote. Merece un arreglo en `tests/docs-frescura.test.mjs`: cuando el HEAD
   es un merge de `beta`, el bump que cuenta es el de la rama fusionada, no el que ve
   `git log -1 -- VERSION` con la historia simplificada.
2. **El README miente.** Dice «Estado actual: **v4.15.0** (beta; producción 4.14.1)» y 4.15.0 **ya es
   producción**. `docs-frescura` no lo pilla porque solo compara el número, no el paréntesis.
   **Esto es lo que pidió arreglar** — no lo toqué desde aquí para no chocar con tu rama.

---

## 5. Orden sugerido

1. README (§4.2) y el falso positivo de `docs-frescura` (§4.1) — son cinco minutos y desatascan el verde.
2. `npm run errores` → cerrar el diagnóstico de §3 y decirle qué fue.
3. Abrir `TrExpenseListener.java` en Android Studio, compilar, APK, release, `apk.json`.
4. Subir versión y llevar `00-core.js` (la keyword «bar») a beta para que lo pruebe.
5. Cuando esto esté, el [plan de notis de Wallet](plan-notis-wallet-multidivisa.md) — **con el crucero
   del 7/8 encima**.
