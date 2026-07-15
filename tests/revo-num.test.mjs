#!/usr/bin/env node
import assert from "node:assert/strict";
import { loadPureLogicFromFile } from "../scripts/load-pure-logic.mjs";

const ctx = loadPureLogicFromFile();

function t(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}`); throw e; }
}

console.log("revo-num");

t("revoNum: EU decimal 88,94", () => {
  assert.equal(ctx.revoNum("88,94"), "88.94");
  assert.equal(ctx.revoAmt("€88,94"), 88.94);
});

t("revoNum: EU miles+decimal 1.108,22", () => {
  assert.equal(ctx.revoNum("1.108,22"), "1108.22");
  assert.equal(ctx.revoAmt("$1,108.22"), 1108.22);
});

t("revoNum: US format 1,108.22", () => {
  assert.equal(ctx.revoNum("1,108.22"), "1108.22");
});

t("revoNum: no confunde 88,94 con 8894 (bug 2026-07-13)", () => {
  const n = ctx.revoAmt("88,94 €");
  assert.ok(n < 100 && n > 80, `esperado ~88.94, got ${n}`);
});

console.log("\nrevo-num: OK");
