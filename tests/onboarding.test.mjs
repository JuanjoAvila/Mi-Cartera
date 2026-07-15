#!/usr/bin/env node
import assert from "node:assert/strict";
import { loadPureLogicFromFile } from "../scripts/load-pure-logic.mjs";

const ctx = loadPureLogicFromFile();

function t(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}`); throw e; }
}

console.log("onboarding");

t("buildEmpty: arranque vacío sin datos demo", () => {
  const s = ctx.buildEmpty();
  assert.equal(s.onboarded, false);
  assert.equal(s.setupHint, true);
  assert.equal(s.tourSeen, false);
  assert.equal((s.accounts || []).length, 0);
  assert.equal((s.debts || []).length, 0);
  assert.equal((s.investments || []).length, 0);
  assert.equal(s.budget, 0);
  assert.equal(s.monthStartNet, 0);
});

t("seedFlows: legacy sin onboarded se marca como ya onboarded", () => {
  const s = ctx.seedFlows({ accounts: [{ id: "x", ent: "sabadell", name: "Test", value: 100 }] });
  assert.equal(s.onboarded, true);
  assert.equal(s.tourSeen, true);
});

t("seedFlows: usuario nuevo conserva setupHint y tourSeen", () => {
  const s = ctx.seedFlows(ctx.buildEmpty());
  assert.equal(s.onboarded, false);
  assert.equal(s.setupHint, true);
  assert.equal(s.tourSeen, false);
});

console.log("\nonboarding: OK");
