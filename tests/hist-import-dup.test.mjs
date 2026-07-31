#!/usr/bin/env node
/**
 * IMPORTAR HISTÓRICO — duplicados de RECIBO dentro del propio lote.
 *
 * Caso real (2026-07-31): 3 meses de histórico de La Caixa, "aceptar todo", y Revolut (donde
 * vive el rol de Fijos) se fue a -9k. La causa: una factura recurrente (alquiler, seguro…)
 * aparece una vez por mes en el extracto — son 3 movimientos reales, pero la MISMA factura. Sin
 * dedupe entre candidatos del propio lote, "Recibo" se marcaba las 3 veces y creaba 3 Fijos
 * idénticos, cada uno cobrándose TODOS los meses en el motor (`monthNetForAccount`): la factura
 * se restaba 3 veces cada mes, para siempre.
 */
import assert from "node:assert/strict";
import { loadPureLogicFromFile } from "../scripts/load-pure-logic.mjs";

const ctx = loadPureLogicFromFile();

function t(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}`); throw e; }
}

console.log("hist-import-dup");

const cand = (o) => Object.assign({ id: null, date: "2026-07-01", amount: 30, merchant: "SEGURO COCHE", note: "", card: false, ent: "revolut", kind: "out" }, o);

t("la misma factura repetida 3 meses: solo la más reciente (índice 0) queda sin marcar duplicado", () => {
  const cands = [
    cand({ date: "2026-07-28", merchant: "SEGURO COCHE" }),
    cand({ date: "2026-06-28", merchant: "SEGURO COCHE" }),
    cand({ date: "2026-05-28", merchant: "Seguro Coche" }),   // mismo comercio, mayúsculas distintas
  ];
  const dup = ctx.dedupeHistRecibos(cands);
  assert.equal(dup[0], undefined, "la primera ocurrencia (más reciente, cands ya viene ordenado desc) no es duplicado");
  assert.equal(dup[1], true);
  assert.equal(dup[2], true);
});

t("importes distintos no son la misma factura (no se dedupean)", () => {
  const cands = [
    cand({ date: "2026-07-28", amount: 30 }),
    cand({ date: "2026-06-28", amount: 45 }),
  ];
  const dup = ctx.dedupeHistRecibos(cands);
  assert.equal(dup[0], undefined);
  assert.equal(dup[1], undefined);
});

t("distinto banco (ent) no se dedupea aunque coincidan nombre e importe", () => {
  const cands = [
    cand({ date: "2026-07-28", ent: "revolut" }),
    cand({ date: "2026-06-28", ent: "caixabank" }),
  ];
  const dup = ctx.dedupeHistRecibos(cands);
  assert.equal(dup[0], undefined);
  assert.equal(dup[1], undefined);
});

t("las compras con tarjeta (kind:out, card:true) no entran en el dedupe de recibo", () => {
  const cands = [
    cand({ date: "2026-07-28", card: true, merchant: "Mercadona" }),
    cand({ date: "2026-06-28", card: true, merchant: "Mercadona" }),
  ];
  const dup = ctx.dedupeHistRecibos(cands);
  assert.equal(dup[0], undefined);
  assert.equal(dup[1], undefined);
});

t("los ingresos (kind:in) no entran en el dedupe de recibo", () => {
  const cands = [
    cand({ date: "2026-07-28", kind: "in", merchant: "NOMINA" }),
    cand({ date: "2026-06-28", kind: "in", merchant: "NOMINA" }),
  ];
  const dup = ctx.dedupeHistRecibos(cands);
  assert.equal(dup[0], undefined);
  assert.equal(dup[1], undefined);
});

console.log("\nhist-import-dup: OK");
