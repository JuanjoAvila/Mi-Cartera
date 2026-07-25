#!/usr/bin/env node
/**
 * La documentación no puede quedarse atrás. Este test existe porque pasó de verdad:
 *
 *  · 2026-07-23 (4.7.1): el bump se hizo solo en `package.json` y `VERSION` se quedó en 4.7.0,
 *    así que el popup de Novedades no disparaba y el bundle OTA salía con la versión que el móvil
 *    ya tenía. Nadie se enteró hasta que el usuario preguntó por qué no cambiaba la versión.
 *  · 2026-07-25: el usuario entra a GitHub y lo primero que ve en el README es
 *    «Estado actual: v4.1.0» — íbamos por la 4.8.0. Siete versiones de desfase en el escaparate
 *    del proyecto. AGENTS.md §6 ya obligaba a actualizar la doc; una regla que solo vive en un
 *    .md se salta sin que salte nada. Por eso la regla ahora FALLA EL BUILD.
 *
 * Qué NO comprueba (a propósito): que el texto de la doc sea bueno. Eso no se automatiza. Esto
 * solo cierra el agujero de los NÚMEROS, que es el que se descuadra solo y en silencio.
 *
 * El APK va a su ritmo (OTA web ≠ APK): no se exige que iguale a VERSION, pero sí que `apk.json`
 * y `build.gradle` digan LO MISMO — apuntar a un release que no existe es el fallo caro.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
// Se quita el BOM: en Windows, `Set-Content -Encoding utf8` (PowerShell 5.1) lo mete SIEMPRE, y
// un BOM al principio de package.json revienta JSON.parse con un error que no dice nada útil
// («Unexpected token '﻿'»). Pasó al bumpear la 4.9.0 desde la consola. El fichero se arregla
// aparte, pero el test no debe volverse ilegible por un byte invisible.
const read = (p) => fs.readFileSync(path.join(root, p), "utf8").replace(/^﻿/, "");

let failed = 0;
const ok = (name) => console.log(`  ✓ ${name}`);
const bad = (name, detail) => { failed++; console.log(`  ✗ ${name}`); if (detail) console.log("      " + detail); };
// Compara y explica el arreglo: un test que solo dice «no coinciden» obliga a ir a buscar dónde.
const eq = (name, got, want, fix) => {
  if (got === want) ok(name);
  else bad(name, `dice «${got}» y VERSION es «${want}» → ${fix}`);
};

console.log("docs-frescura");

const VERSION = read("VERSION").trim();
if (!/^\d+\.\d+\.\d+$/.test(VERSION)) {
  bad("VERSION tiene formato X.Y.Z", `leído: «${VERSION}»`);
  process.exit(1);
}
ok(`VERSION = ${VERSION}`);

/* ---- 1. Los ficheros de versión del paquete ---- */
{
  const pkg = JSON.parse(read("package.json"));
  eq("package.json .version", pkg.version, VERSION, "npm version / editar a mano");

  const lock = JSON.parse(read("package-lock.json"));
  eq("package-lock.json .version", lock.version, VERSION, "editar `version` (x2: raíz y packages[''])");
  eq('package-lock.json packages[""].version', lock.packages?.[""]?.version, VERSION, 'editar packages[""].version');
}

/* ---- 2. CHANGELOG: la versión que corre tiene que estar escrita, y la primera ---- */
{
  const ch = read("CHANGELOG.md");
  const first = ch.match(/^## \[(\d+\.\d+\.\d+)\]/m);
  if (!first) bad("CHANGELOG.md tiene entradas `## [X.Y.Z]`");
  else eq("CHANGELOG.md primera entrada", first[1], VERSION, "añade la entrada de esta versión ARRIBA del todo");
}

/* ---- 3. RELEASE_NOTES: el popup de Novedades del usuario (regla explícita, 3.95.1) ----
   Se olvidó en la 3.95.1 y el usuario lo pidió expresamente: TODA versión publicada —incluidas
   las .1 de arreglo— lleva su entrada. Si no está, el popup enseña las notas de otra versión. */
{
  const comp = read("src/modules/10-app-components.js");
  const block = comp.match(/var RELEASE_NOTES=\[\s*\{\s*v:\s*"(\d+\.\d+\.\d+)"/);
  if (!block) bad("RELEASE_NOTES existe y empieza por {v:\"X.Y.Z\"}", "no se encontró en 10-app-components.js");
  else eq("RELEASE_NOTES primera nota", block[1], VERSION, "añade la nota de esta versión al PRINCIPIO del array (solo castellano)");
}

/* ---- 4. El escaparate: README y ROADMAP ----
   El README es lo primero que se ve al abrir el repo. Que ponga una versión de hace siete
   releases es el motivo por el que existe este fichero. */
{
  const readme = read("README.md");
  const m = readme.match(/Estado actual:\s*\*\*v(\d+\.\d+\.\d+)\*\*/);
  if (!m) bad("README.md tiene «Estado actual: **vX.Y.Z**»", "no se encontró la línea en la sección Roadmap");
  else eq("README.md «Estado actual»", m[1], VERSION, "actualiza la línea de Roadmap del README");

  const road = read("docs/ROADMAP.md");
  const cab = road.match(/^>\s*Estado a\s*\S+\s*·\s*\*\*v(\d+\.\d+\.\d+)\*\*/m);
  if (!cab) bad("docs/ROADMAP.md tiene cabecera «> Estado a FECHA · **vX.Y.Z**»");
  else eq("docs/ROADMAP.md cabecera", cab[1], VERSION, "actualiza el estado (y baja el anterior a la línea «Anterior:»)");

  const tabla = road.match(/\|\s*Web \/ OTA \(`VERSION`\)\s*\|\s*\*\*(\d+\.\d+\.\d+)\*\*/);
  if (!tabla) bad("docs/ROADMAP.md tiene la tabla «Versión actual (alineación)»");
  else eq("docs/ROADMAP.md tabla Web/OTA", tabla[1], VERSION, "actualiza la fila de la tabla de alineación");
}

/* ---- 5. APK: puede ir por detrás de la web (OTA), pero NUNCA descuadrado consigo mismo ----
   `apk.json` es lo que el móvil consulta para ofrecer «hay APK nueva». Si apunta a un release o a
   un versionCode que no es el que se compiló, el móvil se descarga otra cosa o no se descarga nada. */
{
  const apk = JSON.parse(read("public/apk.json"));
  const gradle = read("android/app/build.gradle");
  const gCode = Number((gradle.match(/versionCode\s+(\d+)/) || [])[1]);
  const gName = (gradle.match(/versionName\s+"([^"]+)"/) || [])[1];

  if (!gCode || !gName) bad("build.gradle expone versionCode/versionName");
  else {
    if (apk.versionCode === gCode) ok("apk.json versionCode = build.gradle");
    else bad("apk.json versionCode = build.gradle", `apk.json ${apk.versionCode} vs gradle ${gCode}`);

    if (apk.versionName === gName) ok("apk.json versionName = build.gradle");
    else bad("apk.json versionName = build.gradle", `apk.json «${apk.versionName}» vs gradle «${gName}»`);

    // La URL del asset tiene que nombrar la versión que dice servir: el fallo real fue apuntar a
    // un release inexistente y que el botón de actualizar se muriera en un 404.
    if (String(apk.url || "").includes(gName)) ok("apk.json url nombra esa versión");
    else bad("apk.json url nombra esa versión", `url «${apk.url}» no contiene «${gName}»`);
  }
}

console.log(failed ? `\n${failed} comprobación(es) de frescura de doc FALLARON` : "\ndocumentación al día");
process.exit(failed ? 1 : 0);
