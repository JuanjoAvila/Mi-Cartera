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

const scriptRe = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
let match;
let idx = 0;
let failed = false;

while ((match = scriptRe.exec(html)) !== null) {
  idx++;
  const src = match[1].trim();
  if (!src || src.startsWith("try{var _s=JSON.parse")) continue; // tema pre-paint
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
