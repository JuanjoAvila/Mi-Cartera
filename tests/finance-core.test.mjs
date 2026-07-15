#!/usr/bin/env node
/**
 * Tests de lógica financiera crítica (round-up, saveback, dedup, metas…).
 * Carga funciones desde el monolito sin partirlo.
 */
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

console.log("finance-core");

t("spareOf: redondeo al euro superior", () => {
  assert.equal(ctx.spareOf(2.0), 1);
  assert.equal(ctx.spareOf(5.95), 0.05);
  assert.equal(ctx.spareOf(0.01), 0.99);
});

t("isCardSpend: excluye bizum y negativos", () => {
  assert.equal(ctx.isCardSpend({ amount: 10 }), true);
  assert.equal(ctx.isCardSpend({ amount: 10, noCard: true }), false);
  assert.equal(ctx.isCardSpend({ amount: -5 }), false);
});

t("roundupOf: solo tarjeta × multiplicador", () => {
  const ex = [
    { amount: 2.0 },
    { amount: 5.95 },
    { amount: 10, noCard: true },
  ];
  assert.equal(ctx.roundupOf(ex, 1), 1.05);
  assert.equal(ctx.roundupOf(ex, 2), 2.1);
  assert.equal(ctx.roundupOf(ex, 0), 0);
});

t("savebackOf: 1% tope 15€", () => {
  assert.equal(ctx.savebackOf([{ amount: 100 }]), 1);
  assert.equal(ctx.savebackOf([{ amount: 2000 }]), 15);
  assert.equal(ctx.savebackOf([{ amount: 50, noCard: true }]), 0);
});

t("mergeExpenses: dedup por fecha|importe|comercio", () => {
  const prev = [{ date: "2026-01-01", amount: 5, merchant: "Mercadona" }];
  const incoming = [
    { date: "2026-01-01", amount: 5, merchant: "Mercadona" },
    { date: "2026-01-02", amount: 3, merchant: "Bar" },
  ];
  const { list, nuevos } = ctx.mergeExpenses(prev, incoming);
  assert.equal(list.length, 2);
  assert.equal(nuevos, 1);
});

t("goalPct / goalRemaining", () => {
  assert.equal(ctx.goalPct({ target: 1000, saved: 500 }), 50);
  assert.equal(ctx.goalRemaining({ target: 1000, saved: 750 }), 250);
});

t("pickBankBalance: prefiere ITAV sobre CLBD", () => {
  const bal = ctx.pickBankBalance([
    { type: "CLBD", amount: 100 },
    { type: "ITAV", amount: 87.5 },
  ]);
  assert.equal(bal, 87.5);
});

t("entFromAspsp: mapea Sabadell", () => {
  assert.equal(ctx.entFromAspsp("Banco de Sabadell"), "sabadell");
});

console.log("\nfinance-core: OK");
