#!/usr/bin/env node
/**
 * RESERVAR DINERO (2026-08-03): repartir la nómina entre metas al cobrar.
 *
 * Petición del usuario: usa Trade Republic a la vez como fondo de emergencia, destino de
 * round-up/cashback, inversión en un ETF y cuenta de gasto diario. Podía crearse una "meta" de
 * ahorro, pero aportar a una meta nunca tocaba el presupuesto — así que ahorrar y controlar el
 * gasto variable con la MISMA cuenta no se veía claro. Estos tests fijan por escrito las dos
 * garantías que hacen que "reservar" se sienta real:
 *   1) El reparto nunca se pasa del propio ingreso ni dejar reglas huérfanas o de metas cumplidas.
 *   2) Aplicar el reparto es IDEMPOTENTE (una nómina, un reparto) y queda registrado para poder
 *      restarlo del presupuesto (ver `reservedSince`, que usa `monthSummary` en 04-tab-gastos.js).
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

console.log("reserva-dinero");

const goalA = { id: "gA", name: "Fondo emergencia", target: 5000, saved: 1000 };
const goalB = { id: "gB", name: "Parking recibos", target: 1000, saved: 200 };
const goalDone = { id: "gC", name: "Ya cumplida", target: 100, saved: 100, done: true };

const estado = () => ({
  goals: [goalA, goalB, goalDone],
  settings: {
    reservaRules: [
      { id: "r1", name: "", kind: "fixed", value: 70, goalId: "gB" },
      { id: "r2", name: "", kind: "fixed", value: 500, goalId: "gA" },
      { id: "r3", name: "", kind: "fixed", value: 999999, goalId: "gDoesNotExist" },
      { id: "r4", name: "", kind: "fixed", value: 50, goalId: "gC" }, // meta ya cumplida
    ],
  },
  reservaLog: [],
});

t("reparto fijo: suma exacta de las reglas válidas, ignora meta borrada y meta cumplida", () => {
  const plan = ctx.reservaPlanFor(estado(), 1620);
  assert.equal(plan.plan.length, 2);
  const byGoal = Object.fromEntries(plan.plan.map((p) => [p.goalId, p.amount]));
  assert.equal(byGoal.gB, 70);
  assert.equal(byGoal.gA, 500);
  assert.equal(plan.total, 570);
  assert.equal(plan.remainder, 1620 - 570);
});

t("reparto porcentual: se calcula sobre el importe bruto del ingreso", () => {
  const s = estado();
  s.settings.reservaRules = [{ id: "rp", name: "", kind: "pct", value: 10, goalId: "gA" }];
  const plan = ctx.reservaPlanFor(s, 2000);
  assert.equal(plan.plan.length, 1);
  assert.equal(plan.plan[0].amount, 200);
});

t("el reparto NUNCA se pasa del propio ingreso, aunque las reglas sumen más", () => {
  const s = estado();
  s.settings.reservaRules = [
    { id: "ra", name: "", kind: "fixed", value: 800, goalId: "gA" },
    { id: "rb", name: "", kind: "fixed", value: 800, goalId: "gB" },
  ];
  const plan = ctx.reservaPlanFor(s, 1000);
  assert.equal(plan.total, 1000, "el total repartido no puede superar el ingreso");
  assert.equal(plan.remainder, 0);
  const gAamt = plan.plan.find((p) => p.goalId === "gA").amount;
  const gBamt = plan.plan.find((p) => p.goalId === "gB").amount;
  assert.equal(gAamt, 800);
  assert.equal(gBamt, 200, "la segunda regla se recorta a lo que queda, no se descarta entera");
});

t("applyReserva suma a cada meta y deja el registro en reservaLog", () => {
  const s = estado();
  const income = { date: "2026-08-03", amount: -1620, merchant: "NOMINA" };
  const plan = ctx.reservaPlanFor(s, 1620).plan;
  const ns = ctx.applyReserva(s, income, plan, "trade_republic");
  const gA = ns.goals.find((g) => g.id === "gA");
  const gB = ns.goals.find((g) => g.id === "gB");
  assert.equal(gA.saved, 1500); // 1000 + 500
  assert.equal(gB.saved, 270); // 200 + 70
  assert.equal(ns.reservaLog.length, 2);
  assert.equal(ns.reservaLog[0].incomeKey, ctx.reservaKeyOf(income));
});

t("applyReserva es idempotente: la MISMA nómina no se reparte dos veces", () => {
  const s = estado();
  const income = { date: "2026-08-03", amount: -1620, merchant: "NOMINA" };
  const plan = ctx.reservaPlanFor(s, 1620).plan;
  const s1 = ctx.applyReserva(s, income, plan, "trade_republic");
  assert.ok(ctx.reservaAlreadyApplied(s1, income));
  const s2 = ctx.applyReserva(s1, income, plan, "trade_republic");
  assert.strictEqual(s2, s1, "un ingreso ya repartido no cambia el estado");
  assert.equal(s2.reservaLog.length, 2, "sin duplicar entradas en el registro");
});

t("una meta que se marca done() deja de recibir más reservas en repartos futuros", () => {
  const s = estado();
  s.goals = [{ id: "gA", name: "Emergencia", target: 100, saved: 90 }];
  s.settings.reservaRules = [{ id: "r1", name: "", kind: "fixed", value: 50, goalId: "gA" }];
  const plan1 = ctx.reservaPlanFor(s, 1000).plan;
  const s1 = ctx.applyReserva(s, { date: "2026-08-01", amount: -1000, merchant: "N1" }, plan1, "b");
  assert.ok(s1.goals[0].done, "la meta se marca cumplida al llegar a su objetivo");
  const plan2 = ctx.reservaPlanFor(s1, 1000);
  assert.equal(plan2.plan.length, 0, "una meta ya cumplida no recibe más reservas");
});

t("reservedSince suma solo lo aplicado desde la fecha dada (para restar del presupuesto del período)", () => {
  const s = estado();
  s.reservaLog = [
    { id: "a", ruleId: "r1", goalId: "gB", name: "x", amount: 70, date: "2026-07-15", incomeKey: "k1" },
    { id: "b", ruleId: "r2", goalId: "gA", name: "y", amount: 500, date: "2026-08-03", incomeKey: "k2" },
  ];
  const fromMs = new Date(2026, 7, 1).getTime(); // 1 ago 2026
  assert.equal(ctx.reservedSince(s, fromMs), 500, "solo cuenta lo reservado DESDE el inicio del período");
});

console.log("\nreserva-dinero: OK");
