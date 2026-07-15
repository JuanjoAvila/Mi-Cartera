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
  { re: /Pr[eé]stamo de (mam[aá]|pap[aá]|abuel[oa]|herman[oa]|ti[oa]|suegr[oa])/i, msg: "referencia a un familiar real en una deuda" },
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

// Umbrales numéricos sobre la SEMILLA sintética (const DATA = {...}; en public/index.html):
// si alguien pega ahí patrimonio/deudas/activos reales por error, suelen ser cifras muy por
// encima de lo que necesita un ejemplo de demo. No es infalible, pero pilla el caso típico
// (bug real: se filtró un monthStartNet de ~180-190k que era el patrimonio real del usuario).
const dataBlock = html.match(/const DATA = \{[\s\S]*?\n\};/);
if (dataBlock) {
  const NUMERIC_LIMITS = [
    { key: "monthStartNet", max: 100000 },
    { key: "value", max: 300000 },      // cuentas/inversiones/deudas de ejemplo (la hipoteca demo son 120k)
  ];
  for (const { key, max } of NUMERIC_LIMITS) {
    const re = new RegExp(key + ":\\s*(-?[\\d.]+)", "g");
    let m;
    while ((m = re.exec(dataBlock[0])) !== null) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && Math.abs(n) > max) {
        console.error(`PRIVACY GUARD: ${key}=${n} en la semilla DATA supera ${max} — ¿patrimonio real filtrado?`);
        failed = true;
      }
    }
  }
} else {
  console.error("PRIVACY GUARD: no se encontró el bloque `const DATA = {...}` a revisar");
  failed = true;
}

if (failed) process.exit(1);
console.log("guard-privacy: OK");
