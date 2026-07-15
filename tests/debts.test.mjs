#!/usr/bin/env node
import assert from "node:assert/strict";
import { loadPureLogicFromFile } from "../scripts/load-pure-logic.mjs";

const ctx = loadPureLogicFromFile();
const ymAbs = (y, m0) => y * 12 + m0;

function t(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}`); throw e; }
}

console.log("debts");

t("debtBalance: hipoteca sin plazo mantiene saldo", () => {
  const d = { value: 120000, monthly: 520 };
  assert.equal(ctx.debtBalance(d), 120000);
});

t("debtLeft: financiación 4 cuotas recién creada", () => {
  const now = new Date();
  const d = { value: 400, monthly: 100, months: 4, asOf: ymAbs(now.getFullYear(), now.getMonth()) };
  assert.equal(ctx.debtLeft(d), 4);
});

t("debtActive: sin cuota mensual = inactiva", () => {
  assert.equal(ctx.debtActive({ value: 100, monthly: 0 }), false);
});

console.log("\ndebts: OK");
