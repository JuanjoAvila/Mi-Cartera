#!/usr/bin/env node
/** La huella del bundle: lo que decide si una beta se publica o no (2026-08-01).
 *
 *  Si esto se rompe, el canal vuelve a uno de sus dos fallos, y los dos son caros:
 *   · huella que cambia sola  → beta nueva en cada push, y su móvil avisando de actualizaciones
 *     vacías («me pide actualizar todo el maldito rato»);
 *   · huella que no cambia nunca → una beta con arreglos de verdad que NO se publica y él prueba
 *     lo de ayer sin saberlo, que es peor todavía.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const RAIZ = process.cwd();
const IDX = path.join(RAIZ, "public", "index.html");
const SW = path.join(RAIZ, "public", "sw.js");
const huella = () => execFileSync(process.execPath, ["scripts/huella-bundle.mjs"], { cwd: RAIZ }).toString().trim();

function t(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}`); throw e; }
}

console.log("huella-bundle");

const idx0 = readFileSync(IDX, "utf8");
const sw0 = readFileSync(SW, "utf8");
const base = huella();

try {
  t("imprime algo (el guardo de «ejecutado directamente» no puede volver a callarse en Windows)", () => {
    assert.match(base, /^[0-9a-f]{16}$/, "se esperaba un sha256 corto");
  });

  t("es estable: dos lecturas seguidas dan lo mismo", () => {
    assert.equal(huella(), base);
  });

  t("IGNORA el sello de versión de index.html (si no, cambiaría en cada compilación)", () => {
    writeFileSync(IDX, idx0.replace(/APP_VERSION: ".*?"/, 'APP_VERSION: "99.99.99.99"'), "utf8");
    assert.equal(huella(), base);
  });

  t("IGNORA el sello de sw.js", () => {
    writeFileSync(SW, sw0.replace(/const VERSION = ".*?";/, 'const VERSION = "99.99.99.99";'), "utf8");
    assert.equal(huella(), base);
  });

  t("pero SÍ cambia si cambia el código de verdad", () => {
    writeFileSync(IDX, idx0.replace("</body>", "<!-- un cambio real -->\n</body>"), "utf8");
    assert.notEqual(huella(), base, "un cambio en el bundle TIENE que publicar beta");
  });
} finally {
  writeFileSync(IDX, idx0, "utf8");
  writeFileSync(SW, sw0, "utf8");
}

assert.equal(huella(), base, "el test tiene que dejar public/ como estaba");
console.log("huella-bundle: OK");
