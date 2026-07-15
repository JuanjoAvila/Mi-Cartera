#!/usr/bin/env node
/**
 * Fixtures realistas del importador Revolut (acciones con locale mixto EU/US,
 * materias primas y un extracto NO soportado que debe rechazarse sin pisar nada).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPureLogicFromFile } from "../../scripts/load-pure-logic.mjs";

const root = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));
const fixtures = path.join(root, "tests", "parsers", "revolut.fixtures");
const read = (name) => fs.readFileSync(path.join(fixtures, name), "utf8");
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

console.log("parsers/revolut");

t("stocks-mixed-locale: coma decimal EU no se confunde con miles (88,94 → 88.94)", () => {
  const p = ctx.revoParse(read("stocks-mixed-locale.csv"));
  assert.ok(p);
  assert.equal(p.rows.length, 5);
  const first = p.rows[0];
  assert.equal(first.ticker, "VWCE");
  assert.equal(first.price, 88.94);   // antes del fix del 2026-07-13: 8894
  assert.equal(first.amount, 88.94);
});

t("stocks-mixed-locale: miles+decimal EU (1.108,22) y participaciones con coma", () => {
  const p = ctx.revoParse(read("stocks-mixed-locale.csv"));
  const buy2 = p.rows[1];
  assert.equal(buy2.price, 1108.22);
  assert.ok(Math.abs(buy2.qty - 0.76672417) < 1e-8);
});

t("stocks-mixed-locale: fila en formato US (punto decimal) convive en el mismo CSV", () => {
  const p = ctx.revoParse(read("stocks-mixed-locale.csv"));
  const aapl = p.rows.find((r) => r.ticker === "AAPL");
  assert.ok(aapl);
  assert.equal(aapl.amount, 150);
  assert.equal(aapl.cur, "USD");
});

t("stocks-mixed-locale: agregado por ticker (dividendo EU incluido, coste > 0)", () => {
  const p = ctx.revoParse(read("stocks-mixed-locale.csv"));
  const agg = ctx.revoAggregate(p);
  const vwce = agg.positions.find((x) => x.ticker === "VWCE");
  assert.ok(vwce);
  assert.equal(vwce.divi, 2.5);
  assert.ok(vwce.shares > 1 && vwce.shares < 2);
  assert.ok(vwce.cost > 0);
});

t("commodities-gold: solo cuenta XAU COMPLETADO (fuera EUR y REVERTIDO)", () => {
  const p = ctx.revoParseCommodities(read("commodities-gold.csv"));
  assert.ok(p);
  assert.equal(p.positions.length, 1);
  assert.equal(p.positions[0].ticker, "XAU");
  assert.equal(p.skipped, 2);   // 1 fila EUR (no es metal) + 1 REVERTIDO
  assert.equal(p.from, "2025-08-01");
  assert.equal(p.to, "2025-08-28");
});

t("commodities-gold: cantidad por saldo final == suma importe−comisión (doble vía, como el oro real)", () => {
  // Vía independiente del parser: sumamos a mano las filas XAU COMPLETADO del CSV crudo.
  const lines = read("commodities-gold.csv").replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
  let net = 0;
  for (const line of lines.slice(1)) {
    const f = line.split(",");
    const cur = f[7], state = f[8], amt = Number(f[5]), fee = Number(f[6]);
    if (cur !== "XAU" || !state.includes("COMPLET")) continue;
    net += amt - Math.abs(fee);
  }
  const p = ctx.revoParseCommodities(read("commodities-gold.csv"));
  assert.ok(Math.abs(net - p.positions[0].shares) < 1e-9, `saldo=${p.positions[0].shares} vs suma=${net}`);
});

t("pnl-statement: formato no soportado se rechaza (null), no se malinterpreta", () => {
  const csv = read("pnl-statement.csv");
  assert.equal(ctx.revoParse(csv), null);
  assert.equal(ctx.revoParseCommodities(csv), null);
});

console.log("\nparsers/revolut: OK");
