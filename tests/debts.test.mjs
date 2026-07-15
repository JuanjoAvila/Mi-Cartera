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

t("debtBalance: amortiza según cuotas ya pagadas (asOf en el pasado)", () => {
  const d = { value: 120000, monthly: 520, asOf: ymAbs(2026, 0) };  // ancla en enero 2026
  const abs = ymAbs(new Date().getFullYear(), new Date().getMonth());
  const esperado = Math.max(0, 120000 - 520 * Math.max(0, abs - ymAbs(2026, 0)));
  assert.equal(ctx.debtBalance(d), esperado);
});

t("debtBalance: nunca baja de 0 aunque la amortización supere el valor", () => {
  const d = { value: 1000, monthly: 600, asOf: ymAbs(2020, 0) };   // muchísimas cuotas «pagadas»
  assert.equal(ctx.debtBalance(d), 0);
});

t("debtBalance: financiación con balloon se liquida entera al llegar al último mes", () => {
  const now = new Date();
  const anchor = ymAbs(now.getFullYear(), now.getMonth()) - 12;
  const d = { value: 20000, monthly: 400, months: 12, balloon: 5000, amort: (20000 - 5000) / 12, asOf: anchor };
  assert.equal(ctx.debtBalance(d), 0);   // 12 cuotas ya pagadas + pago final → saldo 0
});

t("debtLeft: financiación 4 cuotas recién creada", () => {
  const now = new Date();
  const d = { value: 400, monthly: 100, months: 4, day: 28, asOf: ymAbs(now.getFullYear(), now.getMonth()) };
  assert.equal(ctx.debtLeft(d), 4);
});

t("debtLeft: null si no tiene plazo (hipoteca/préstamo abierto)", () => {
  assert.equal(ctx.debtLeft({ value: 5000, monthly: 200 }), null);
});

t("debtLeft: nunca negativo aunque se hayan pasado más cuotas que el plazo", () => {
  const now = new Date();
  const d = { value: 300, monthly: 50, months: 6, asOf: ymAbs(now.getFullYear(), now.getMonth()) - 10 };
  assert.equal(ctx.debtLeft(d), 0);
});

t("debtLeft: cuenta también la cuota de ESTE mes si ya pasó su día", () => {
  const now = new Date();
  const d = { value: 2400, monthly: 200, months: 24, day: 1, asOf: ymAbs(now.getFullYear(), now.getMonth()) };
  assert.equal(ctx.debtLeft(d), 23);   // el día 1 ya pasó siempre → cuenta la cuota de este mes
});

t("debtActive: sin cuota mensual = inactiva", () => {
  assert.equal(ctx.debtActive({ value: 100, monthly: 0 }), false);
});

console.log("\ndebts: OK");
