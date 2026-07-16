#!/usr/bin/env node
/** Filtro por banco: source en nube (ob:ent / macrodroid) ↔ ent local. */
import assert from "node:assert/strict";
import { loadPureLogicFromFile } from "../scripts/load-pure-logic.mjs";

const ctx = loadPureLogicFromFile();

function t(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}`); throw e; }
}

console.log("expense-bank");

t("expenseSourceForCloud: embebe ent en ob", () => {
  assert.equal(ctx.expenseSourceForCloud({ source: "ob", ent: "caixabank" }), "ob:caixabank");
  assert.equal(ctx.expenseSourceForCloud({ source: "ob-hist", ent: "sabadell" }), "ob-hist:sabadell");
  assert.equal(ctx.expenseSourceForCloud({ source: "macrodroid" }), "macrodroid");
  assert.equal(ctx.expenseSourceForCloud({ source: "manual" }), "manual");
});

t("expenseBankOf: lee ent o source", () => {
  assert.equal(ctx.expenseBankOf({ ent: "bbva", source: "ob" }), "bbva");
  assert.equal(ctx.expenseBankOf({ source: "ob:caixabank" }), "caixabank");
  assert.equal(ctx.expenseBankOf({ source: "macrodroid" }), "trade_republic");
  assert.equal(ctx.expenseBankOf({ source: "manual" }), null);
});

t("expenseFromRow: recupera banco tras pull", () => {
  const tr = ctx.expenseFromRow({ id: "1", fecha: "2026-07-01T12:00:00.000Z", importe: 12, comercio: "X", cat: "otros", source: "macrodroid" });
  assert.equal(tr.ent, "trade_republic");
  assert.equal(tr.source, "macrodroid");
  const ob = ctx.expenseFromRow({ id: "2", fecha: "2026-07-01T12:00:00.000Z", importe: 5, comercio: "Y", cat: "super", source: "ob:sabadell" });
  assert.equal(ob.ent, "sabadell");
  assert.equal(ob.source, "ob");
});

console.log("\nexpense-bank: OK");
