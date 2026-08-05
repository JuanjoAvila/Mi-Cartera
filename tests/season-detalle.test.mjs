/**
 * Guardián de ambientación de temporada (actualizado 2026-08-05).
 *
 * Historial: la lluvia agresiva (`.season-fx` encima de todo + `seasonEpoch`/`seasonrise` al
 * cambiar de tab) se quitó el 2026-08-03 («ya me cansé»). El 2026-08-05 vuelve SOLO como fondo
 * suave (`.season-amb` z-index 0, detrás de `.page`), sin ráfagas al cambiar de pestaña.
 *
 * Este test comprueba:
 *  1. Que la lluvia VIEJA (encima + ráfagas) NO vuelve.
 *  2. Que la ambientación NUEVA existe, va detrás y es suave (bucle, pocas piezas).
 *  3. Que el detalle incrustado en títulos (`--season-ico` / seasonchip) sigue.
 *  4. Que respeta «reducir animaciones».
 *  5. Que la tanda «temporada» YA NO está en el panel (aprobada → se BORRA).
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

/* ---- 1. La lluvia VIEJA (encima + ráfagas) no puede volver ---- */
assert.doesNotMatch(shell, /\.season-fx\s*\{/, "`.season-fx` (capa encima) no puede volver");
assert.doesNotMatch(shell, /@keyframes\s+seasonfall\s*\{/, "seasonfall (caída agresiva vieja) no puede volver");
assert.doesNotMatch(shell, /@keyframes\s+seasonrise\s*\{/, "seasonrise (ráfaga al cambiar de tab) no puede volver");
assert.doesNotMatch(main, /seasonEpoch/, "seasonEpoch (JS de ráfaga al cambiar de tab) no puede volver");
assert.doesNotMatch(i18n, /const\s+SEASON_FX\b/, "SEASON_FX (pool de la capa encima) no puede volver");

/* ---- 2. Ambientación NUEVA: detrás, suave, sin tocar tabs ---- */
assert.match(shell, /\.season-amb\s*\{/, "falta `.season-amb` (ambientación detrás)");
assert.match(shell, /\.season-amb\{[^}]*z-index:\s*0/, "`.season-amb` debe ir a z-index 0 (detrás)");
assert.match(shell, /@keyframes\s+seasonDrift\s*\{/, "falta el keyframe suave `seasonDrift`");
assert.match(shell, /\.page\{[^}]*z-index:\s*2/, "`.page` debe pintar encima de la ambientación");
assert.match(i18n, /const\s+SEASON_AMB\s*=/, "falta el pool SEASON_AMB");
assert.match(main, /className:"season-amb/, "11-app-main.js debe montar `.season-amb`");
assert.doesNotMatch(main, /setSeasonEpoch/, "no debe haber JS que dispare al cambiar de tab");
assert.match(i18n, /const\s+SEASONS\s*=/, "SEASONS (selector en Ajustes) no debe tocarse");

/* ---- 3. Detalle incrustado en títulos sigue ---- */
assert.match(shell, /--season-ico/, "falta --season-ico");
assert.match(shell, /@keyframes\s+seasonchip/, "falta seasonchip");
assert.match(
  shell,
  /html\[data-season\]\s+\.v4-title::after,\s*html\[data-season\]\s+\.v4-inicio-hi::after\s*\{[^}]*content:\s*var\(--season-ico/,
  "el icono debe pintarse con ::after sobre .v4-title/.v4-inicio-hi"
);
assert.match(
  i18n,
  /function\s+applySeason[\s\S]{0,300}removeAttribute\(\s*["']data-season["']\s*\)/,
  "applySeason debe quitar el atributo si es none"
);
for (const s of ["mundial", "halloween", "navidad", "verano", "invierno", "pascua"]) {
  const re = new RegExp(
    `html\\[data-season="${s}"\\]\\{--season-tinte:[^;]+;--season-ico:"[^"]+"`
  );
  assert.match(shell, re, `la temática "${s}" debe declarar --season-tinte y --season-ico`);
}

/* ---- 4. Reducir animaciones apaga ambientación e icono ---- */
assert.match(shell, /prefers-reduced-motion:reduce\)\{[\s\S]*?\.season-amb\{display:none/, "reduce-motion debe ocultar `.season-amb`");
assert.match(
  shell,
  /prefers-reduced-motion:reduce\)\{[\s\S]*?html\[data-season\]\s+\.v4-title::after,\s*html\[data-season\]\s+\.v4-inicio-hi::after\{animation:none/,
  "reduce-motion debe apagar el pop del icono"
);

/* ---- 5. Tanda «temporada» QUITADA del panel ---- */
assert.doesNotMatch(
  comps,
  /\{id:"temporada"\s*,\s*t:/,
  "la tanda temporada ya se aprobó: no puede seguir en RELEASE_NOTES.tandas"
);
assert.match(
  comps,
  /temporada.*QUITADA|QUITADA.*temporada/i,
  "debe quedar escrito POR QUÉ desapareció la tanda"
);

console.log("ok: ambientación suave detrás de las cartillas; sin ráfagas al cambiar de tab; detalle incrustado intacto; tanda temporada fuera del panel");
