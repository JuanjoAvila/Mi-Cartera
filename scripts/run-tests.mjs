#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

console.log("── build-app ──");
const build = spawnSync("node", ["scripts/build-app.mjs"], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
if (build.status !== 0) process.exit(1);

const steps = [
  ["guard-privacy", ["node", "scripts/guard-privacy.mjs"]],
  ["check-syntax", ["node", "scripts/check-syntax.mjs"]],
  ["i18n-keys", ["node", "tests/i18n-keys.test.mjs"]],
  ["docs-frescura", ["node", "tests/docs-frescura.test.mjs"]],
  // El espejo de la memoria en docs/memoria/ tiene que ir al día: es lo único que ve una sesión
  // que no corra en este PC (móvil, Cursor, otra IA). En una máquina sin memoria local —el CI—
  // el script sale en verde sin hacer nada, así que esto solo pincha aquí, que es donde se arregla.
  ["memoria-espejo", ["node", "scripts/sync-memoria.mjs", "--check"]],
  ["security", ["node", "tests/security.test.mjs"]],
  ["webdebug-guard", ["node", "tests/webdebug-guard.test.mjs"]],
  ["gastos-active-bus", ["node", "tests/gastos-active-bus.test.mjs"]],
  ["track-asentar-raf", ["node", "tests/track-asentar-raf.test.mjs"]],
  ["season-detalle", ["node", "tests/season-detalle.test.mjs"]],
  ["edge-sintaxis", ["node", "tests/edge-sintaxis.test.mjs"]],
  ["presupuesto-rendimiento", ["node", "tests/presupuesto-rendimiento.test.mjs"]],
  ["finance-core", ["node", "tests/finance-core.test.mjs"]],
  ["ob-ingresos", ["node", "tests/ob-ingresos.test.mjs"]],
  ["reserva-dinero", ["node", "tests/reserva-dinero.test.mjs"]],
  ["month-budget-stats", ["node", "tests/month-budget-stats.test.mjs"]],
  ["presupuesto-servidor", ["node", "tests/presupuesto-servidor.test.mjs"]],
  ["widget-coherente", ["node", "tests/widget-coherente.test.mjs"]],
  ["ob-renombrar", ["node", "tests/ob-renombrar.test.mjs"]],
  ["divisa-original", ["node", "tests/divisa-original.test.mjs"]],
  ["wallet-notis", ["node", "tests/wallet-notis.test.mjs"]],
  ["invest-category", ["node", "tests/invest-category.test.mjs"]],
  ["fx-multi", ["node", "tests/fx-multi.test.mjs"]],
  ["categories", ["node", "tests/categories.test.mjs"]],
  ["revo-parse", ["node", "tests/revo-parse.test.mjs"]],
  ["revo-num", ["node", "tests/revo-num.test.mjs"]],
  ["debts", ["node", "tests/debts.test.mjs"]],
  ["ingest-classify", ["node", "tests/ingest-classify.test.mjs"]],
  ["revo-golden", ["node", "tests/revo-golden.test.mjs"]],
  ["import-hoja", ["node", "tests/import-hoja.test.mjs"]],
  ["import-docx-pdf", ["node", "tests/import-docx-pdf.test.mjs"]],
  ["hist-import-dup", ["node", "tests/hist-import-dup.test.mjs"]],
  ["revo-metales-coste", ["node", "tests/revo-metales-coste.test.mjs"]],
  ["parsers-revolut", ["node", "tests/parsers/revolut.test.mjs"]],
  ["motor-debt", ["node", "tests/motor-debt.test.mjs"]],
  ["reconcile-bank", ["node", "tests/reconcile-bank.test.mjs"]],
  ["onboarding", ["node", "tests/onboarding.test.mjs"]],
  ["expense-bank", ["node", "tests/expense-bank.test.mjs"]],
  ["tr-open-banking", ["node", "tests/tr-open-banking.test.mjs"]],
  ["huella-bundle", ["node", "tests/huella-bundle.test.mjs"]],
  ["expense-note", ["node", "tests/expense-note.test.mjs"]],
  ["bank-connect-once", ["node", "tests/bank-connect-once.test.mjs"]],
  ["inv-dashboard", ["node", "tests/inv-dashboard.test.mjs"]],
  ["financing", ["node", "tests/financing.test.mjs"]],
  ["updates", ["node", "tests/updates.test.mjs"]],
];

/* UN TEST QUE NO ESTÁ EN ESTA LISTA NO EXISTE (2026-08-17).
   La lista se mantiene a mano, así que escribir un `tests/loquesea.test.mjs` y olvidarse de
   añadirlo aquí deja un fichero que se ve en el repo, se puede lanzar a mano y pasa… y que ni
   `npm test` ni el CI ejecutan jamás. Pasó con `widget-coherente` y `ob-renombrar`: dos guardianes
   de bugs de dinero (el widget que se contradecía y el gasto duplicado al renombrar) publicados en
   beta sin que nadie los corriera. Un guardián dormido es peor que ninguno, porque el verde de
   Actions te dice que están vigilando.
   Esto se comprueba ANTES de correr nada: si falta uno, no hay informe que valga. */
const testsEnDisco = fs.readdirSync(path.join(root, "tests"))
  .filter((f) => f.endsWith(".test.mjs")).map((f) => "tests/" + f)
  .concat(fs.existsSync(path.join(root, "tests", "parsers"))
    ? fs.readdirSync(path.join(root, "tests", "parsers"))
        .filter((f) => f.endsWith(".test.mjs")).map((f) => "tests/parsers/" + f)
    : []);
const enLaLista = new Set(steps.flatMap(([, cmd]) => cmd.slice(1)));
const huerfanos = testsEnDisco.filter((p) => !enLaLista.has(p));
if (huerfanos.length) {
  console.error("\n✕ tests que existen pero NADIE ejecuta:\n" +
    huerfanos.map((p) => "    · " + p).join("\n") +
    "\n  Añádelos a `steps` en scripts/run-tests.mjs (o bórralos si ya no sirven).");
  process.exit(1);
}

let failed = false;
for (const [name, cmd] of steps) {
  console.log(`\n── ${name} ──`);
  const r = spawnSync(cmd[0], cmd.slice(1), { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) {
    failed = true;
    console.error(`\nFAILED: ${name}`);
  }
}

console.log("\n── ingest-deno ──");
const denoTests = [
  "supabase/functions/ingest/ingest.test.ts",
  "supabase/functions/_shared/crypto.test.ts",
  "supabase/functions/_shared/enablebanking.test.ts",
  "supabase/functions/delete-account/delete-account.test.ts",
];
for (const testFile of denoTests) {
  const denoArgs = testFile.includes("crypto.test")
    ? ["test", "--allow-env", testFile]
    : ["test", testFile];
  const deno = spawnSync("deno", denoArgs, {
    cwd: root, stdio: "pipe", shell: process.platform === "win32",
  });
  const denoOut = (deno.stderr?.toString() || "") + (deno.stdout?.toString() || "");
  if (deno.status === 0) {
    console.log(`  ✓ ${testFile}`);
  } else if (deno.error?.code === "ENOENT" || /not found|no se reconoce|not recognized/i.test(denoOut)) {
    console.log("  ⊘ deno no instalado, omitido");
    break;
  } else {
    if (denoOut) process.stderr.write(denoOut);
    failed = true;
    console.error(`FAILED: ${testFile}`);
  }
}

if (!failed) {
  console.log("\n── playwright-e2e ──");
  const pw = spawnSync("npx", ["playwright", "test", "--config=playwright.config.mjs"], {
    cwd: root, stdio: "inherit", shell: process.platform === "win32",
  });
  if (pw.status !== 0) {
    failed = true;
    console.error("\nFAILED: playwright-e2e");
  }
}

process.exit(failed ? 1 : 0);
