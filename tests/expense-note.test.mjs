#!/usr/bin/env node
/**
 * CONCEPTO de los movimientos (petición del padre, 2026-07-24): el mensaje del bizum / la
 * descripción del extracto, para no tener que abrir la app del banco a cada rato.
 *
 * Lo que se prueba aquí es la parte delicada: QUÉ se enseña y qué NO. Un concepto que repite el
 * título o que es una referencia interna del banco («REF 000123456789») es ruido, y en una app de
 * dinero el ruido cuesta más que el hueco.
 */
import assert from "node:assert/strict";
import { loadPureLogicFromFile } from "../scripts/load-pure-logic.mjs";

const ctx = loadPureLogicFromFile();

function t(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}`); throw e; }
}

console.log("expense-note");

t("cleanNote: deja pasar un concepto de verdad", () => {
  assert.equal(ctx.cleanNote("Cena del sábado", "Bizum a Pedro"), "Cena del sábado");
  assert.equal(ctx.cleanNote("  alquiler   julio  ", "María"), "alquiler julio");
});

t("cleanNote: no repite lo que ya se ve en el título", () => {
  // El banco manda «BIZUM DE MARIA» y el título ya es «Bizum de María»: pintarlo dos veces
  // ensucia la lista sin aportar nada.
  assert.equal(ctx.cleanNote("BIZUM DE MARIA", "Bizum de María"), "");
  assert.equal(ctx.cleanNote("mercadona", "Mercadona"), "");
});

t("cleanNote: tira las referencias internas del banco", () => {
  assert.equal(ctx.cleanNote("REF 000123456789", "Recibo luz"), "");
  assert.equal(ctx.cleanNote("Mandato: ES1234567890ABCD", "Endesa"), "");
});

t("cleanNote: aguanta vacíos y nulos sin romper", () => {
  assert.equal(ctx.cleanNote(null, "X"), "");
  assert.equal(ctx.cleanNote("", "X"), "");
  assert.equal(ctx.cleanNote("   ", "X"), "");
  assert.equal(ctx.cleanNote("algo", null), "algo");
});

t("cleanNote: recorta a 160 (la columna `nota` no es infinita)", () => {
  const largo = "x".repeat(300);
  assert.equal(ctx.cleanNote(largo, "Y").length, 160);
});

t("expenseNote: lo que se pinta en la fila", () => {
  assert.equal(ctx.expenseNote({ merchant: "Bizum a Ana", note: "Regalo de Luis" }), "Regalo de Luis");
  assert.equal(ctx.expenseNote({ merchant: "Ana", note: "Ana" }), "");
  assert.equal(ctx.expenseNote({ merchant: "Ana" }), "");
  assert.equal(ctx.expenseNote(null), "");
});

t("expenseFromRow: baja `nota` y respeta el editado a mano", () => {
  const e = ctx.expenseFromRow({
    id: "1", fecha: "2026-07-01T12:00:00.000Z", importe: 40, comercio: "Bizum a Pedro",
    cat: "otros", source: "macrodroid", nota: "Cena del sábado", nota_edit: true,
  });
  assert.equal(e.note, "Cena del sábado");
  assert.equal(e.noteEdited, true);

  const sinNota = ctx.expenseFromRow({ id: "2", fecha: "2026-07-01T12:00:00.000Z", importe: 5, comercio: "X", cat: "otros", source: "manual" });
  assert.equal(sinNota.note, undefined);
  assert.equal(sinNota.noteEdited, undefined);
});

t("enrichNotesFromBankTx: rellena el histórico viejo con lo que trae el banco", () => {
  const expenses = [
    { id: "a", extId: "tx1", date: "2026-07-10T12:00:00.000Z", amount: 40, merchant: "Bizum a Pedro" },
    { id: "b", date: "2026-07-11T12:00:00.000Z", amount: 12.5, merchant: "Mercadona" },
  ];
  const txs = [
    { id: "tx1", date: "2026-07-10", amount: 40, merchant: "Bizum a Pedro", note: "Cena del sábado" },
    { id: "tx9", date: "2026-07-11", amount: 12.5, merchant: "Mercadona", note: "Compra semanal" },
  ];
  const out = ctx.enrichNotesFromBankTx(expenses, txs);
  assert.equal(out[0].note, "Cena del sábado");   // casado por ext_id
  assert.equal(out[1].note, "Compra semanal");    // casado por fecha|importe|comercio
});

t("enrichNotesFromBankTx: NUNCA pisa lo que escribió el usuario", () => {
  const expenses = [
    { id: "a", extId: "tx1", date: "2026-07-10T12:00:00.000Z", amount: 40, merchant: "Bizum a Pedro", note: "Lo mío", noteEdited: true },
    { id: "b", extId: "tx2", date: "2026-07-10T12:00:00.000Z", amount: 20, merchant: "Otro", note: "ya tenía" },
  ];
  const txs = [
    { id: "tx1", date: "2026-07-10", amount: 40, merchant: "Bizum a Pedro", note: "Lo del banco" },
    { id: "tx2", date: "2026-07-10", amount: 20, merchant: "Otro", note: "Lo del banco" },
  ];
  const out = ctx.enrichNotesFromBankTx(expenses, txs);
  assert.equal(out[0].note, "Lo mío");     // editado a mano: intocable
  assert.equal(out[1].note, "ya tenía");   // ya había concepto: solo se rellenan huecos
});

t("enrichNotesFromBankTx: sin nada que cambiar devuelve el MISMO array (cero renders de más)", () => {
  const expenses = [{ id: "a", date: "2026-07-10T12:00:00.000Z", amount: 40, merchant: "X" }];
  assert.equal(ctx.enrichNotesFromBankTx(expenses, [{ id: "z", date: "2026-01-01", amount: 1, merchant: "Y", note: "n" }]), expenses);
  assert.equal(ctx.enrichNotesFromBankTx(expenses, []), expenses);
  assert.equal(ctx.enrichNotesFromBankTx([], [{ id: "z", date: "2026-01-01", amount: 1, merchant: "Y", note: "n" }]).length, 0);
});

t("pushDeleted: las lápidas no crecen sin fin", () => {
  let list = [];
  for (let i = 0; i < 600; i++) list = ctx.pushDeleted(list, "k" + i);
  assert.equal(list.length, 500);
  assert.equal(list[list.length - 1], "k599");   // se conservan las MÁS RECIENTES
  assert.equal(list[0], "k100");
});

t("bankIssuesOf: caducados y sin-cuentas sí; hipos pasajeros no", () => {
  const links = [
    { aspsp: "Sabadell", ok: true },
    { aspsp: "CaixaBank", ok: false, expired: true },
    { aspsp: "BBVA", ok: false, noacct: true },
    { aspsp: "Santander", ok: false, error: "429 rate limit" },   // pasajero: se reintenta solo
  ];
  const out = ctx.bankIssuesOf(links);
  assert.equal(out.length, 2);
  assert.equal(out[0].aspsp, "CaixaBank");
  assert.equal(out[0].kind, "expired");
  assert.equal(out[1].aspsp, "BBVA");
  assert.equal(out[1].kind, "noacct");
});

console.log("\nexpense-note: OK");
