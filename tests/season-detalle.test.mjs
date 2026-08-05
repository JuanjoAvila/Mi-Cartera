/**
 * Guardián ambientación (2026-08-05, pasadas CDP en su Oppo).
 *
 * Build .9 (f589f89c): intensidad + nav-sin-blur NO bastaron — RGB esquina +31 al scroll,
 * barra seguía al 88% en swipe. Fix real: portal fuera de #root + botnav opaco siempre.
 *
 * Build .11 (7c40d2fa): portal OK (posición fija), pero el destello TRANSLÚCIDO a 38vh encima
 * del contenido hacía que gráfico/cartillas al scrollear iluminaran el composite (~+30 RGB).
 * Fix: cinta opaca corta (safe-top+8) + ambiente en fondo del host; sin animación de opacity.
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

/* Portal fuera de #root — fixed dentro de #root{position:relative} seguía fallando en su Oppo */
assert.match(shell, /\.season-portal\{[^}]*position:\s*fixed/, "`.season-portal` fixed en body");
assert.match(shell, /\.season-portal\{[^}]*z-index:\s*36/, "`.season-portal` z-36");
assert.match(shell, /\.season-glow\{[^}]*position:\s*absolute/, "`.season-glow` absolute en portal");
assert.match(shell, /\.season-amb\{[^}]*position:\s*absolute/, "`.season-amb` absolute en portal");
assert.doesNotMatch(shell, /html\[data-season\]::before\{/, "NO html::before (fallaba en su WebView al scroll)");
assert.doesNotMatch(shell, /html\[data-season\]\s+\.botnav::before\{/, "NO destello en botnav");
assert.doesNotMatch(shell, /html\[data-season\]::after\{/, "sin html::after de halo");

assert.match(main, /ReactDOM\.createPortal\(/, "portal ReactDOM");
assert.match(main, /className:"season-portal"/, "montar `.season-portal`");
assert.match(main, /document\.body/, "portal a document.body");
assert.match(main, /className:"season-glow"/, "montar `.season-glow` en React");
assert.match(main, /useMemo\(function\(\)\{[\s\S]*?className:"season-amb"/, "`.season-amb` con useMemo");
assert.doesNotMatch(main, /show\s*&&\s*seasonPool/, "NO por pestaña");

/* Host opaco */
assert.match(shell, /\.page\.page-scroll-host\{[\s\S]*?background:\s*var\(--bg\)/, "host opaco");
/* Ambiente de temporada EN el fondo del host (detrás de cartillas, no encima) */
assert.match(
  shell,
  /html\[data-season\]\s+\.page\.page-scroll-host\{[^}]*background:\s*var\(--season-glow-top\),\s*var\(--bg\)/,
  "host con temática lleva gradiente detrás del contenido"
);
assert.match(
  shell,
  /html\.reduce-motion\s+\.page\.page-scroll-host\{[^}]*background:\s*var\(--bg\)/,
  "reduce-motion quita el gradiente del host"
);

/* Barra: hide sin opacity (evita ver la lista a través) */
assert.match(
  shell,
  /\.botnav\.botnav-hidden\{transform:translateY\(120%\);pointer-events:none;?\}/,
  "botnav-hidden SOLO translate, sin opacity:0"
);
assert.doesNotMatch(
  shell,
  /\.botnav\.botnav-hidden\{[^}]*opacity:\s*0/,
  "botnav-hidden no puede usar opacity:0 (fuga de contenido)"
);

/* Barra: fondo OPACO por defecto — nav-sin-blur solo en build .9 no bastó (WebView seguía 88%) */
assert.match(
  shell,
  /\.botnav\{[^}]*background:\s*var\(--bg-2\)/,
  "`.botnav` default tiene fondo sólido var(--bg-2)"
);
assert.doesNotMatch(
  shell,
  /\.botnav\{[^}]*color-mix\([^)]*88%/,
  "`.botnav` no puede usar color-mix 88% transparente (fuga en swipe)"
);

assert.match(
  shell,
  /\.app-shell\.nav-sin-blur \.botnav\{[^}]*background:\s*var\(--bg-2\)/,
  "nav-sin-blur mantiene fondo sólido"
);

assert.match(shell, /@keyframes\s+seasonDrift/, "seasonDrift");
/* Sin pulso de opacity: en .11 el respiro + contenido debajo = flash al scrollear */
assert.doesNotMatch(shell, /@keyframes\s+seasonglow/, "seasonglow no puede volver (flash al scroll)");
assert.doesNotMatch(
  shell,
  /\.season-glow\{[^}]*animation:\s*seasonglow/,
  "`.season-glow` sin animación de opacity"
);

/* Cinta corta opaca: presencia constante sin tapar saludo/avatar (~70px) */
{
  const glowRule = shell.match(/\.season-glow\{([^}]*)\}/);
  assert.ok(glowRule, "falta la regla `.season-glow`");
  const body = glowRule[1];
  assert.match(body, /height:\s*calc\(\s*var\(--safe-top\)\s*\+\s*8px\s*\)/, "cinta = safe-top+8px");
  assert.doesNotMatch(body, /height:\s*38vh/, "ya no a 38vh translúcido encima del contenido");
  const baseOp = parseFloat((body.match(/opacity:\s*([\d.]+)/) || [])[1] || "0");
  assert.ok(baseOp >= 0.99, "`.season-glow` debe ser opaco (opacity 1), no translúcido: " + baseOp);
  assert.match(body, /background:\s*var\(--season-glow-top\),\s*var\(--bg\)/, "gradiente + bg bake");
  assert.match(body, /background-size:/, "background-size ampliado para la cinta corta");
  for (const line of shell.matchAll(/--season-glow-top:([^;]+);/g)) {
    for (const m of line[1].matchAll(/rgba\([^)]+,([\d.]+)\)/g)) {
      assert.ok(parseFloat(m[1]) >= 0.3, "gradiente de temporada demasiado tenue (< .3): " + line[1].slice(0, 80));
    }
  }
}
assert.doesNotMatch(comps, /\{id:"temporada"\s*,\s*t:/, "tanda temporada fuera");
assert.match(comps, /temporada.*QUITADA|QUITADA.*temporada/i, "por qué se quitó");

console.log("ok: season cinta opaca + host bg; sin seasonglow; botnav opaco");
