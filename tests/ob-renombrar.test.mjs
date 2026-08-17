#!/usr/bin/env node
/**
 * RENOMBRAR UN MOVIMIENTO DEL BANCO NO PUEDE DUPLICAR EL GASTO.
 *
 * Petición suya del 2026-08-17: poder cambiar el «Movimiento» que deja Trade Republic, que «queda
 * feo». Renombrar ya se podía; lo que no se podía era hacerlo sin que el siguiente sync de Open
 * Banking metiera el gasto OTRA VEZ.
 *
 * El dedup de `importObExpenses` tiene tres capas y renombrar las rompía las tres a la vez:
 *   1. `ext_id`                   → TR no manda ninguno (todo null salvo importe, signo y fecha).
 *   2. `día | importe | comercio` → deja de casar en cuanto cambias el comercio.
 *   3. «sin nombre, ±3 días»      → solo mira gastos de OTRA fuente; el renombrado sigue en `ob`.
 *
 * El arreglo: la fila recuerda cómo la llamaba el BANCO (`obName`) y el dedup usa ese nombre.
 * Estos tests fijan las dos mitades — que el renombrado no duplique, y que eso no debilite el
 * dedup normal (dos cargos iguales de verdad tienen que seguir entrando los dos).
 */
import assert from "node:assert/strict";
import { loadPureLogicFromFile } from "../scripts/load-pure-logic.mjs";

const ctx = loadPureLogicFromFile();

function t(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}`); throw e; }
}

console.log("ob-renombrar");

const hoy = new Date();
const dia = (delta = 0) => {
  const d = new Date(hoy.getTime() + delta * 86400000);
  return d.toISOString().slice(0, 10);
};

/** Su montaje: TR es la cuenta de gasto diario. */
function estado(expenses = []) {
  return {
    accounts: [{ id: "a1", ent: "trade_republic", role: "diario", value: 500 }],
    settings: { expenseBanks: ["trade_republic"] },
    fixed: [], debts: [], oneoffs: [], flows: [],
    expenses,
  };
}

/** Un movimiento de TR tal como llega: sin ext_id y sin nombre (lo que manda Enable Banking). */
const movTR = (fecha, importe) => ({
  ent: "trade_republic", id: null, date: fecha, amount: importe,
  merchant: "Movimiento", note: "", card: true, status: "",
});

t("el mismo movimiento no entra dos veces (dedup de siempre)", () => {
  const prim = ctx.importObExpenses(estado(), [movTR(dia(-1), 41.8)]);
  assert.equal(prim.length, 1, "la primera vez sí entra");
  const seg = ctx.importObExpenses(estado(prim), [movTR(dia(-1), 41.8)]);
  assert.equal(seg, null, "la segunda vez ya no");
});

t("★ renombrado a mano: el siguiente sync NO lo mete otra vez", () => {
  const entrada = ctx.importObExpenses(estado(), [movTR(dia(-1), 41.8)])[0];
  assert.equal(entrada.merchant, "Movimiento");
  assert.equal(entrada.obName, "Movimiento", "la fila tiene que recordar cómo lo llamó el banco");

  // Él lo renombra en la ficha del gasto.
  const renombrado = Object.assign({}, entrada, { merchant: "Mercadona" });

  const otra = ctx.importObExpenses(estado([renombrado]), [movTR(dia(-1), 41.8)]);
  assert.equal(otra, null, "renombrar no puede resucitar el gasto en el siguiente sync");
});

t("★ y también con las filas VIEJAS, selladas al renombrarlas por primera vez", () => {
  /* Lo que él ya tiene en el móvil se guardó antes de que existiera `obName`. La app lo sella al
     renombrar (04-tab-gastos.js `saveEdit`); aquí se reproduce esa fila sellada. */
  const vieja = {
    id: "x1", date: new Date(dia(-1) + "T12:00:00").toISOString(), amount: 41.8,
    merchant: "Mercadona", obName: "Movimiento", category: "super",
    source: "ob", ent: "trade_republic",
  };
  const otra = ctx.importObExpenses(estado([vieja]), [movTR(dia(-1), 41.8)]);
  assert.equal(otra, null);
});

t("una fila vieja SIN sellar sigue deduplicándose por su nombre, como siempre", () => {
  const vieja = {
    id: "x2", date: new Date(dia(-1) + "T12:00:00").toISOString(), amount: 41.8,
    merchant: "Movimiento", category: "otros", source: "ob", ent: "trade_republic",
  };
  const otra = ctx.importObExpenses(estado([vieja]), [movTR(dia(-1), 41.8)]);
  assert.equal(otra, null, "sin obName cae a merchant: no puede romper lo que ya funcionaba");
});

t("dos cargos iguales de verdad siguen entrando los dos", () => {
  // El dedup protege de contar dos veces, no de gastar dos veces lo mismo el mismo día.
  const uno = ctx.importObExpenses(estado(), [movTR(dia(-1), 12.5)]);
  assert.equal(uno.length, 1);
  const dos = ctx.importObExpenses(estado(uno), [movTR(dia(-1), 12.5), movTR(dia(-2), 12.5)]);
  assert.equal(dos && dos.length, 1, "el del otro día entra; el repetido no");
  assert.equal(String(dos[0].date).slice(0, 10), dia(-2));
});

t("renombrar no rompe el gemelo de MacroDroid (la red de ±3 días)", () => {
  /* Sus gastos de TR entran ANTES por la noti del móvil, con el comercio de verdad. Open Banking
     los trae uno o dos días después y sin nombre. Esa red no la puede debilitar esto. */
  const porNoti = {
    id: "n1", date: new Date(dia(-2) + "T12:00:00").toISOString(), amount: 41.8,
    merchant: "Repsol", category: "transporte", source: "macrodroid", ent: "trade_republic",
  };
  const otra = ctx.importObExpenses(estado([porNoti]), [movTR(dia(-1), 41.8)]);
  assert.equal(otra, null, "el mismo gasto por dos caminos sigue siendo uno solo");
});

console.log("  ok");
