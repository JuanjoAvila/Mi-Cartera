# Cómo se trabaja en Mi Cartera

Guía para cualquier IA que toque este repo (Cursor, Claude Code, Copilot…). **Léela entera antes
de editar nada.** Casi todas las reglas están aquí porque algo se rompió antes por saltárselas.

## 1. Lo primero: qué es esto

PWA de finanzas personales **sin build y sin JSX**. React vía `React.createElement`, todo
inlineado en **un solo fichero**. Se despliega sola a GitHub Pages al pushear a `main`.

**Es la app de finanzas REAL de una persona real y de su pareja**, que la usan a diario en el
móvil para decidir qué hacen con su dinero. No es un ejercicio. Un número mal pintado es peor
que una pantalla fea: si un dato no lo sabes, **no te lo inventes** — enséñalo como «—» y di por
qué falta.

## 2. La regla que más veces se ha roto: la fuente única

- **Edita la lógica en `src/modules/*.js`** y el shell en `src/shell.html`. Ensambla con `npm run build` → genera `public/index.html`.
- **NO edites `public/index.html` a mano** salvo assets estáticos (`vendor/`, `sw.js`, iconos). El CI también ejecuta `build-app` antes del deploy.
- **NO crees un `index.html` en la raíz.** Ya pasó: existía un duplicado que se editaba por error
  y dejaba `public/` atrasado — un fix no llegó al móvil hasta consolidar (v3.3.1).
- `www/` y cualquier `bundle` son **generados**. No los toques a mano.
- El CI minifica con esbuild (`scripts/minify-html.mjs`): **NUNCA `minifyIdentifiers`**. Hay
  globales (`t`, `cloud`, …) que no se pueden renombrar sin romper la app.

## 3. Estilo de código (no negociable, para que el diff no cante)

- `React.createElement(...)`, nunca JSX. Hooks vía `const { useState, useEffect, ... } = React;`
  (ya está declarado arriba del todo).
- `function(){}` y `var/const/let` al estilo del fichero. Mira las 20 líneas de alrededor y
  **imita lo que veas** — densidad de comentarios, nombres, comillas, todo.
- **Comentarios en castellano y explicando el PORQUÉ**, no el qué. El estilo de la casa es dejar
  escrito el motivo y, si viene de un fallo real, la fecha/feedback:
  ```js
  // Sin sugerencia clara el defecto es NO TOCAR (antes era «crear nueva» y el import
  // sembraba posiciones extra de valores ya vendidos — feedback 2026-07-13).
  ```
- **Cero dependencias nuevas. Cero CDNs de terceros.** Todo va auto-hospedado en `public/vendor/`
  y `public/fonts/` porque la app funciona **offline completa**. Si crees que necesitas una
  librería, pregunta antes.

## 4. Textos: SIEMPRE en tres idiomas

Hay tres bloques de idioma: `LANG.es`, `LANG.en`, `LANG.ca`. **Cada clave nueva va en los tres.**
Se usan con `t("clave")` y `tf("clave",{x:…})` para interpolar.

Las notas de versión (`RELEASE_NOTES`) son la excepción: **solo castellano**, a propósito.

## 5. Diálogos: NO uses `window.prompt` / `confirm` / `alert`

Pintan el cuadro **nativo** de Android (gris, tipografía ajena, botones «CANCEL/OK» en inglés con
la app en español). Se sustituyeron todos en la v3.100.0 tras quejarse un usuario real.

Usa `askText({...})` y `askConfirm({...})` (busca `AskHost` en el fichero). **Devuelven promesas**,
mientras que el prompt nativo era síncrono → al portar código hay que meter lo de después dentro
del `.then()`, ojo con los `return` tempranos del patrón viejo:

```js
askText({ title:tf("db_amortize_prompt",{name:d.name}), sub:tf("db_amortize_sub",{x:eur(bal)}),
  ph:"0,00 €", ok:"💸 "+t("db_amortize"), chips:[{v:100,label:"100 €"}] })
  .then(function(raw){ if(raw==null) return; /* null = canceló */ });
```

Para el look, reutiliza lo que ya existe: `.tabsheet`, `.btn btn-primary` / `.btn-ghost`, `.chip`,
`.hint`, `.row`, y las variables CSS (`var(--mint)`, `var(--surface)`, …). **No inventes colores.**

## 6. Publicar una versión

Checklist **obligatoria** (sin descuadres — feedback 2026-07-17):

1. **Bump `VERSION`** (X.Y.Z) y **`package.json`** / **`package-lock.json`** (mismo número).
2. **`RELEASE_NOTES`** al principio del array en `src/modules/10-app-components.js` (solo castellano, en cristiano).
3. **`CHANGELOG.md`** técnico, con el porqué.
4. **`docs/ROADMAP.md`**: línea de estado + versión actual.
5. Si tocas nativo Android **o** quieres APK alineado con la web:
   - `android/app/build.gradle` → `versionName` = `VERSION`, `versionCode` += 1
   - `npm run build` → `npx cap sync android` → `assembleRelease`
   - Subir asset a un **GitHub Release** y actualizar **`public/apk.json`** (versionCode, versionName, url, notes) al APK **realmente** publicado (nunca apuntar a un release inexistente).
6. `npm run build` + `npm test` → push a `main` → verificar workflow Pages (y Supabase si tocaste `supabase/**`).

**Solo se pushea trabajo TERMINADO y verificado.** Nunca a medias. OTA web ≠ APK: si el fix es Java/Kotlin, sin APK nuevo el móvil no lo tiene.

## 7. Verificar de verdad (no «debería funcionar»)

- **Tests automáticos:** `npm test` (sintaxis del monolito con `vm.Script` + lógica financiera, parsers Revolut e ingest). Corre en CI (`.github/workflows/test.yml`).
- Sintaxis del monolito: extrae los `<script>` y pásalos por `new vm.Script(...)`. Un `node --check`
  del HTML no vale.
- Pruébalo **en el navegador** con datos reales antes de cantar victoria. En la v3.100.0, el parser
  de metales estaba perfecto y aun así el oro no se auto-emparejaba: eso **no se ve leyendo el
  código**, solo abriéndolo.
- **El Service Worker es stale-while-revalidate**: si recargas y ves código viejo, no estás loco.
  Desregístralo y borra cachés antes de dar nada por bueno.
- Si parseas un fichero (CSV de bróker…), monta un banco de pruebas en Node contra el fichero
  REAL y comprueba el resultado por **dos vías independientes** (así se validó el oro: saldo
  acumulado vs. suma de importes − comisiones, ambas 0,258218 XAU).

## 8. Privacidad y dinero

- Repo **público** (lo exige Pages gratis) → **jamás** un secreto, una clave ni datos personales
  en el cliente ni en el repo. Los CSV de extractos del usuario **no se commitean nunca**.
- Los CSV se procesan **en el móvil**, no se suben a ningún sitio. Que siga así.
- Los importadores **nunca pisan a ciegas**: previsualización + el usuario mapea + solo se toca lo
  mapeado. Si un dato no viene en el extracto (p. ej. el coste del oro), se respeta el que hubiera
  (`if(po.cost!=null) patch.cost=po.cost;`) y se explica en la UI.
