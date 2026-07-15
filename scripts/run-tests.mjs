#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const steps = [
  ["guard-privacy", ["node", "scripts/guard-privacy.mjs"]],
  ["check-syntax", ["node", "scripts/check-syntax.mjs"]],
  ["finance-core", ["node", "tests/finance-core.test.mjs"]],
  ["revo-parse", ["node", "tests/revo-parse.test.mjs"]],
  ["revo-num", ["node", "tests/revo-num.test.mjs"]],
  ["debts", ["node", "tests/debts.test.mjs"]],
  ["ingest-classify", ["node", "tests/ingest-classify.test.mjs"]],
  ["revo-golden", ["node", "tests/revo-golden.test.mjs"]],
  ["parsers-revolut", ["node", "tests/parsers/revolut.test.mjs"]],
  ["motor-debt", ["node", "tests/motor-debt.test.mjs"]],
  ["reconcile-bank", ["node", "tests/reconcile-bank.test.mjs"]],
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

process.exit(failed ? 1 : 0);
