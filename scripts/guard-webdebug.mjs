#!/usr/bin/env node
/**
 * Aborta si local.properties pide WEBDEBUG en un camino de release.
 * Lo usan `apk:prep` (aviso duro) y `release:apk` (siempre).
 *
 * Incidente 2026-08-06: MICARTERA_WEBDEBUG=1 se coló en assembleRelease y salió
 * una APK firmada con el socket de la WebView abierto.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const propsPath = path.join(root, "android", "local.properties");
const allowBypass = process.argv.includes("--allow-bypass");

function prop(text, key) {
  const m = text.match(new RegExp("^\\s*" + key.replace(/\./g, "\\.") + "\\s*=\\s*(.*)$", "m"));
  return m ? m[1].trim() : "";
}

if (!fs.existsSync(propsPath)) {
  console.log("guard-webdebug: sin android/local.properties → WEBDEBUG off por defecto");
  process.exit(0);
}

const text = fs.readFileSync(propsPath, "utf8");
const web = prop(text, "MICARTERA_WEBDEBUG");
const allow = prop(text, "MICARTERA_ALLOW_WEBDEBUG_RELEASE");

if (web === "1") {
  if (allowBypass && allow === "1") {
    console.warn("⚠ guard-webdebug: WEBDEBUG=1 con ALLOW_WEBDEBUG_RELEASE=1 (solo CDP, no publicar)");
    process.exit(0);
  }
  console.error(
    "✕ MICARTERA_WEBDEBUG=1 en android/local.properties.\n" +
      "  Eso abre el socket de depuración de la WebView en la APK firmada (2026-08-06).\n" +
      "  → Pon MICARTERA_WEBDEBUG=0 (o borra la clave) y vuelve a lanzar.\n" +
      "  → Si de verdad necesitas CDP en una release local: MICARTERA_ALLOW_WEBDEBUG_RELEASE=1\n" +
      "    y NUNCA subas esa APK a GitHub Releases (`npm run release:apk` lo rechaza igual)."
  );
  process.exit(1);
}

console.log("guard-webdebug: OK (WEB_DEBUG off)");
