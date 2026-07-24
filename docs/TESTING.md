# Testing — Mi Cartera

## Flujo local (CMD o PowerShell)

Abre **CMD** o **PowerShell**, ve a la carpeta del proyecto y ejecuta:

```powershell
cd "E:\Mi Cartera"
```

### Si `npm ci` falla con “package-lock.json”

Eso pasa si la carpeta **no tiene el lockfile** (copia vieja, zip, o sin `git pull`).

**Solución:**

```powershell
git pull origin main
npm install
```

`npm install` genera/actualiza `package-lock.json`. Luego ya puedes usar `npm ci` en adelante.

### Instalación completa (una vez)

```powershell
git pull origin main
npm install
npx playwright install chromium
```

### Ejecutar tests

```powershell
npm test          # build + unit + E2E
npm run test:e2e  # solo Playwright (más rápido)
npm run build     # solo ensamblar src → public/index.html
```

## Capas

| Capa | Qué cubre | Dónde |
|------|-----------|--------|
| **build-app** | Ensambla `src/modules/` → `public/index.html` | `scripts/build-app.mjs` |
| **check-syntax** | Sintaxis VM de cada `<script>` inline | `scripts/check-syntax.mjs` |
| **Unit (Node)** | Motor financiero, parsers Revolut, onboarding… | `tests/*.test.mjs` |
| **Deno** | ingest, crypto, delete-account | `supabase/functions/**/*.test.ts` |
| **Playwright** | Smoke UI + flujo borrar cuenta | `e2e/*.spec.mjs` |

## Fuente editable

Tras v3.108.0 la lógica vive en **`src/modules/*.js`**. No edites `public/index.html` a mano — se regenera con `npm run build`.

## CI

- `.github/workflows/test.yml` — push/PR
- `.github/workflows/deploy.yml` — job `test` antes de publicar Pages

## Playwright en modo visual (opcional)

```powershell
npx playwright test --ui
```

Abre una ventana donde ves el navegador y cada paso del test.

---

## Entorno de pruebas del dueño (v4.8.0)

Dos cosas distintas, ambas en **Ajustes → Dev → 🧪 Pruebas** y visibles solo con
`profiles.is_admin = true` (o sea: solo tú).

### 1. Canal beta — QUÉ versión recibe este móvil

GitHub Pages sirve **una sola** versión: la de `main`, que es la que usan tu padre y tu pareja.
Por eso la beta no va por Pages, sino como assets de una **release fija con la etiqueta `beta`**.

```
rama `beta`  ──push──►  .github/workflows/beta.yml
                          ├─ npm test (los mismos que producción)
                          ├─ build + stamp + minify
                          └─ sube bundle.zip + version.json a la release `beta`
                                     │
                    solo los móviles con canal beta ◄┘
```

- La versión de beta lleva sufijo con el número de ejecución (`4.8.0.17`), así se distingue de un
  vistazo en el pie de Ajustes y `_mcNewerVer` la ve como más nueva que la estable del mismo número.
- Si el canal beta está vacío o la release no existe, la app **cae a estable** sola
  (`mcFetchManifest`): nunca se queda un móvil sin poder actualizarse.
- Volver a estable: el mismo interruptor. Limpia lo que hubiera pendiente del otro canal.

**Promocionar una beta a producción:** mergea la rama `beta` a `main` como siempre.

### 2. Banco de pruebas — CON QUÉ datos trabajas

Copia tu cartera a `micartera_sandbox` y, mientras estás dentro:

- todo lo que escribas se queda en esa clave; tu `micartera_v3` no se toca;
- **ninguna** operación de escritura llega a la nube — las 20 que hay (`CLOUD_WRITES` en
  `00-core.js`) pasan por un envoltorio que las anula, así que ni tu padre ni tu pareja ven nada;
- las lecturas (sincronizar el banco, precios) siguen funcionando: probar con datos reales es la gracia;
- una **banda naranja** permanente lo recuerda, y tocarla te saca.

> ⚠️ **Si añades un método a `cloud` que escriba algo, mételo en `CLOUD_WRITES`.** Si se olvida, el
> modo pruebas escribiría en producción. `tests/security.test.mjs` lo detecta y falla el build.

Cubierto por `e2e/modo-pruebas.spec.mjs`. Ese test ya pagó su precio: encontró que salir del modo
pruebas escribía el estado de prueba **encima de la cartera real** (el volcado de `pagehide` corría
entre quitar la bandera y recargar). Por eso el modo se fija al arrancar y no se relee.

### 3. Aprobar la beta desde el móvil («code review», pero probando)

**Ajustes → Dev → 🧪 Pruebas → 🔍 Revisar esta beta** (solo en canal beta).

La checklist **sale de `RELEASE_NOTES` de la versión que corre**, así que no hay nada que mantener
aparte: cada release trae su lista sola. Cada punto se marca *✓ Va bien* o *✗ Falla*; al marcar que
falla aparece un campo para decir qué pasa. El progreso se guarda por versión en localStorage —
probar lleva días y cerrar la app no puede borrarlo.

**Regla que impone el panel:** no se puede aprobar con cosas sin probar ni con nada marcado como que
falla. Si esa puerta se abriera, el botón dejaría de significar nada. Cubierto por
`e2e/revisar-beta.spec.mjs`.

El veredicto se guarda en `app_events` con `kind:'beta'` (tabla que ya existía, RLS solo-admin) y se
lee en **Actividad → filtro 🧪 Betas**. Dentro del banco de pruebas NO se manda nada: `betaReport`
está en `CLOUD_WRITES` (aprobar con datos falsos no aprueba nada).

#### Subirla a producción

El panel **no despliega**: la app no puede hacer un merge de git, y meter un token de GitHub con
permiso de escritura en Supabase sería una credencial nueva y jugosa a cambio de ahorrar un clic.
Dos caminos, los dos de una línea:

1. Decírselo a Claude («sube la beta»).
2. GitHub → Actions → **Promocionar beta a producción** → Run workflow → escribir `SUBIR`.
   Vuelve a pasar la suite entera, mergea `beta` → `main` y el deploy de Pages sale solo.

#### La primera vez: `?canal=beta`

El interruptor de canal vive en Ajustes → Dev → Pruebas, que **solo existe a partir de la versión
que quieres probar** — pescadilla que se muerde la cola. Para romperla, abre en el móvil:

```
https://juanjoavila.github.io/Mi-Cartera/?canal=beta      → activa el canal beta
https://juanjoavila.github.io/Mi-Cartera/?canal=estable   → vuelve al de todos
```

Ojo: eso activa el canal **en el navegador**, que es un origen distinto del de la APK. Una beta llega
a la APK por OTA solo si la APK ya trae el interruptor, así que **el canal beta empieza a funcionar
de verdad en la APK a partir de la primera versión que lo incluya** (la 4.8.0). Hasta entonces, la
beta se prueba en el navegador del móvil — que cubre todo menos lo nativo (notificaciones, widget,
huella).
