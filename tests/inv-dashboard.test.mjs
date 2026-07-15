#!/usr/bin/env node
import assert from "node:assert/strict";
import { loadPureLogicFromFile } from "../scripts/load-pure-logic.mjs";

const ctx = loadPureLogicFromFile();

function t(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}`); throw e; }
}

console.log("inv-dashboard");

t("recordInvSnapshot: un punto por día, actualiza valor/coste", () => {
  let h = ctx.recordInvSnapshot([], "2026-07-14", 1000, 900);
  assert.equal(h.length, 1);
  assert.equal(h[0].v, 1000);
  assert.equal(h[0].c, 900);
  h = ctx.recordInvSnapshot(h, "2026-07-14", 1050, 900);
  assert.equal(h.length, 1);
  assert.equal(h[0].v, 1050);
  h = ctx.recordInvSnapshot(h, "2026-07-15", 1100, 920);
  assert.equal(h.length, 2);
  assert.equal(h[1].d, "2026-07-15");
});

t("invPeriodChange: null con menos de 2 puntos", () => {
  assert.equal(ctx.invPeriodChange([]), null);
  assert.equal(ctx.invPeriodChange([{ d: "2026-07-15", v: 100 }]), null);
});

t("invPeriodChange: calcula % y variación absoluta", () => {
  const chg = ctx.invPeriodChange([
    { d: "2026-07-01", v: 1000 },
    { d: "2026-07-15", v: 1100 },
  ]);
  assert.ok(chg);
  assert.equal(chg.pct, 10);
  assert.equal(chg.abs, 100);
  assert.equal(chg.days, 2);
});

console.log("\ninv-dashboard: OK");
