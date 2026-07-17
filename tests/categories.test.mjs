#!/usr/bin/env node
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

console.log("categories");

t("Gencat cae en impuestos y multas", () => {
  assert.equal(ctx.autoCategory("Gencat multa transit"), "tasas");
});

t("AEAT cae en impuestos y multas", () => {
  assert.equal(ctx.autoCategory("AEAT recaudacion"), "tasas");
});

t("Booking cae en ocio", () => {
  assert.equal(ctx.autoCategory("Booking.com"), "ocio");
});

t("Papelería cae en compras", () => {
  assert.equal(ctx.autoCategory("Papeleria Norma"), "compras");
});

t("Zooplus cae en hogar", () => {
  assert.equal(ctx.autoCategory("Zooplus"), "hogar");
});

t("Kinepolis cae en cine", () => {
  assert.equal(ctx.autoCategory("Kinepolis Barcelona"), "cine");
});

t("Consulta médica cae en salud", () => {
  assert.equal(ctx.autoCategory("Consulta medico Dr Lopez"), "salud");
});

t("Claude / Google Play cae en ocio", () => {
  assert.equal(ctx.autoCategory("Claude Anthropic"), "ocio");
  assert.equal(ctx.autoCategory("Google Play"), "ocio");
});

console.log("\ncategories: OK");
