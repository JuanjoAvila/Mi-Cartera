#!/usr/bin/env node
/**
 * CATEGORÍA "INVERSIÓN" (2026-08-03): round-up/cashback/aporte automático de un bróker (Trade
 * Republic) que ahora llega como movimiento REAL de Open Banking, no como estimación local.
 *
 * Contexto: la cuenta de TR del usuario tenía `roundup`/`saveback`/`monthlyInvest` configurados, y
 * un simulador local (`reconcileTR`) los restaba del efectivo a final de mes SIN pasar por Gastos.
 * Al empezar a importar TAMBIÉN los movimientos reales de esa misma cuenta como gasto/ingreso
 * normal, el mismo dinero se contaba DOS veces. Estos tests fijan las tres garantías que lo cierran:
 *   1) El importe EXACTO configurado en `monthlyInvest` se reconoce solo al importar (dato conocido,
 *      no una suposición sobre lo que manda el banco — que no manda nada, ver `enablebanking.ts`).
 *   2) `applyInvestBuy`/`reverseInvestBuy` compran/deshacen participaciones de forma exacta y
 *      simétrica (mismo `shares`/`cInv` de vuelta, no recalculado — el cambio USD pudo moverse).
 *   3) `reconcileTR` deja de simular round-up/saveback/aporte en cuanto la cuenta ya tiene UN solo
 *      movimiento real (`source:"ob"`) — el dato real gana, no se suma encima.
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

console.log("invest-category");

const today = new Date().toISOString().slice(0, 10);

t("importObExpenses etiqueta 'inversion' SOLO el importe exacto de monthlyInvest", () => {
  const s = {
    accounts: [{ id: "acc1", ent: "trade_republic", role: "diario", spendFrom: true, monthlyInvest: 50, rewardInv: "inv1" }],
    expenses: [],
    settings: {},
  };
  const txs = [
    { ent: "trade_republic", id: null, date: today, amount: 50, merchant: "Movimiento", note: "", card: false, status: "BOOK" },
    { ent: "trade_republic", id: null, date: today, amount: 12.34, merchant: "Movimiento", note: "", card: false, status: "BOOK" },
  ];
  const add = ctx.importObExpenses(s, txs);
  assert.equal(add.length, 2);
  const cincuenta = add.find((e) => e.amount === 50);
  const otro = add.find((e) => e.amount === 12.34);
  assert.equal(cincuenta.category, "inversion", "el importe exacto configurado se reconoce solo");
  assert.notEqual(otro.category, "inversion", "un importe distinto no se adivina como inversión");
});

t("importObExpenses no confunde monthlyInvest si la cuenta no lo tiene configurado", () => {
  const s = {
    accounts: [{ id: "acc1", ent: "trade_republic", role: "diario", spendFrom: true }],
    expenses: [],
    settings: {},
  };
  const txs = [{ ent: "trade_republic", id: null, date: today, amount: 50, merchant: "Movimiento", note: "", card: false, status: "BOOK" }];
  const add = ctx.importObExpenses(s, txs);
  assert.notEqual(add[0].category, "inversion");
});

function estadoInversion() {
  return {
    accounts: [{ id: "acc1", ent: "trade_republic", rewardInv: "inv1" }],
    investments: [{ id: "inv1", cur: "EUR", shares: 10, value: 1000, cost: 900 }],
    trRewardsTotal: 0,
  };
}

t("applyInvestBuy compra participaciones al precio actual y acumula trRewardsTotal", () => {
  const s = estadoInversion();
  const r = ctx.applyInvestBuy(s, "trade_republic", 50);
  assert.ok(r, "debe encontrar la cuenta y su inversión enlazada");
  const inv = r.state.investments.find((i) => i.id === "inv1");
  assert.equal(inv.shares, 10.5, "50€ al precio de 100€/participación = 0.5 participaciones");
  assert.equal(inv.value, 1050);
  assert.equal(inv.cost, 950);
  assert.equal(r.state.trRewardsTotal, 50);
  assert.equal(r.shares, 0.5);
  assert.equal(r.cInv, 50);
});

t("applyInvestBuy devuelve null si la cuenta no tiene fondo enlazado (sin adivinar destino)", () => {
  const s = { accounts: [{ id: "acc1", ent: "sabadell" }], investments: [], trRewardsTotal: 0 };
  assert.equal(ctx.applyInvestBuy(s, "sabadell", 50), null);
});

t("reverseInvestBuy deshace EXACTAMENTE lo que applyInvestBuy compró (round-trip)", () => {
  const s = estadoInversion();
  const r = ctx.applyInvestBuy(s, "trade_republic", 50);
  const back = ctx.reverseInvestBuy(r.state, r.invId, r.shares, r.cInv, r.amountEur);
  const inv = back.investments.find((i) => i.id === "inv1");
  assert.equal(inv.shares, 10, "vuelve exactamente a las participaciones de partida");
  assert.equal(inv.value, 1000);
  assert.equal(inv.cost, 900);
  assert.equal(back.trRewardsTotal, 0);
});

t("reconcileTR SIGUE simulando round-up/saveback/aporte si la cuenta no tiene datos reales de OB", () => {
  const s = {
    trAnchor: "2026-07",
    accounts: [{ id: "acc1", ent: "trade_republic", role: "diario", spendFrom: true, inject: 0, monthlyInvest: 50, rewardInv: "inv1", value: 500 }],
    investments: [{ id: "inv1", cur: "EUR", shares: 10, value: 1000, cost: 900 }],
    expenses: [], // sin ningún movimiento source:"ob" de esta cuenta
    trRewardsTotal: 0,
  };
  const ns = ctx.reconcileTR(s);
  const inv = ns.investments.find((i) => i.id === "inv1");
  assert.equal(inv.shares, 10.5, "sin dato real, el simulador antiguo sigue comprando el aporte estimado");
  assert.equal(inv.value, 1050);
});

t("reconcileTR DEJA de simular en cuanto la cuenta tiene un movimiento real (source:'ob')", () => {
  const s = {
    trAnchor: "2026-07",
    accounts: [{ id: "acc1", ent: "trade_republic", role: "diario", spendFrom: true, inject: 0, monthlyInvest: 50, rewardInv: "inv1", value: 500 }],
    investments: [{ id: "inv1", cur: "EUR", shares: 10, value: 1000, cost: 900 }],
    expenses: [{ id: "e1", date: today, amount: 10, category: "otros", source: "ob", ent: "trade_republic" }],
    trRewardsTotal: 0,
  };
  const ns = ctx.reconcileTR(s);
  const inv = ns.investments.find((i) => i.id === "inv1");
  assert.equal(inv.shares, 10, "el dato real gana: no se suma otra vez encima el aporte estimado");
  assert.equal(inv.value, 1000);
  assert.equal(ns.trRewardsTotal, 0);
});

/* BUG 2026-08-04: "Movimiento" (el hueco que deja TR sin datos) NO es un comercio de verdad — al
 * marcar UNO como Inversión, `setCat` recategorizaba TODOS los gastos con ese mismo texto genérico
 * (de cualquier fecha/importe) y aprendía el override para siempre. `fixMovInvasion` repara el
 * estado ya dañado: quita el override envenenado y deshace la compra de cada gasto que NO sea el
 * aporte automático real. */
