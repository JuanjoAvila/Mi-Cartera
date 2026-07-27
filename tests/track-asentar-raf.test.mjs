/**
 * Guardián del judder al soltar el dedo (2026-07-27): el carrusel NO puede asentarse
 * con `transition: transform …` en CSS. En un móvil de 120 Hz esa transition produce
 * 14 saltos de 25/8 ms (batido 60/120) durante los 0,42 s del asentamiento. El arrastre
 * iba perfecto; al soltar se perdía la fluidez. Arreglo: `asentarTrack` con rAF.
 * Ver docs/LAG-DESLIZAR.md y tools/movil/ab-waapi.mjs / huecos.mjs.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const shell = readFileSync(join(root, "src/shell.html"), "utf8");
const main = readFileSync(join(root, "src/modules/11-app-main.js"), "utf8");
const i18n = readFileSync(join(root, "src/modules/01-i18n.js"), "utf8");

assert.match(main, /function asentarTrack\s*=|const asentarTrack\s*=/, "falta asentarTrack en 11-app-main");
assert.match(main, /requestAnimationFrame\(step\)/, "asentarTrack debe animar con rAF");
assert.match(main, /asentarTrack\(nt\)/, "onEnd debe asentar por rAF al soltar");

// La transition CSS del track es justamente lo que producía el judder.
assert.doesNotMatch(
  shell,
  /\.track\s*\{[^}]*transition\s*:\s*transform\s+[\d.]+s/s,
  "`.track` NO puede volver a tener transition:transform (regresión del judder a 120 Hz)"
);
assert.match(shell, /\.track\s*\{[^}]*transition\s*:\s*none/s, "`.track` debe llevar transition:none");

// data-season="" encendía fabpulse sin temática.
assert.match(i18n, /removeAttribute\(\s*["']data-season["']\s*\)/, "applySeason debe quitar el atributo, no dejarlo vacío");
assert.doesNotMatch(
  i18n,
  /setAttribute\(\s*["']data-season["']\s*,\s*\([^)]*\)\s*\?\s*season\s*:\s*["']["']\s*\)/,
  "no volver a setAttribute('data-season','')"
);

console.log("ok: carrusel se asienta por rAF; sin transition CSS; data-season se quita");
