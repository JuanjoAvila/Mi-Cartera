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

t("Booking cae en viajes (no ocio)", () => {
  assert.equal(ctx.autoCategory("Booking.com"), "viajes");
});

t("Vueling cae en viajes", () => {
  assert.equal(ctx.autoCategory("Vueling Airlines"), "viajes");
});

t("Papelería cae en compras", () => {
  assert.equal(ctx.autoCategory("Papeleria Norma"), "compras");
});

t("Zooplus cae en mascotas (no hogar)", () => {
  assert.equal(ctx.autoCategory("Zooplus"), "mascotas");
});

t("Endesa cae en energía", () => {
  assert.equal(ctx.autoCategory("Endesa Factura"), "energia");
});

t("Udemy cae en educación", () => {
  assert.equal(ctx.autoCategory("Udemy.com"), "educacion");
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

t("Playtomic / pádel caen en padel (no ocio)", () => {
  assert.equal(ctx.autoCategory("Playtomic"), "padel");
  assert.equal(ctx.autoCategory("Club de padel Norte"), "padel");
});

t("Restaurante de pádel sigue en bares", () => {
  assert.equal(ctx.autoCategory("Restaurante de padel"), "bares");
});

/* El bar del padre (2026-08-06): con la keyword `"bar "` sólo picaban los nombres que SIGUEN con
   algo. Los que acaban en «bar» —que son legión— se iban a «otros», y «SPORTS BAR» a ocio. */
for (const nombre of ["1331 BAR", "SNACK BAR", "EL RACO BAR", "LA BOMBETA BAR", "SPORTS BAR", "BAR"]) {
  t(`«${nombre}» cae en bares aunque acabe en «bar»`, () => {
    assert.equal(ctx.autoCategory(nombre), "bares");
  });
}

t("Barcelona no cae en bares por el substring «bar»", () => {
  assert.notEqual(ctx.autoCategory("Parking Barcelona Centro"), "bares");
});

console.log("\ncategories: OK");
