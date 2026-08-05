/**
 * Guardián de ambientación de temporada (actualizado 2026-08-05, 5ª pasada).
 *
 * El destello que él quiere es el de ARRIBA A LA DERECHA (seasonglow), NO un halo en la barra.
 * Cocerlo en background-image del host hacía que al scrollear apareciera/desapareciera.
 * botnav::before era el sitio equivocado y dejaba ver la lista a través de la barra.
 *
 * Fix actual:
 *  1. Destello = `html[data-season]::before` fixed z-index 36 (viewport, no scroll).
 *  2. Lluvia = UNA `.season-amb` GLOBAL fixed z-37 (useMemo).
 *  3. Host opaco. Sin botnav::before de halo. Sin html::after de destello inferior.
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

/* ---- 1. Lluvia VIEJA no puede volver ---- */
assert.doesNotMatch(shell, /\.season-fx\s*\{/, "`.season-fx` no puede volver");
assert.doesNotMatch(shell, /@keyframes\s+seasonfall\s*\{/, "seasonfall no puede volver");
assert.doesNotMatch(shell, /@keyframes\s+seasonrise\s*\{/, "seasonrise no puede volver");
assert.doesNotMatch(main, /seasonEpoch/, "seasonEpoch no puede volver");
assert.doesNotMatch(i18n, /const\s+SEASON_FX\b/, "SEASON_FX no puede volver");

/* ---- 2. Lluvia: una sola capa GLOBAL ---- */
assert.match(shell, /\.season-amb\s*\{/, "falta `.season-amb`");
assert.match(shell, /\.season-amb\{[^}]*position:\s*fixed/, "`.season-amb` fixed");
assert.match(shell, /\.season-amb\{[^}]*z-index:\s*37/, "`.season-amb` z-index 37");
assert.match(shell, /@keyframes\s+seasonDrift\s*\{/, "falta `seasonDrift`");
assert.match(main, /useMemo\(function\(\)\{[\s\S]*?className:"season-amb"/, "`.season-amb` con useMemo");
assert.doesNotMatch(main, /show\s*&&\s*seasonPool\s*\?\s*React\.createElement\("div",\{className:"season-amb"/, "NO por pestaña");
assert.doesNotMatch(main, /isHost\s*&&\s*seasonPool/, "NO solo isHost");
assert.doesNotMatch(main, /setSeasonEpoch/, "no ráfaga al cambiar tab");
assert.match(i18n, /const\s+SEASON_AMB\s*=/, "falta SEASON_AMB");

/* ---- 3. Host SIEMPRE opaco ---- */
assert.match(
  shell,
  /\.page\.page-scroll-host\{[\s\S]*?background:\s*var\(--bg\)/,
  "`.page-scroll-host` fondo OPACO"
);
assert.doesNotMatch(
  shell,
  /html\[data-season\]\s+\.page\.page-scroll-host\{[^}]*background-image/,
  "destello NO cocido en background-image del host (se iba al scrollear)"
);

/* ---- 4. Destello de ARRIBA (fixed), no en la barra ---- */
assert.match(
  shell,
  /html\[data-season\]::before\{[^}]*z-index:\s*36/,
  "destello superior fixed a z-index 36"
);
assert.match(shell, /@keyframes\s+seasonglow\s*\{/, "falta seasonglow");
assert.doesNotMatch(
  shell,
  /html\[data-season\]\s+\.botnav::before\{/,
  "NO destello en botnav::before (sitio equivocado + fuga de contenido en la barra)"
);
assert.doesNotMatch(
  shell,
  /html\[data-season\]::after\{/,
  "sin html::after de halo inferior"
);

/* ---- 5. Detalle incrustado ---- */
assert.match(shell, /--season-ico/, "falta --season-ico");
assert.match(shell, /@keyframes\s+seasonchip/, "falta seasonchip");
assert.match(
  i18n,
  /function\s+applySeason[\s\S]{0,300}removeAttribute\(\s*["']data-season["']\s*\)/,
  "applySeason quita el atributo si es none"
);
for (const s of ["mundial", "halloween", "navidad", "verano", "invierno", "pascua"]) {
  const re = new RegExp(
    `html\\[data-season="${s}"\\]\\{--season-tinte:[^;]+;--season-ico:"[^"]+"`
  );
  assert.match(shell, re, `temática "${s}"`);
}

/* ---- 6. Reducir animaciones ---- */
assert.match(shell, /prefers-reduced-motion:reduce\)\{[\s\S]*?\.season-amb\{display:none/, "reduce-motion oculta lluvia");
assert.match(
  shell,
  /prefers-reduced-motion:reduce\)\{[\s\S]*?html\[data-season\]::before\{display:none/,
  "reduce-motion oculta destello superior"
);

/* ---- 7. Tanda temporada fuera ---- */
assert.doesNotMatch(comps, /\{id:"temporada"\s*,\s*t:/, "tanda temporada fuera");
assert.match(comps, /temporada.*QUITADA|QUITADA.*temporada/i, "por qué se quitó");

console.log("ok: destello arriba fixed z-36; lluvia global z-37; sin halo en barra; host opaco");
