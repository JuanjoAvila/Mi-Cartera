#!/usr/bin/env node
/**
 * Ensambla public/index.html desde src/shell.html + src/modules/*.js
 * Fuente editable: src/modules/ (no public/index.html directamente).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const order = JSON.parse(fs.readFileSync(path.join(root, "src", "build-order.json"), "utf8"));
const modDir = path.join(root, "src", "modules");

let js = "";
for (const file of order) {
  const p = path.join(modDir, file);
  if (!fs.existsSync(p)) {
    console.error(`Falta módulo: ${file}`);
    process.exit(1);
  }
  js += fs.readFileSync(p, "utf8");
  if (!js.endsWith("\n")) js += "\n";
}

// DSN opcional (CI o local): SENTRY_DSN=https://…@… ingest…
const dsn = (process.env.SENTRY_DSN || "").trim();
if (dsn) {
  js = js.replace(/SENTRY_DSN:\s*""/, `SENTRY_DSN: ${JSON.stringify(dsn)}`);
}

let shell = fs.readFileSync(path.join(root, "src", "shell.html"), "utf8");
const MARK = "<!--MC_APP_SCRIPT-->";
if (!shell.includes(MARK)) {
  console.error("shell.html sin marcador <!--MC_APP_SCRIPT-->");
  process.exit(1);
}
// OJO: String.replace con string de reemplazo interpreta $' y $& — el JS tiene indexOf('$') y rompe el HTML.
const parts = shell.split(MARK);
if (parts.length !== 2) {
  console.error("marcador MC_APP_SCRIPT debe aparecer exactamente una vez");
  process.exit(1);
}
shell = parts[0] + js.trimEnd() + parts[1];

const out = path.join(root, "public", "index.html");
fs.writeFileSync(out, shell);
console.log(`✅ public/index.html (${(shell.length / 1024).toFixed(0)} KB, ${order.length} módulos)`);
