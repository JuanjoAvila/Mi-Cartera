#!/usr/bin/env node
/** Motor de deudas: cuota resta del líquido y saldo decreciente (#2). */
import assert from "node:assert/strict";
import { loadPureLogicFromFile } from "../scripts/load-pure-logic.mjs";

const ctx = loadPureLogicFromFile();
const ymAbs = (y, m0) => y * 12 + m0;

function t(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}`); throw e; }
}

console.log("motor-debt");

t("debtChargeDay: sin día → 1 (entra en el motor)", () => {
  assert.equal(ctx.debtChargeDay({ monthly: 200 }), 1);
  assert.equal(ctx.debtChargeDay({ day: 15, monthly: 200 }), 15);
});

t("monthNetForAccount: cuota de deuda resta del banco (mes en curso, ya cobrada)", () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const s = {
    fixed: [],
    debts: [{ value: 12000, monthly: 520, day: 1, account: "sabadell", asOf: ymAbs(y, now.getMonth()) }],
    oneoffs: [],
    flows: [],
  };
  const net = ctx.monthNetForAccount(s, "sabadell", y, m, now.getDate());
  assert.ok(net <= -520, "net=" + net);
});

t("monthNetForAccount: cuota pendiente (día futuro) no resta aún", () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const futureDay = Math.min(28, now.getDate() + 5);
  if (futureDay <= now.getDate()) return; // skip si no hay día futuro en el mes
  const s = {
    fixed: [],
    debts: [{ value: 12000, monthly: 520, day: futureDay, account: "sabadell", asOf: ymAbs(y, now.getMonth()) }],
    oneoffs: [],
    flows: [],
  };
  const net = ctx.monthNetForAccount(s, "sabadell", y, m, now.getDate());
  assert.equal(net, 0);
});

t("isDebtPaidThisMonth: sin día explícito cuenta como día 1", () => {
  const today = new Date().getDate();
  assert.equal(ctx.isDebtPaidThisMonth({ monthly: 100 }, today), today >= 1);
});

console.log("\nmotor-debt: OK");
