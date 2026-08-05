/**
 * Guardián ambientación (2026-08-05, pasadas CDP en su Oppo).
 *
 * Build .9 (f589f89c): intensidad + nav-sin-blur NO bastaron — RGB esquina +31 al scroll,
 * barra seguía al 88% en swipe. Fix real: portal fuera de #root + botnav opaco siempre.
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

assert.match(shell, /@keyframes\s+seasonglow/, "seasonglow");
assert.match(shell, /@keyframes\s+seasonDrift/, "seasonDrift");
assert.doesNotMatch(
  shell,
  /@keyframes\s+seasonglow\{[^}]*transform:/,
  "seasonglow sin transform (evita saltos de compositor en su WebView)"
);

/* Intensidad mínima del destello */
{
  const glowRule = shell.match(/\.season-glow\{([^}]*)\}/);
  assert.ok(glowRule, "falta la regla `.season-glow`");
  const baseOp = parseFloat((glowRule[1].match(/opacity:\s*([\d.]+)/) || [])[1] || "0");
  assert.ok(baseOp >= 0.6, "`.season-glow` demasiado tenue en reposo (opacity base < 0.6): " + baseOp);
  const kf = shell.match(/@keyframes\s+seasonglow\{([\s\S]*?)\}\s*(?=\/\*|@|\.)/);
  const minOp = kf ? Math.min(...[...kf[1].matchAll(/opacity:\s*([\d.]+)/g)].map((m) => parseFloat(m[1]))) : 0;
  assert.ok(minOp >= 0.45, "el mínimo del respiro de `seasonglow` es demasiado tenue: " + minOp);
  for (const line of shell.matchAll(/--season-glow-top:([^;]+);/g)) {
    for (const m of line[1].matchAll(/rgba\([^)]+,([\d.]+)\)/g)) {
      assert.ok(parseFloat(m[1]) >= 0.3, "gradiente de temporada demasiado tenue (< .3): " + line[1].slice(0, 80));
    }
  }
}
assert.doesNotMatch(comps, /\{id:"temporada"\s*,\s*t:/, "tanda temporada fuera");
assert.match(comps, /temporada.*QUITADA|QUITADA.*temporada/i, "por qué se quitó");

console.log("ok: season-portal en body; botnav opaco; glow sin transform en keyframes");
