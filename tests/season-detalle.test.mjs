/**
 * Guardián del detalle de temporada (2026-08-03): el usuario pidió, textual, quitar del todo la
 * capa de piezas cayendo/subiendo por la pantalla («ya me cansé jajaja») y sustituirla por un
 * detalle incrustado en cada sección — mismo mecanismo que ya usan los iconos de la barra
 * (`tabpop` y compañía): una animación CSS de un solo uso al pintarse, nunca en bucle ni por JS
 * frame a frame.
 *
 * Este test comprueba:
 *  1. Que la vieja lluvia (`.season-fx`, sus keyframes, el pool `SEASON_FX` y el JS que la
 *     disparaba) ha desaparecido de verdad, no solo se ha apagado.
 *  2. Que el detalle nuevo existe, está bajo `html[data-season]` (sin temática no pasa nada) y
 *     cada temática declara su propio icono.
 *  3. Que respeta «reducir animaciones» (el media query OS) igual que el resto de decoración.
 *  4. Que la tanda «temporada» YA NO está en el panel (aprobada 4/8 → se BORRA del array
 *     `tandas`, no se marca hecha — regla en feedback-tandas-desaparecen-al-subir). El código
 *     del detalle sigue vivo; lo que no puede volver es la lluvia ni una tanda fantasma.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const shell = readFileSync(join(root, "src/shell.html"), "utf8");
const main = readFileSync(join(root, "src/modules/11-app-main.js"), "utf8");
const i18n = readFileSync(join(root, "src/modules/01-i18n.js"), "utf8");
const comps = readFileSync(join(root, "src/modules/10-app-components.js"), "utf8");

/* ---- 1. La vieja lluvia de piezas ha desaparecido de verdad ----
   (se busca la REGLA CSS real —con su `{`—, no solo el nombre: el propio comentario que explica
   la eliminación menciona estos nombres entre comillas, y eso no debe contar como "sigue vivo"). */
assert.doesNotMatch(shell, /\.season-fx\s*\{/, "`.season-fx` (la capa de piezas cayendo) no puede seguir siendo una regla CSS real");
assert.doesNotMatch(shell, /@keyframes\s+seasonfall\s*\{/, "el keyframe de la caída no puede seguir existiendo");
assert.doesNotMatch(shell, /@keyframes\s+seasonrise\s*\{/, "el keyframe de la ráfaga al cambiar de tab no puede seguir existiendo");
assert.doesNotMatch(shell, /\.sfx-l\d\s*\{/, "las capas de profundidad de la lluvia (sfx-l0/1/2) no pueden seguir existiendo");

assert.doesNotMatch(main, /seasonEpoch/, "seasonEpoch (el JS que forzaba la ráfaga al cambiar de tab) debe haberse quitado de 11-app-main.js");
assert.doesNotMatch(main, /SEASON_FX/, "11-app-main.js no debe seguir leyendo el pool SEASON_FX");
assert.doesNotMatch(main, /className:"season-fx/, "no debe quedar ningún render de la capa .season-fx");

assert.doesNotMatch(i18n, /const\s+SEASON_FX/, "el pool de emojis que caían (SEASON_FX) debe haberse quitado de 01-i18n.js");
// SEASONS (el chip del selector en Ajustes) SÍ debe seguir — no es lo que se quita.
assert.match(i18n, /const\s+SEASONS\s*=/, "SEASONS (el selector de temáticas en Ajustes) no debe tocarse");

/* ---- 2. El detalle nuevo existe, incrustado y con icono propio por temática ---- */
// Icono nuevo por temática, parametrizado por variable CSS (mismo mecanismo para las seis).
assert.match(shell, /--season-ico/, "falta la variable --season-ico que da el icono de cada temática");
assert.match(shell, /@keyframes\s+seasonchip/, "falta el keyframe de entrada (pop) del icono de temporada");

// Incrustado en el título de cada pantalla, SIN capa aparte ni nuevo <div> flotante.
assert.match(
  shell,
  /html\[data-season\]\s+\.v4-title::after,\s*html\[data-season\]\s+\.v4-inicio-hi::after\s*\{[^}]*content:\s*var\(--season-ico/,
  "el icono debe pintarse con ::after sobre .v4-title/.v4-inicio-hi (Gastos/Plan/Cartera e Inicio), leyendo --season-ico"
);

// «Sin temática no pasa nada»: la regla vive SIEMPRE bajo el atributo html[data-season] (solo
// presente cuando hay una temática real puesta — ver applySeason, que lo QUITA si es "none").
assert.match(shell, /html\[data-season\]\s+\.v4-title::after/, "el detalle debe estar condicionado a html[data-season]");
assert.match(
  i18n,
  /function\s+applySeason[\s\S]{0,300}removeAttribute\(\s*["']data-season["']\s*\)/,
  "applySeason debe seguir quitando el atributo (no dejarlo en \"\") para que 'sin temática' sea de verdad sin nada"
);

// Cada temática declara tinte E icono en la misma línea (mismo mecanismo, solo cambia el dato).
for (const s of ["mundial", "halloween", "navidad", "verano", "invierno", "pascua"]) {
  const re = new RegExp(
    `html\\[data-season="${s}"\\]\\{--season-tinte:[^;]+;--season-ico:"[^"]+"`
  );
  assert.match(shell, re, `la temática "${s}" debe declarar --season-tinte y --season-ico juntos`);
}

/* ---- 3. Reducir animaciones también apaga el pop del icono ---- */
assert.match(
  shell,
  /prefers-reduced-motion:reduce\)\{[\s\S]*?html\[data-season\]\s+\.v4-title::after,\s*html\[data-season\]\s+\.v4-inicio-hi::after\{animation:none/,
  "el media query de reducir animaciones debe apagar también el pop del icono de temporada"
);

/* ---- 4. Tanda «temporada» QUITADA del panel (aprobada 4/8) ----
   Regla: aprobada → se borra del array, no se comenta como hecha. El comentario del histórico
   puede mencionar el id; lo que no puede volver es un objeto vivo `{id:"temporada", items:[...]}`. */
assert.doesNotMatch(
  comps,
  /\{id:"temporada"\s*,\s*t:/,
  "la tanda temporada ya se aprobó: no puede seguir en RELEASE_NOTES.tandas (se BORRA, no se marca hecha)"
);
assert.match(
  comps,
  /temporada.*QUITADA|QUITADA.*temporada/i,
  "debe quedar escrito POR QUÉ desapareció la tanda (aprobada), para la siguiente sesión"
);

console.log("ok: la lluvia de piezas ha desaparecido, el detalle por temática está incrustado y respeta reducir-animaciones; tanda temporada fuera del panel (aprobada)");