t("fixMovInvasion borra el override envenenado 'movimiento'→inversion", () => {
  const s = { catOverrides: { movimiento: "inversion" }, expenses: [], accounts: [], investments: [] };
  const ns = ctx.fixMovInvasion(s);
  assert.equal(ns.catOverrides.movimiento, undefined);
});

t("fixMovInvasion deshace los 'Movimiento' arrastrados a Inversión por error, deja el aporte real", () => {
  const s = {
    accounts: [{ id: "acc1", ent: "trade_republic", monthlyInvest: 50, rewardInv: "inv1" }],
    investments: [{ id: "inv1", cur: "EUR", shares: 20, value: 2000, cost: 1800 }],
    trRewardsTotal: 100,
    expenses: [
      // el aporte automático real (50€, coincide con monthlyInvest) → se queda
      { id: "eA", merchant: "Movimiento", amount: 50, ent: "trade_republic", category: "inversion",
        investInvId: "inv1", investShares: 0.5, investCInv: 50, investAmountEur: 50 },
      // arrastrado por el bug (8.38€, NO coincide con monthlyInvest) → se deshace
      { id: "eB", merchant: "Movimiento", amount: 8.38, ent: "trade_republic", category: "inversion",
        investInvId: "inv1", investShares: 0.0838, investCInv: 8.38, investAmountEur: 8.38 },
    ],
  };
  const ns = ctx.fixMovInvasion(s);
  const eA = ns.expenses.find((e) => e.id === "eA"), eB = ns.expenses.find((e) => e.id === "eB");
  assert.equal(eA.category, "inversion", "el aporte automático real no se toca");
  assert.ok(eA.investInvId, "conserva su compra real");
  assert.notEqual(eB.category, "inversion", "el arrastrado por el bug vuelve a su categoría normal");
  assert.equal(eB.investInvId, undefined, "y pierde el rastro de una compra que nunca debió pasar");
  const inv = ns.investments.find((i) => i.id === "inv1");
  assert.equal(inv.shares, 19.9162, "el fondo ya incluía las dos compras (20) y solo se deshace la del arrastre (-0.0838)");
});

t("fixMovInvasion es idempotente (no repite la limpieza en la siguiente carga)", () => {
  const s = { catOverrides: {}, expenses: [], accounts: [], investments: [] };
  const once = ctx.fixMovInvasion(s);
  const twice = ctx.fixMovInvasion(once);
  assert.strictEqual(twice, once, "con el flag puesto, la segunda vuelta no toca nada");
});

console.log("\ninvest-category: OK");
