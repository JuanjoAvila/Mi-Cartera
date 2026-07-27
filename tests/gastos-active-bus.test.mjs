/**
 * Guardián del lag Deudas→Gastos (2026-07-27): Expenses NO puede recibir `active` por props.
 * Si vuelve a viajar por el memo de Gastos, cada aterrizaje reconstruye el árbol entero y
 * reaparece la asimetría «hacia Cartera fluido / hacia Gastos lag». Ver docs/LAG-DESLIZAR.md.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const core = readFileSync(join(root, "src/modules/00-core.js"), "utf8");
const gastos = readFileSync(join(root, "src/modules/04-tab-gastos.js"), "utf8");
const main = readFileSync(join(root, "src/modules/11-app-main.js"), "utf8");

assert.match(core, /function mcSetGastosActive\s*\(/, "falta mcSetGastosActive en 00-core");
assert.match(core, /function mcOnGastosActive\s*\(/, "falta mcOnGastosActive en 00-core");

assert.match(gastos, /mcOnGastosActive\s*\(/, "Expenses debe enterarse por el bus, no por props");
assert.doesNotMatch(
  gastos,
  /function Expenses\s*\(\s*\{[^}]*\bactive\b/,
  "Expenses NO debe declarar `active` en sus props (regresión del lag Deudas→Gastos)"
);

assert.match(main, /mcSetGastosActive\s*\(/, "App debe avisar por mcSetGastosActive");
assert.doesNotMatch(
  main,
  /active\s*:\s*tabIds\s*\[\s*tab\s*\]\s*===\s*"gastos"/,
  "no pasar active:tabIds[tab]==='gastos' a Expenses"
);
assert.doesNotMatch(
  main,
  /\bgastosActiva\b/,
  "gastosActiva en el memo de Gastos era la causa: no reintroducir"
);

console.log("ok: Gastos se entera de active por bus, sin re-render");
