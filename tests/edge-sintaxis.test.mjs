#!/usr/bin/env node
/**
 * Sintaxis de las Edge Functions, sin Deno instalado.
 *
 * Las funciones de `supabase/functions/**` se despliegan solas al pushear (workflow
 * `supabase.yml`). Un paréntesis de más NO lo ve `npm test` —que solo mira el monolito web— ni
 * el workflow de Pages: el fallo aparece en un run distinto, después de que el usuario ya crea
 * que está publicado. Y sin Deno instalado en la máquina, `deno check` se omite en silencio
 * (`run-tests.mjs` lo salta a propósito para no obligar a instalarlo).
 *
 * Esto pasa cada fichero por el parser de TypeScript de esbuild —que YA es dependencia del
 * repo, porque minifica el HTML— sin resolver imports ni comprobar tipos. No es un `deno check`,
 * pero caza justo lo que un humano rompe editando: llaves, paréntesis y `async` mal cerrados.
 * Motivo real: la tanda de CORS del 2026-07-25 envolvió diez handlers en `withCors(...)`, o sea
 * diez paréntesis nuevos que cerrar a mano.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transformSync } from "esbuild";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const base = path.join(root, "supabase", "functions");

function ficheros(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...ficheros(p));
    else if (e.name.endsWith(".ts")) out.push(p);
  }
  return out;
}

console.log("edge-sintaxis");
let fallos = 0;
let n = 0;
for (const f of ficheros(base)) {
  const rel = path.relative(root, f).replace(/\\/g, "/");
  try {
    transformSync(fs.readFileSync(f, "utf8"), { loader: "ts", format: "esm" });
    n++;
    console.log(`  ✓ ${rel}`);
  } catch (e) {
    fallos++;
    console.error(`  ✕ ${rel}\n    ${String(e.message || e).split("\n")[0]}`);
  }
}

/* Y la otra invariante que tampoco se ve en un diff: que nadie vuelva a poner el origen en "*".
   Es la línea que más fácil se cuela al crear una función nueva —está en todos los ejemplos de
   Supabase— y significa que cualquier página de internet puede llamarla desde el navegador de
   quien la visite. La lista blanca vive en `_shared/cors.ts` y se aplica con `withCors`. */
for (const f of ficheros(base)) {
  const rel = path.relative(root, f).replace(/\\/g, "/");
  const src = fs.readFileSync(f, "utf8");
  if (/["']Access-Control-Allow-Origin["']\s*:\s*["']\*["']/.test(src)) {
    fallos++;
    console.error(`  ✕ ${rel}\n    tiene Access-Control-Allow-Origin: "*" — usa withCors de _shared/cors.ts`);
  }
}

if (fallos) {
  console.error(`\n${fallos} problema(s) en las Edge Functions`);
  process.exit(1);
}
console.log(`\n${n} ficheros OK · ninguno regala el origen con "*"`);
