#!/usr/bin/env node
/**
 * Extrae el bloque principal de public/index.html → src/modules/*.js
 * Uso único o re-ejecutable tras editar index.html directamente (migración).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const htmlPath = path.join(root, "public", "index.html");
const html = fs.readFileSync(htmlPath, "utf8");
const lines = html.split("\n");

const SLICES = [
  ["00-core.js", 810, 1284],
  ["01-i18n.js", 1284, 3103],
  ["02-ui-shared.js", 3103, 3551],
  ["03-tab-dash.js", 3551, 3973],
  ["04-tab-gastos.js", 3973, 4295],
  ["05-dialogs-inv.js", 4295, 4722],
  ["06-sync-brokers.js", 4722, 5378],
  ["07-tab-patri-fijos.js", 5378, 5615],
  ["08-motor-bank.js", 5615, 6536],
  ["09-tab-debts-goals.js", 6536, 6920],
  ["10-app-components.js", 6920, 8218],
  ["11-app-main.js", 8218, 9258],
  ["12-boot.js", 9258, 9467],
];

const modDir = path.join(root, "src", "modules");
fs.mkdirSync(modDir, { recursive: true });

for (const [name, start, end] of SLICES) {
  const body = lines.slice(start - 1, end - 1).join("\n");
  fs.writeFileSync(path.join(modDir, name), body + "\n");
  console.log(`  ${name} (${end - start} lines)`);
}

const shellBefore = lines.slice(0, 808).join("\n");
const shellAfter = lines.slice(9467).join("\n"); // tras </script> del bloque app (no incluirlo)
const shell = shellBefore + "\n<script>\n<!--MC_APP_SCRIPT-->\n</script>\n" + shellAfter;
fs.writeFileSync(path.join(root, "src", "shell.html"), shell);

const order = SLICES.map(([n]) => n);
fs.writeFileSync(path.join(root, "src", "build-order.json"), JSON.stringify(order, null, 2) + "\n");

console.log(`\n✅ ${SLICES.length} módulos + shell.html + build-order.json`);
