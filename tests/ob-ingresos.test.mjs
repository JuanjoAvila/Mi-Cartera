#!/usr/bin/env node
/**
 * IMPORTAR DEL BANCO: compras con tarjeta E INGRESOS.
 *
 * Origen (2026-07-26): una sugerencia escrita desde la app el 16 de julio que estuvo DIEZ DÍAS sin
 * que la leyera nadie — «no me ha leído un ingreso de la caixa, he tenido notificación y todo pero
 * no lo ha leído». Era cierto: `importObExpenses` filtraba por `tx.card && tx.amount>0`, o sea
 * solo compras con tarjeta. El saldo del banco sí se aplicaba (el patrimonio salía bien), pero el
 * ingreso no aparecía como movimiento, así que desde fuera parecía que la app no se había enterado.
 *
 * Convención de signos (`_shared/enablebanking.ts` → `mapTransaction`): POSITIVO = gasto,
 * NEGATIVO = ingreso (CRDT → -amt). Estos tests la fijan por escrito, porque equivocarse de signo
 * aquí es cambiarle el dinero a alguien de sitio.
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

console.log("ob-ingresos");

const hoy = new Date().toISOString().slice(0, 10);
// Estado mínimo con CaixaBank como banco de gasto (es lo que decide `expenseBankEnts`).
const estado = {
  accounts: [{ id: "a1", ent: "caixa", name: "Cuenta", value: 1000, spendFrom: true, role: "diario" }],
  expenses: [],
  settings: { expenseBanks: ["caixa"] },
};
const tx = (o) => Object.assign({ ent: "caixa", id: null, date: hoy, amount: 0, merchant: "", note: "", card: false, status: "" }, o);

t("un INGRESO del banco se apunta (el fallo del 16 de julio)", () => {
  const add = ctx.importObExpenses(estado, [tx({ amount: -1250, merchant: "NOMINA JULIO", id: "x1" })]);
  assert.ok(add && add.length === 1, "el ingreso tiene que entrar");
  assert.equal(add[0].amount, -1250);
  assert.equal(add[0].category, "ingreso");
  assert.equal(add[0].ent, "caixa");
});

t("una compra con tarjeta se sigue apuntando como gasto", () => {
  const add = ctx.importObExpenses(estado, [tx({ amount: 23.4, merchant: "Mercadona", card: true, id: "x2" })]);
  assert.ok(add && add.length === 1);
  assert.equal(add[0].amount, 23.4);
  assert.notEqual(add[0].category, "ingreso");
});

t("un CARGO que no es de tarjeta sigue fuera: eso son los Fijos, y contarlo aquí sería contarlo dos veces", () => {
  const add = ctx.importObExpenses(estado, [tx({ amount: 230, merchant: "SEGURO COCHE", card: false, id: "x3" })]);
  assert.equal(add, null);
});

t("un ingreso ya importado no entra dos veces (dedup por ext_id)", () => {
  const previo = Object.assign({}, estado, {
    expenses: [{ id: "e1", extId: "x9", date: hoy + "T12:00:00.000Z", amount: -900, merchant: "NOMINA", category: "ingreso" }],
  });
  const add = ctx.importObExpenses(previo, [tx({ amount: -900, merchant: "NOMINA", id: "x9" })]);
  assert.equal(add, null);
});

t("un ingreso de un banco que NO alimenta Gastos no se cuela", () => {
  const add = ctx.importObExpenses(estado, [tx({ ent: "sabadell", amount: -500, merchant: "TRANSFERENCIA", id: "x4" })]);
  assert.equal(add, null);
});

t("sin comercio, un ingreso se titula «Ingreso» y no «Compra»", () => {
  const add = ctx.importObExpenses(estado, [tx({ amount: -60, merchant: "", id: "x5" })]);
  assert.equal(add[0].merchant, "Ingreso");
});

console.log("\nob-ingresos: OK");
