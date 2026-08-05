/**
 * Guardián ambientación (2026-08-05, seis pasadas medidas con ADB+CDP en su Oppo).
 *
 * Historia, para que nadie vuelva a proponer lo mismo:
 *   .9  — subir intensidad + `nav-sin-blur`: el píxel de la esquina seguía saltando +31 y la barra
 *         seguía al 88% durante el swipe. Fix real: portal FUERA de `#root` + botnav opaco siempre.
 *   .11 — velo translúcido a 38vh ENCIMA del contenido. El fallo no era el scroll vertical sino
 *         DESLIZAR ENTRE PESTAÑAS: la app entera pasa por debajo del velo y el composite se aclara.
 *         Y al empezar en y=0, teñía la barra de estado.
 *   .12 — gradiente horneado en `.page-scroll-host` + cinta opaca. Esa clase SE QUITA mientras el
 *         carrusel se mueve → con el dedo congelado a mitad de gesto el aporte del destello medía
 *         [0,0,0]: desaparecía. Y la cinta dejaba la franja de la cámara oliva [66,64,37] contra
 *         un fondo [20,38,30].
 *   .13 — COFIA: el destello se pinta OPACO y POR ENCIMA de todo, en una franja por la que el
 *         contenido no pasa (host y `.app` reservan su alto). Como no depende de lo que haya
 *         debajo, no puede cambiar: medido 62/62/62 en reposo, en gesto entre pestañas y
 *         scrolleando, y 0 en la franja de la cámara en los tres.
 *
 * Lo que vigila este fichero es justo eso: que el destello no vuelva a depender de lo que hay
 * debajo, que no invada la barra de estado y que la barra de abajo siga sin transparentar.
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

/* Portal fuera de #root y POR ENCIMA del host (35), debajo de la barra (40). */
assert.match(shell, /\.season-portal\{[^}]*position:\s*fixed/, "`.season-portal` fixed en body");
assert.match(shell, /\.season-portal\{[^}]*z-index:\s*36/, "`.season-portal` z-36 (encima del host)");
assert.match(shell, /\.season-glow\{[^}]*position:\s*absolute/, "`.season-glow` absolute en portal");
assert.match(shell, /\.season-amb\{[^}]*position:\s*absolute/, "`.season-amb` absolute en portal");
assert.doesNotMatch(shell, /html\[data-season\]::before\{/, "NO html::before (fallaba en su WebView al scroll)");
assert.doesNotMatch(shell, /html\[data-season\]\s+\.botnav::before\{/, "NO destello en botnav");
assert.doesNotMatch(shell, /html\[data-season\]::after\{/, "sin html::after de halo");

assert.match(main, /ReactDOM\.createPortal\(/, "portal ReactDOM");
assert.match(main, /className:"season-portal"/, "montar `.season-portal`");
assert.match(main, /document\.body/, "portal a document.body");
assert.match(main, /className:"season-glow"/, "montar `.season-glow` en React");
assert.doesNotMatch(main, /show\s*&&\s*seasonPool/, "NO por pestaña");
/* El destello se monta con que HAYA temática; si dependiera del pool de partículas,
   reduce-motion dejaría el hueco de la cofia vacío. */
assert.match(main, /if\(!seasonOn\)\s*return null/, "el destello no depende del pool de partículas");
assert.match(main, /seasonPool\s*\?\s*React\.createElement\("div",\{className:"season-amb"/,
  "las partículas sí son opcionales (reduce-motion)");

/* ===== La cofia ===== */
{
  const glowRule = shell.match(/\.season-glow\{([^}]*)\}/);
  assert.ok(glowRule, "falta la regla `.season-glow`");
  const body = glowRule[1];
  assert.match(body, /top:\s*0/, "la cofia empieza en y=0: si empezara más abajo, el contenido se vería sobre los iconos");
  assert.match(body, /height:\s*var\(--season-cofia\)/, "alto de la cofia por variable (lo comparte con el hueco reservado)");
  /* OPACA: es lo único que garantiza que no cambie con lo que pase por debajo. */
  assert.match(body, /background-color:\s*var\(--bg\)/, "la cofia es OPACA y del mismo tono que la app");
  assert.doesNotMatch(body, /opacity:\s*0?\.\d/, "nada de translucidez (velo .11: se aclaraba al deslizar entre pestañas)");
  assert.doesNotMatch(body, /animation:/, "sin animación: un destello que respira es justo lo que pidió que no hiciera");
  assert.match(body, /mask-image:linear-gradient/, "se desvanece abajo (si no, el contenido se corta en seco al scrollear)");
}
assert.doesNotMatch(shell, /@keyframes\s+seasonglow/, "`seasonglow` no puede volver (pulso de opacidad)");
assert.match(shell, /html\[data-season\]\{--season-cofia:calc\(var\(--safe-top\)/,
  "la cofia se mide desde `--safe-top` (en otro móvil la barra de estado no mide 40px)");

/* El gradiente arranca DEBAJO de los iconos: 0 sobre la cámara, en todos los estados. */
{
  const defs = [...shell.matchAll(/--season-glow-top:([^;]+);/g)];
  assert.ok(defs.length >= 6, "faltan temáticas con destello: " + defs.length);
  for (const d of defs) {
    assert.doesNotMatch(d[1], /at\s+\d+%\s+-\d+%/,
      "gradiente centrado por encima del borde → tiñe la barra de estado (fallo de .11 y .12): " + d[1].slice(0, 70));
    assert.match(d[1], /calc\(var\(--safe-top\)/,
      "el destello tiene que empezar por debajo de `--safe-top`: " + d[1].slice(0, 70));
  }
}

/* Hueco reservado: sin él la cofia opaca taparía el saludo. */
assert.match(shell, /html\[data-season\]\s+\.page\.page-scroll-host\{padding-top:var\(--season-cofia\)/,
  "el host reserva el alto de la cofia");
assert.match(shell, /html\[data-season\]\s+\.app\{padding-top:var\(--season-cofia\)/,
  "`.app` reserva el mismo alto (es el que manda mientras se desliza entre pestañas)");
/* Las partículas, por debajo de la cofia: una hoja cruzando los iconos del sistema es lo mismo
   que él señaló del tono de esa franja. */
assert.match(shell, /\.season-amb\{[^}]*top:var\(--season-cofia/, "las partículas arrancan bajo la cofia");

/* Host opaco y SIN gradiente: `.page-scroll-host` se quita durante el gesto (trampa de .12). */
assert.match(shell, /\.page\.page-scroll-host\{[\s\S]*?background:\s*var\(--bg\)/, "host opaco");
assert.doesNotMatch(shell, /\.page\.page-scroll-host\{[\s\S]*?background-clip:\s*content-box/,
  "NO background-clip:content-box (dejaba el destello entero detrás del host: aporte 0)");
assert.doesNotMatch(shell, /html\[data-season\]\s+\.page\.page-scroll-host\{[^}]*--season-glow-top/,
  "NO gradiente horneado en el host: esa clase se quita al deslizar entre pestañas");
assert.doesNotMatch(shell, /html\[data-season\]\s+\.app\{[^}]*--season-glow-top/,
  "NO gradiente horneado en .app");
assert.doesNotMatch(shell, /html\[data-season\]\s+body\{[^}]*--season-glow-top/,
  "NO gradiente en el body: en reposo lo tapa el host y saldría solo durante el gesto");

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

assert.doesNotMatch(comps, /\{id:"temporada"\s*,\s*t:/, "tanda temporada fuera");
assert.match(comps, /temporada.*QUITADA|QUITADA.*temporada/i, "por qué se quitó");

console.log("ok: season cofia opaca sobre el contenido; sin gradiente en host/app/body; botnav opaco");
