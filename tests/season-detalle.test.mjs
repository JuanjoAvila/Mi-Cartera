/**
 * Guardián ambientación (2026-08-05, pasada CDP en su Oppo).
 *
 * Medido: `html::before` con position:fixed z-36 AUN ASÍ se iba con el scroll en su WebView.
 * Fix: nodo real `.season-glow`. Barra: sin opacity en botnav-hidden (fuga de lista ~1 s).
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

assert.doesNotMatch(shell, /\.season-fx\s*\{/, "`.season-fx` no puede volver");
assert.doesNotMatch(main, /seasonEpoch/, "seasonEpoch no puede volver");
assert.doesNotMatch(i18n, /const\s+SEASON_FX\b/, "SEASON_FX no puede volver");

/* Destello = nodo real, NO html::before */
assert.match(shell, /\.season-glow\s*\{/, "falta `.season-glow`");
assert.match(shell, /\.season-glow\{[^}]*position:\s*fixed/, "`.season-glow` fixed");
assert.match(shell, /\.season-glow\{[^}]*z-index:\s*36/, "`.season-glow` z-36");
assert.doesNotMatch(shell, /html\[data-season\]::before\{/, "NO html::before (fallaba en su WebView al scroll)");
assert.doesNotMatch(shell, /html\[data-season\]\s+\.botnav::before\{/, "NO destello en botnav");
assert.doesNotMatch(shell, /html\[data-season\]::after\{/, "sin html::after de halo");

/* Lluvia global */
assert.match(shell, /\.season-amb\{[^}]*position:\s*fixed/, "`.season-amb` fixed");
assert.match(shell, /\.season-amb\{[^}]*z-index:\s*37/, "`.season-amb` z-37");
assert.match(main, /className:"season-glow"/, "montar `.season-glow` en React");
assert.match(main, /useMemo\(function\(\)\{[\s\S]*?className:"season-amb"/, "`.season-amb` con useMemo");
assert.doesNotMatch(main, /show\s*&&\s*seasonPool/, "NO por pestaña");

/* Host opaco */
assert.match(shell, /\.page\.page-scroll-host\{[\s\S]*?background:\s*var\(--bg\)/, "host opaco");

/* Barra: hide sin opacity (evita ver la lista a través) */
assert.match(
  shell,
  /\.botnav\.botnav-hidden\{transform:translateY\(120%\);pointer-events:none\}/,
  "botnav-hidden SOLO translate, sin opacity:0"
);
assert.doesNotMatch(
  shell,
  /\.botnav\.botnav-hidden\{[^}]*opacity:\s*0/,
  "botnav-hidden no puede usar opacity:0 (fuga de contenido)"
);

assert.match(shell, /@keyframes\s+seasonglow/, "seasonglow");
assert.match(shell, /@keyframes\s+seasonDrift/, "seasonDrift");
assert.doesNotMatch(comps, /\{id:"temporada"\s*,\s*t:/, "tanda temporada fuera");
assert.match(comps, /temporada.*QUITADA|QUITADA.*temporada/i, "por qué se quitó");

console.log("ok: season-glow nodo real; lluvia z-37; botnav-hidden sin opacity; host opaco");
