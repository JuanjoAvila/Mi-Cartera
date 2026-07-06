#!/usr/bin/env node
/**
 * build-www.mjs
 * Prepara el bundle LOCAL de la app Android (OTA, 2026-07-06):
 *   1. copia public/ → www/ (carpeta gitignorada; es lo que empaqueta `cap sync`)
 *   2. sella APP_VERSION (index.html) y VERSION (sw.js) con el fichero VERSION,
 *      igual que hace el CI para la web — así el bundle de fábrica sabe su versión
 *      y el chequeo OTA (version.json) compara manzanas con manzanas.
 *
 * public/ queda INTACTO (sigue siendo la fuente editable, con APP_VERSION "dev").
 * Uso: node scripts/build-www.mjs   (después: npx cap sync android)
 */
import { cpSync, rmSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "public");
const dst = join(root, "www");

if (existsSync(dst)) rmSync(dst, { recursive: true, force: true });
cpSync(src, dst, { recursive: true });

const version = readFileSync(join(root, "VERSION"), "utf8").trim();

const idxPath = join(dst, "index.html");
let idx = readFileSync(idxPath, "utf8");
idx = idx.replace(/APP_VERSION: ".*?"/, `APP_VERSION: "${version}"`);
writeFileSync(idxPath, idx);

// El SW no se registra en la app nativa, pero sellamos por coherencia.
const swPath = join(dst, "sw.js");
if (existsSync(swPath)) {
  let sw = readFileSync(swPath, "utf8");
  sw = sw.replace(/const VERSION = ".*?";/, `const VERSION = "${version}-local";`);
  writeFileSync(swPath, sw);
}

console.log(`✅ www/ listo (bundle local de la app, APP_VERSION = "${version}")`);
