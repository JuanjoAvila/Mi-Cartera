#!/usr/bin/env node
import { spawnSync } from "node:child_process";
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
  ["gastos-active-bus", ["node", "tests/gastos-active-bus.test.mjs"]],
  ["track-asentar-raf", ["node", "tests/track-asentar-raf.test.mjs"]],
  ["edge-sintaxis", ["node", "tests/edge-sintaxis.test.mjs"]],
  ["presupuesto-rendimiento", ["node", "tests/presupuesto-rendimiento.test.mjs"]],
  ["finance-core", ["node", "tests/finance-core.test.mjs"]],
  ["ob-ingresos", ["node", "tests/ob-ingresos.test.mjs"]],
  ["fx-multi", ["node", "tests/fx-multi.test.mjs"]],
  ["categories", ["node", "tests/categories.test.mjs"]],
  ["revo-parse", ["node", "tests/revo-parse.test.mjs"]],
  ["revo-num", ["node", "tests/revo-num.test.mjs"]],
  ["debts", ["node", "tests/debts.test.mjs"]],
  ["ingest-classify", ["node", "tests/ingest-classify.test.mjs"]],
  ["revo-golden", ["node", "tests/revo-golden.test.mjs"]],
  ["import-hoja", ["node", "tests/import-hoja.test.mjs"]],
  ["hist-import-dup", ["node", "tests/hist-import-dup.test.mjs"]],
  ["revo-metales-coste", ["node", "tests/revo-metales-coste.test.mjs"]],
  ["parsers-revolut", ["node", "tests/parsers/revolut.test.mjs"]],
  ["motor-debt", ["node", "tests/motor-debt.test.mjs"]],
  ["reconcile-bank", ["node", "tests/reconcile-bank.test.mjs"]],
  ["onboarding", ["node", "tests/onboarding.test.mjs"]],
  ["expense-bank", ["node", "tests/expense-bank.test.mjs"]],
  ["tr-open-banking", ["node", "tests/tr-open-banking.test.mjs"]],
  ["expense-note", ["node", "tests/expense-note.test.mjs"]],
  ["bank-connect-once", ["node", "tests/bank-connect-once.test.mjs"]],
  ["inv-dashboard", ["node", "tests/inv-dashboard.test.mjs"]],
  ["financing", ["node", "tests/financing.test.mjs"]],
  ["updates", ["node", "tests/updates.test.mjs"]],
];

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
