#!/usr/bin/env node
/**
 * Tests del importador CSV de Revolut (acciones + utilidades revoAmt/revoClassify).
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

const SAMPLE_CSV = `Date,Ticker,Type,Quantity,Price per share,Total amount,Currency
2025-06-01,AAPL,BUY - MARKET,1,150.00,$150.00,USD
2025-07-01,AAPL,SELL - MARKET,0.5,160.00,$80.00,USD
2025-08-01,,DIVIDEND,,,$2.50,USD
`;

console.log("revo-parse");

t("revoAmt: parsea $ y paréntesis negativos", () => {
  assert.equal(ctx.revoAmt("$1,108.22"), 1108.22);
  assert.equal(ctx.revoAmt("($0.01)"), -0.01);
  assert.equal(ctx.revoAmt("€88,94"), 88.94);
});

t("revoClassify: buy/sell/dividend", () => {
  assert.equal(ctx.revoClassify("BUY - MARKET"), "buy");
  assert.equal(ctx.revoClassify("SELL - LIMIT"), "sell");
  assert.equal(ctx.revoClassify("DIVIDEND"), "dividend");
});

t("revoParse: CSV mínimo válido", () => {
  const p = ctx.revoParse(SAMPLE_CSV);
  assert.ok(p);
  assert.equal(p.rows.length, 3);
  assert.equal(p.rows[0].ticker, "AAPL");
  assert.equal(p.rows[0].kind, "buy");
});

t("revoAggregate: venta parcial reduce shares y coste medio", () => {
  const p = ctx.revoParse(SAMPLE_CSV);
  const agg = ctx.revoAggregate(p);
  const aapl = agg.positions.find((x) => x.ticker === "AAPL");
  assert.ok(aapl);
  assert.ok(aapl.shares > 0 && aapl.shares < 1);
  assert.ok(aapl.cost > 0);
});

t("revoParse: rechaza CSV sin cabecera Revolut", () => {
  assert.equal(ctx.revoParse("foo,bar\n1,2"), null);
});

console.log("\nrevo-parse: OK");
