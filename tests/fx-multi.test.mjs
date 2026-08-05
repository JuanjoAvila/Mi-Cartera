#!/usr/bin/env node
import assert from "node:assert/strict";
import { loadPureLogicFromFile } from "../scripts/load-pure-logic.mjs";

const ctx = loadPureLogicFromFile();

function t(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log("fx-multi");

t("toEurAmt: EUR sin conversión", () => {
  assert.equal(ctx.toEurAmt(100, "EUR", {}), 100);
});

t("toEurAmt: USD con fx legacy", () => {
  assert.equal(ctx.toEurAmt(100, "USD", { fx: 0.92 }), 92);
});

t("toEurAmt: USD con fxRates", () => {
  assert.equal(ctx.toEurAmt(100, "USD", { fxRates: { USD: 0.85 } }), 85);
});

t("toEurAmt: GBP con fxRates", () => {
  assert.ok(Math.abs(ctx.toEurAmt(50, "GBP", { fxRates: { GBP: 1.15 } }) - 57.5) < 0.001);
});

t("toEurAmt: divisa desconocida no inventa tipo", () => {
  assert.equal(ctx.toEurAmt(100, "JPY", {}), 100);
});

t("fromEurAmt: USD con fx legacy", () => {
  assert.equal(ctx.fromEurAmt(92, "USD", { fx: 0.92 }), 100);
});

t("fromEurAmt: GBP con fxRates", () => {
  assert.ok(Math.abs(ctx.fromEurAmt(115, "GBP", { fxRates: { GBP: 1.15 } }) - 100) < 0.001);
});

t("invCostEur: prioriza costEur anclado", () => {
  assert.equal(ctx.invCostEur({ costEur: 50, cost: 100, cur: "USD" }, { fx: 0.92 }), 50);
});

t("invCostEur: convierte cost nativo si no hay costEur", () => {
  assert.equal(ctx.invCostEur({ cost: 100, cur: "USD" }, { fx: 0.92 }), 92);
});

t("toEurAmt: TRY con fxRates", () => {
  // 1 TRY = 0.018 EUR → 100 TRY = 1.8 EUR
  assert.ok(Math.abs(ctx.toEurAmt(100, "TRY", { fxRates: { TRY: 0.018 } }) - 1.8) < 0.001);
});

t("fromEurAmt: TRY con fxRates", () => {
  assert.ok(Math.abs(ctx.fromEurAmt(1.8, "TRY", { fxRates: { TRY: 0.018 } }) - 100) < 0.001);
});

console.log("\nfx-multi: OK");
