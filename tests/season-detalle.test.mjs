/**
 * Guardián de ambientación de temporada (actualizado 2026-08-05, tercera pasada).
 *
 * Historial:
 *  - Lluvia agresiva (`.season-fx` + `seasonEpoch`/`seasonrise`) quitada 2026-08-03.
 *  - 2026-08-05: vuelve suave. Primer intento «visible en reposo» → host transparente →
 *    Inicio+Gastos a la vez. Segundo: copia LOCAL solo en `isHost` (z-index -1).
 *  - Mismo día, 2 fotos: el destello solo un instante al deslizar; la lluvia se reiniciaba
 *    en cada swipe (`hostTab=-1` desmontaba la copia del host).
 *    Fix: (1) velos `html::before/::after` a z-index 36/39 (sobre el host opaco 35, se
 *    filtran por el botnav); (2) `.season-amb` en CADA pestaña con `show` (no solo isHost),
 *    absolute z-index -1 detrás de las cartillas — no se desmonta al swipe.
 *
 * Este test comprueba:
 *  1. Que la lluvia VIEJA NO vuelve.
 *  2. Que la ambientación nueva existe, suave, detrás de cartillas, sin remount solo-isHost.
 *  3. Que `.page-scroll-host` es SIEMPRE opaco.
 *  4. Que el destello (html::before/::after) queda por encima del host.
 *  5. Detalle incrustado en títulos.
 *  6. Reducir animaciones.
 *  7. Tanda «temporada» fuera del panel.
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

/* ---- 1. La lluvia VIEJA no puede volver ---- */
assert.doesNotMatch(shell, /\.season-fx\s*\{/, "`.season-fx` no puede volver");
assert.doesNotMatch(shell, /@keyframes\s+seasonfall\s*\{/, "seasonfall no puede volver");
assert.doesNotMatch(shell, /@keyframes\s+seasonrise\s*\{/, "seasonrise no puede volver");
assert.doesNotMatch(main, /seasonEpoch/, "seasonEpoch no puede volver");
assert.doesNotMatch(i18n, /const\s+SEASON_FX\b/, "SEASON_FX no puede volver");

/* ---- 2. Ambientación: por pestaña, z-index -1, montada con show (no solo isHost) ---- */
assert.match(shell, /\.season-amb\s*\{/, "falta `.season-amb`");
assert.match(shell, /\.season-amb\{[^}]*z-index:\s*-1/, "`.season-amb` debe ir a z-index -1 (detrás de cartillas)");
assert.match(shell, /\.season-amb\{[^}]*position:\s*absolute/, "`.season-amb` debe ser absolute dentro de `.page`");
assert.match(shell, /@keyframes\s+seasonDrift\s*\{/, "falta `seasonDrift`");
assert.match(shell, /\.page\{[^}]*z-index:\s*2/, "`.page` debe conservar z-index 2");
assert.doesNotMatch(
  main,
  /isHost\s*&&\s*seasonPool/,
  "NO montar solo en isHost (se desmontaba en cada swipe y reiniciaba la lluvia)"
);
assert.match(
  main,
  /show\s*&&\s*seasonPool\s*\?\s*React\.createElement\("div",\{className:"season-amb/,
  "montar `.season-amb` siempre que la pestaña esté en `show`"
);
assert.match(i18n, /const\s+SEASON_AMB\s*=/, "falta SEASON_AMB");
assert.doesNotMatch(main, /setSeasonEpoch/, "no JS de ráfaga al cambiar de tab");
assert.match(i18n, /const\s+SEASONS\s*=/, "SEASONS intacto");

/* ---- 3. Host SIEMPRE opaco ---- */
assert.match(
  shell,
  /\.page\.page-scroll-host\{[^}]*background:\s*var\(--bg\)/,
  "`.page-scroll-host` fondo OPACO siempre"
);
assert.doesNotMatch(
  shell,
  /\.page\.page-scroll-host\{[^}]*background:\s*transparent/,
  "`.page-scroll-host` no puede ser transparente"
);

/* ---- 4. Destello siempre visible (por encima del host) ---- */
assert.match(
  shell,
  /html\[data-season\]::before\{[^}]*z-index:\s*36/,
  "velo superior a z-index 36"
);
assert.match(
  shell,
  /html\[data-season\]::after\{[^}]*z-index:\s*39/,
  "destello inferior a z-index 39"
);
assert.doesNotMatch(
  shell,
  /html\[data-season\]\s+\.page-scroll-host::before/,
  "sin velo local en el host (el global a z-36 basta)"
);
assert.doesNotMatch(
  shell,
  /html\[data-season\]\s+\.page-scroll-host::after/,
  "sin destello local en el host (el global a z-39 basta)"
);

/* ---- 5. Detalle incrustado ---- */
assert.match(shell, /--season-ico/, "falta --season-ico");
assert.match(shell, /@keyframes\s+seasonchip/, "falta seasonchip");
assert.match(
  shell,
  /html\[data-season\]\s+\.v4-title::after,\s*html\[data-season\]\s+\.v4-inicio-hi::after\s*\{[^}]*content:\s*var\(--season-ico/,
  "icono en ::after de títulos"
);
assert.match(
  i18n,
  /function\s+applySeason[\s\S]{0,300}removeAttribute\(\s*["']data-season["']\s*\)/,
  "applySeason quita el atributo si es none"
);
for (const s of ["mundial", "halloween", "navidad", "verano", "invierno", "pascua"]) {
  const re = new RegExp(
    `html\\[data-season="${s}"\\]\\{--season-tinte:[^;]+;--season-ico:"[^"]+"`
  );
  assert.match(shell, re, `temática "${s}" con --season-tinte y --season-ico`);
}

/* ---- 6. Reducir animaciones ---- */
assert.match(shell, /prefers-reduced-motion:reduce\)\{[\s\S]*?\.season-amb\{display:none/, "reduce-motion oculta `.season-amb`");
assert.match(
  shell,
  /prefers-reduced-motion:reduce\)\{[\s\S]*?html\[data-season\]::before\{display:none/,
  "reduce-motion oculta el velo"
);
assert.match(
  shell,
  /prefers-reduced-motion:reduce\)\{[\s\S]*?html\[data-season\]\s+\.v4-title::after,\s*html\[data-season\]\s+\.v4-inicio-hi::after\{animation:none/,
  "reduce-motion apaga el pop del icono"
);

/* ---- 7. Tanda temporada fuera ---- */
assert.doesNotMatch(comps, /\{id:"temporada"\s*,\s*t:/, "tanda temporada no puede seguir en el panel");
assert.match(comps, /temporada.*QUITADA|QUITADA.*temporada/i, "debe quedar escrito por qué se quitó");

console.log("ok: destello z-36/39 siempre; lluvia por pestaña sin remount al swipe; host opaco");
