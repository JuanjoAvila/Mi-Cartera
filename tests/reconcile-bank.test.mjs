#!/usr/bin/env node
/** Conciliación banco ↔ cargos modelados + helpers de matching. */
import assert from "node:assert/strict";
import { loadPureLogicFromFile } from "../scripts/load-pure-logic.mjs";

const ctx = loadPureLogicFromFile();

function t(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}`); throw e; }
}

console.log("reconcile-bank");

t("recAmtClose: tolera céntimos y 2%", () => {
  assert.equal(ctx.recAmtClose(100, 100.4), true);
  assert.equal(ctx.recAmtClose(100, 50), false);
});

t("recNameMatch: casa por palabras clave", () => {
  assert.equal(ctx.recNameMatch("Hipoteca Sabadell", "CUOTA HIPOTECA SABADELL"), true);
  assert.equal(ctx.recNameMatch("Netflix", "Spotify"), false);
});

t("reconcileBank: confirma cargo fijo que coincide", () => {
  const state = {
    accounts: [{ id: "a1", ent: "sabadell", role: "fijos", value: 1000 }],
    fixed: [{ id: "f1", name: "Alquiler", amount: 800, freq: "mes", account: "sabadell", day: 5, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }],
    debts: [],
    oneoffs: [],
    flows: [],
    bankTx: [
      { date: "2026-07-05", merchant: "ALQUILER PISO", amount: 800, ent: "sabadell" },
    ],
  };
  const r = ctx.reconcileBank(state, 2026, 7, 15);
  assert.equal(r.confirmed.length, 1);
  assert.equal(r.confirmed[0].name, "Alquiler");
});

t("reconcileBank: deuda activa aparece en modelados y confirma", () => {
  const state = {
    accounts: [{ id: "a1", ent: "sabadell", role: "fijos", value: 5000 }],
    fixed: [],
    debts: [{ id: "d1", name: "Coche", value: 8000, monthly: 350, day: 10, account: "sabadell", asOf: 2026 * 12 + 0 }],
    oneoffs: [],
    flows: [],
    bankTx: [
      { date: "2026-07-10", merchant: "CUOTA PRESTAMO COCHE", amount: 350, ent: "sabadell" },
    ],
  };
  const r = ctx.reconcileBank(state, 2026, 7, 20);
  assert.equal(r.confirmed.length, 1);
});

t("reconcileBank: movimiento sin modelo → newCharges", () => {
  const state = {
    accounts: [{ id: "a1", ent: "sabadell", role: "fijos", value: 1000 }],
    fixed: [],
    debts: [],
    oneoffs: [],
    flows: [],
    bankTx: [
      { date: "2026-07-12", merchant: "COMPRA DESCONOCIDA", amount: 42.5, ent: "sabadell" },
    ],
  };
  const r = ctx.reconcileBank(state, 2026, 7, 15);
  assert.equal(r.newCharges.length, 1);
  assert.equal(r.newCharges[0].merchant, "COMPRA DESCONOCIDA");
});

t("applyBankBalances: re-ancla cuenta primaria con saldo real", () => {
  const now = new Date();
  const s = {
    accounts: [{ id: "x", ent: "sabadell", name: "Sabadell", value: 900, role: "fijos" }],
    fixed: [],
    debts: [],
    obAccounts: [],
  };
  const links = [{
    ok: true,
    aspsp: "Banco de Sabadell",
    accounts: [{ uid: "u1", iban: "ES001", ok: true, balances: [{ type: "ITAV", amount: 1200, currency: "EUR" }] }],
  }];
  const r = ctx.applyBankBalances(s, links);
  assert.ok(r.changed);
  const acc = r.state.accounts.find((a) => a.ent === "sabadell");
  assert.ok(acc.value > 1100 && acc.value <= 1200);
});

console.log("\nreconcile-bank: OK");
