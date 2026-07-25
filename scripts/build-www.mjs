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

/* EL SELLADO NO ES OPCIONAL — si no cuaja, se para aquí (incidente 2026-07-25).
   Se publicó una APK copiando `public/` a `www/` a mano en vez de con este script, así que el
   bundle salió con `APP_VERSION: "dev"`. Eso no es un detalle cosmético: `_mcNewerVer` hace
   `parseInt("dev")` → NaN, la comparación de versiones devuelve `false` SIEMPRE, y el móvil
   **deja de recibir actualizaciones para siempre** — sin ningún error, solo un «vdev» discreto en
   Ajustes. Se instaló en el móvil del usuario y se publicó a su padre y su pareja.
   Mejor reventar el build que volver a mandar un APK que no puede actualizarse nunca. */
if (/APP_VERSION: "dev"/.test(idx) || !idx.includes(`APP_VERSION: "${version}"`)) {
  console.error(`❌ www/index.html NO quedó sellado con la versión ${version}.`);
  console.error("   Un bundle con APP_VERSION \"dev\" deja el móvil sin actualizaciones PARA SIEMPRE.");
  process.exit(1);
}

// El SW no se registra en la app nativa, pero sellamos por coherencia.
const swPath = join(dst, "sw.js");
if (existsSync(swPath)) {
  let sw = readFileSync(swPath, "utf8");
  sw = sw.replace(/const VERSION = ".*?";/, `const VERSION = "${version}-local";`);
  writeFileSync(swPath, sw);
}

console.log(`✅ www/ listo (bundle local de la app, APP_VERSION = "${version}")`);
