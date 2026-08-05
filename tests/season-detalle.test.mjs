/**
 * Guardián de ambientación de temporada (actualizado 2026-08-05, 4ª pasada).
 *
 * Historial del día:
 *  - Host transparente → Inicio+Gastos. Fix: host SIEMPRE opaco.
 *  - Destello solo al swipe (z-1 tapado). Intento z-39 «detrás del botnav» → en reposo
 *    `.scroll-host-on .botnav` pone fondo SÓLIDO y lo tapa otra vez.
 *  - Lluvia por pestaña: al swipe se veía OTRA fase («vuelve más arriba / se retrasa»).
 *
 * Fix actual:
 *  1. Destello = `html[data-season] .botnav::before` (dentro del botnav, sobrevive al fondo sólido).
 *  2. Lluvia = UNA sola `.season-amb` GLOBAL fixed z-36 (useMemo, no remount al cambiar tab).
 *  3. Host sigue opaco; velo superior cocido en background-image del host.
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

/* ---- 2. Una sola capa GLOBAL (no por pestaña) ---- */
assert.match(shell, /\.season-amb\s*\{/, "falta `.season-amb`");
assert.match(shell, /\.season-amb\{[^}]*position:\s*fixed/, "`.season-amb` debe ser fixed (capa global)");
assert.match(shell, /\.season-amb\{[^}]*z-index:\s*36/, "`.season-amb` a z-index 36 (sobre host 35, bajo botnav 40)");
assert.match(shell, /@keyframes\s+seasonDrift\s*\{/, "falta `seasonDrift`");
assert.match(shell, /\.page\{[^}]*z-index:\s*2/, "`.page` conserva z-index 2");
assert.match(main, /useMemo\(function\(\)\{[\s\S]*?className:"season-amb"/, "montar `.season-amb` con useMemo (sin remount)");
assert.doesNotMatch(
  main,
  /show\s*&&\s*seasonPool\s*\?\s*React\.createElement\("div",\{className:"season-amb"/,
  "NO montar una `.season-amb` por pestaña (causaba salto de fase al swipe)"
);
assert.doesNotMatch(main, /isHost\s*&&\s*seasonPool/, "NO montar solo en isHost");
assert.doesNotMatch(main, /setSeasonEpoch/, "no JS de ráfaga al cambiar de tab");
assert.match(i18n, /const\s+SEASON_AMB\s*=/, "falta SEASON_AMB");
assert.match(i18n, /const\s+SEASONS\s*=/, "SEASONS intacto");

/* ---- 3. Host SIEMPRE opaco ---- */
assert.match(
  shell,
  /\.page\.page-scroll-host\{[\s\S]*?background-color:\s*var\(--bg\)/,
  "`.page-scroll-host` fondo OPACO (background-color)"
);
assert.doesNotMatch(
  shell,
  /\.page\.page-scroll-host\{[^}]*background:\s*transparent/,
  "`.page-scroll-host` no puede ser transparente"
);

/* ---- 4. Destello DENTRO del botnav (sobrevive al fondo sólido de scroll-host-on) ---- */
assert.match(
  shell,
  /html\[data-season\]\s+\.botnav::before\{/,
  "destello debe vivir en `.botnav::before`"
);
assert.match(
  shell,
  /\.app-shell\.scroll-host-on\s+\.botnav\{[\s\S]*?background:\s*var\(--bg-2\)/,
  "scroll-host-on sigue con fondo sólido en botnav (ola nativa) — el destello va encima vía ::before"
);
assert.doesNotMatch(
  shell,
  /html\[data-season\]::after\{/,
  "sin html::after de destello (lo tapaba el botnav sólido; ahora es botnav::before)"
);
assert.doesNotMatch(
  shell,
  /html\[data-season\]::before\{[^}]*z-index:\s*3[69]/,
  "velo superior NO encima del contenido (z-36/39 lavaba el dinero); queda a z-1 + cocido en el host"
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
  /prefers-reduced-motion:reduce\)\{[\s\S]*?html\[data-season\]\s+\.botnav::before\{display:none/,
  "reduce-motion oculta el destello del botnav"
);
assert.match(
  shell,
  /prefers-reduced-motion:reduce\)\{[\s\S]*?html\[data-season\]\s+\.v4-title::after,\s*html\[data-season\]\s+\.v4-inicio-hi::after\{animation:none/,
  "reduce-motion apaga el pop del icono"
);

/* ---- 7. Tanda temporada fuera ---- */
assert.doesNotMatch(comps, /\{id:"temporada"\s*,\s*t:/, "tanda temporada no puede seguir en el panel");
assert.match(comps, /temporada.*QUITADA|QUITADA.*temporada/i, "debe quedar escrito por qué se quitó");

console.log("ok: destello en botnav::before; lluvia global fija z-36 sin salto de fase; host opaco");
