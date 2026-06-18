#!/usr/bin/env node
/**
 * stamp-version.mjs
 * Sella la versión del Service Worker (public/sw.js) con un identificador único
 * para forzar la invalidación de caché en cada despliegue.
 *
 * El string de versión queda como: "<VERSION>-<fecha>-<sha-corto-o-timestamp>"
 * Resuelve el "gotcha" de tener que bumpear la versión del SW a mano.
 *
 * Uso: node scripts/stamp-version.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const version = readFileSync(join(root, "VERSION"), "utf8").trim();

let sha = "";
try {
  sha = execSync("git rev-parse --short HEAD", { cwd: root }).toString().trim();
} catch {
  sha = String(Date.now()).slice(-6); // fallback si no hay git (ej. local sin commit)
}

const date = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
const stamp = `${version}-${date}-${sha}`;

const swPath = join(root, "public", "sw.js");
let sw = readFileSync(swPath, "utf8");

// Reemplaza la línea: const VERSION = "...";
const before = sw;
sw = sw.replace(/const VERSION = ".*?";/, `const VERSION = "${stamp}";`);

if (sw === before) {
  console.error('⚠️  No se encontró `const VERSION = "...";` en public/sw.js');
  process.exit(1);
}

writeFileSync(swPath, sw);
console.log(`✅ Service Worker sellado: VERSION = "${stamp}"`);
