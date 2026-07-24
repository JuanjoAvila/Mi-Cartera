#!/usr/bin/env node
/**
 * Valida la sintaxis de los <script> inline de public/index.html.
 * AGENTS.md: node --check del HTML no vale; hay que extraer cada bloque y pasarlo por vm.Script.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const htmlPath = path.join(root, "public", "index.html");
const html = fs.readFileSync(htmlPath, "utf8");

// Los comentarios HTML se quitan ANTES de buscar bloques: si uno menciona la etiqueta de script
// (por ejemplo explicando por qué la CSP necesita 'unsafe-inline'), la regex empezaba a capturar
// ahí y daba un error de sintaxis absurdo sobre una frase en castellano (pasó el 2026-07-24).
const scanHtml = html.replace(/<!--[\s\S]*?-->/g, "");
const scriptRe = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
let match;
let idx = 0;
let failed = false;

while ((match = scriptRe.exec(scanHtml)) !== null) {
  idx++;
  const src = match[1].trim();
  if (!src || /^try\{var _[ks]=/.test(src)) continue; // tema pre-paint (lee la clave real o la de pruebas)
  try {
    new vm.Script(src, { filename: `public/index.html:script#${idx}` });
    console.log(`OK  script #${idx} (${src.length} chars)`);
  } catch (e) {
    failed = true;
    console.error(`FAIL script #${idx}: ${e.message}`);
  }
}

if (failed) process.exit(1);
console.log(`\n${idx} bloques revisados — sintaxis OK.`);
