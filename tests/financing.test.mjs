#!/usr/bin/env node
import assert from "node:assert/strict";
import { loadPureLogicFromFile } from "../scripts/load-pure-logic.mjs";

const ctx = loadPureLogicFromFile();
const ymAbs = (y, m0) => y * 12 + m0;

function t(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}`); throw e; }
}

console.log("financing");

t("debtBalloonIn: 0 fuera del último mes del plazo", () => {
  const anchor = ymAbs(2026, 0); // enero 2026
  const d = { balloon: 8000, months: 48, asOf: anchor };
  assert.equal(ctx.debtBalloonIn(d, 2026, 1), 0);
  assert.equal(ctx.debtBalloonIn(d, 2027, 12), 0);
});

t("debtBalloonIn: balloon en el último mes (48 cuotas desde ene 2026 → dic 2029)", () => {
  const anchor = ymAbs(2026, 0);
  const d = { balloon: 8000, months: 48, asOf: anchor };
  assert.equal(ctx.debtBalloonIn(d, 2029, 12), 8000);
});

t("debtBalance: cuotas + balloon liquidan financiación coche", () => {
  const anchor = ymAbs(2026, 0);
  const amort = (20000 - 5000) / 12;
  const d = { value: 20000, monthly: 400, months: 12, balloon: 5000, amort, asOf: anchor };
  // 12 cuotas pagadas (mes actual incluido si día 1)
  const now = new Date();
  const paidMonths = Math.max(0, ymAbs(now.getFullYear(), now.getMonth()) - anchor) + 1;
  if (paidMonths >= 12) assert.equal(ctx.debtBalance(d), 0);
});

t("debtActive: deja de cobrar al acabar plazo", () => {
  const d = { value: 1000, monthly: 100, months: 4, asOf: ymAbs(2020, 0) };
  assert.equal(ctx.debtActive(d), false);
});

console.log("\nfinancing: OK");
