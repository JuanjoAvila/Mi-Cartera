#!/usr/bin/env node
/**
 * IMPORTAR DEL BANCO: compras E INGRESOS.
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
 *
 * ★ 2026-08-03: dos reglas nuevas, pedidas directamente («que meta todo en gastos independientemente
 * del filtro» + «que se detecte en mi ciclo aunque cobre en un banco distinto al de gasto diario»):
 *   1) En la cuenta de GASTO DIARIO cuenta CUALQUIER cargo, no solo tarjeta — antes un cargo sin
 *      tarjeta (o cuyo concepto no decía "TARJETA", como pasa con bancos que avisan en inglés) se
 *      perdía en silencio. Para no duplicar un Fijo/deuda/puntual ya modelado en esa cuenta, se
 *      descarta si CASA por nombre+importe con uno de ese mes (`matchesModeled`).
 *   2) Los INGRESOS entran de CUALQUIER banco enlazado, no solo el de gasto — si tu nómina cae en un
 *      banco que no es el de gasto diario, antes no se apuntaba en ningún sitio y «Mi ciclo»
 *      (que se ancla al último ingreso real) nunca encontraba el cobro.
 * Los bancos EXTRA de `settings.expenseBanks` (añadidos aparte de la cuenta diaria) SIGUEN exigiendo
 * tarjeta para los GASTOS — ahí sí puede haber recibos domiciliados que ya sean Fijos.
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
// Estado mínimo: CaixaBank = cuenta de GASTO DIARIO; Sabadell = banco EXTRA opcional (settings.expenseBanks).
const estado = {
  accounts: [{ id: "a1", ent: "caixa", name: "Cuenta", value: 1000, spendFrom: true, role: "diario" }],
  expenses: [],
  fixed: [],
  debts: [],
  oneoffs: [],
  settings: { expenseBanks: ["caixa", "sabadell"] },
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

t("en la cuenta de GASTO DIARIO, un cargo SIN tarjeta también cuenta ahora (2026-08-03)", () => {
  const add = ctx.importObExpenses(estado, [tx({ amount: 230, merchant: "SEGURO COCHE", card: false, id: "x3" })]);
  assert.ok(add && add.length === 1, "sin Fijo modelado, el cargo de la cuenta diaria entra igual");
  assert.equal(add[0].amount, 230);
});

t("...salvo que YA sea un Fijo modelado este mes en esa cuenta: no se duplica", () => {
  const conFijo = Object.assign({}, estado, {
    fixed: [{ id: "f1", name: "Seguro coche", amount: 230, freq: "mes", account: "caixa" }],
  });
  const add = ctx.importObExpenses(conFijo, [tx({ amount: 230, merchant: "SEGURO COCHE", card: false, id: "x3b" })]);
  assert.equal(add, null, "ya está contado por el motor mensual — importarlo también sería doble conteo");
});

t("en un banco EXTRA (no el de gasto diario), un cargo sin tarjeta sigue fuera: podría ser un recibo ya modelado como Fijo", () => {
  const add = ctx.importObExpenses(estado, [tx({ ent: "sabadell", amount: 55, merchant: "SEGURO HOGAR", card: false, id: "x3c" })]);
  assert.equal(add, null);
});

t("...pero una compra CON tarjeta en ese mismo banco extra sí cuenta", () => {
  const add = ctx.importObExpenses(estado, [tx({ ent: "sabadell", amount: 12, merchant: "Bar Paco", card: true, id: "x3d" })]);
  assert.ok(add && add.length === 1);
});

t("un ingreso ya importado no entra dos veces (dedup por ext_id)", () => {
  const previo = Object.assign({}, estado, {
    expenses: [{ id: "e1", extId: "x9", date: hoy + "T12:00:00.000Z", amount: -900, merchant: "NOMINA", category: "ingreso" }],
  });
  const add = ctx.importObExpenses(previo, [tx({ amount: -900, merchant: "NOMINA", id: "x9" })]);
  assert.equal(add, null);
});

t("un INGRESO entra de CUALQUIER banco enlazado, aunque no sea el de gasto ni esté en expenseBanks (2026-08-03: nómina de la pareja en otro banco, para que «Mi ciclo» la vea)", () => {
  const add = ctx.importObExpenses(estado, [tx({ ent: "bbva", amount: -500, merchant: "TRANSFERENCIA", id: "x4" })]);
  assert.ok(add && add.length === 1);
  assert.equal(add[0].category, "ingreso");
  assert.equal(add[0].ent, "bbva");
});

t("en cambio, un GASTO de un banco que no es el diario ni está en expenseBanks sigue sin colarse", () => {
  const add = ctx.importObExpenses(estado, [tx({ ent: "bbva", amount: 40, merchant: "Bar", card: true, id: "x4b" })]);
  assert.equal(add, null);
});

t("sin comercio, un ingreso se titula «Ingreso» y no «Compra»", () => {
  const add = ctx.importObExpenses(estado, [tx({ amount: -60, merchant: "", id: "x5" })]);
  assert.equal(add[0].merchant, "Ingreso");
});

console.log("\nob-ingresos: OK");
