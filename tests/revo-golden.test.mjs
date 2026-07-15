#!/usr/bin/env node
/** Golden-file: importador CSV Revolut con fixture realista (acciones + dividendo + oro). */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPureLogicFromFile } from "../scripts/load-pure-logic.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const csv = fs.readFileSync(path.join(root, "tests", "fixtures", "revolut-golden.csv"), "utf8");
const ctx = loadPureLogicFromFile();

console.log("revo-golden");

const p = ctx.revoParse(csv);
assert.ok(p, "parsea el golden CSV");
assert.equal(p.rows.length, 4);

const nvda = p.rows.filter((r) => r.ticker === "NVDA");
assert.equal(nvda.length, 2);
assert.equal(nvda[0].kind, "buy");
assert.equal(nvda[1].kind, "sell");

const div = p.rows.find((r) => r.kind === "dividend");
assert.ok(div);
assert.equal(div.amount, 1.25);

const xau = p.rows.find((r) => r.ticker === "XAU");
assert.ok(xau);
assert.equal(xau.kind, "buy");

const agg = ctx.revoAggregate(p);
const nvdaPos = agg.positions.find((x) => x.ticker === "NVDA");
assert.ok(nvdaPos);
assert.ok(nvdaPos.shares > 0 && nvdaPos.shares < 2);
assert.ok(nvdaPos.cost > 0);

console.log("  ✓ golden CSV parse + aggregate");
console.log("\nrevo-golden: OK");
