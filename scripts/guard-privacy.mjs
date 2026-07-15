#!/usr/bin/env node
/** CI: impide commitear datos financieros personales en public/index.html */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const html = fs.readFileSync(
  path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), "public", "index.html"),
  "utf8",
);

const BLOCK = [
  { re: /Pr[eé]stamo de mam[aá]/i, msg: "referencia personal en deudas" },
  { re: /monthStartNet:\s*1[89]\d{4}/, msg: "monthStartNet parece patrimonio real (>100k)" },
  { re: /179358\.20/, msg: "saldo hipoteca real filtrado" },
  { re: /187843/, msg: "historial patrimonio real filtrado" },
  { re: /DATOS REALES \(export JSON/i, msg: "cabecera DATA con datos reales" },
  { re: /Ford Focus ST-Line/i, msg: "activo personal identificable" },
];

let failed = false;
for (const { re, msg } of BLOCK) {
  if (re.test(html)) {
    console.error(`PRIVACY GUARD: ${msg}`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log("guard-privacy: OK");
