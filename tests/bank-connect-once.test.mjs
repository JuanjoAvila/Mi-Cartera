#!/usr/bin/env node
/**
 * UNA SOLA AUTORIZACIÓN BANCARIA A LA VEZ (2026-07-26).
 * Dos toques seguidos gastaban el permiso de un solo uso de Enable Banking y la segunda
 * volvía con invalid_request aunque el banco dijera «Operación realizada correctamente».
 *
 * `cloud` es `const` en el monolito y no aparece como propiedad del sandbox de vm, así que
 * el candado se prueba a través de `_bankConnectBusy` (la bandera que realmente serializa).
 */
import assert from "node:assert/strict";
import { loadPureLogicFromFile } from "../scripts/load-pure-logic.mjs";

const ctx = loadPureLogicFromFile();

console.log("bank-connect-once");

function t(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`  ✓ ${name}`))
    .catch((e) => { console.error(`  ✗ ${name}:`, e && e.message || e); throw e; });
}

const jobs = [];

jobs.push(t("si ya hay una autorización en marcha, la siguiente se rechaza con code=busy", async () => {
  assert.equal(typeof ctx.bankConnectOnce, "function");
  // Simula la primera petición viva sin tocar cloud (const inaccesible desde el sandbox).
  ctx._bankConnectBusy = new Promise(function(){ /* pendiente a propósito */ });
  let busyErr = null;
  await ctx.bankConnectOnce("CaixaBank", "ES").then(
    function(){ throw new Error("la segunda no debería resolverse"); },
    function(e){ busyErr = e; },
  );
  assert.ok(busyErr, "tenía que rechazar");
  assert.equal(busyErr.code, "busy");
  ctx._bankConnectBusy = null;
}));

jobs.push(t("al soltar el candado se puede volver a pedir", async () => {
  ctx._bankConnectBusy = null;
  // Sin cloud real en el sandbox, bankConnectOnce llamará a cloud y fallará — eso prueba
  // que YA NO está busy (si lo estuviera, rechazaría con code=busy antes de tocar cloud).
  let err = null;
  await ctx.bankConnectOnce("Sabadell", "ES").then(
    function(){},
    function(e){ err = e; },
  );
  assert.ok(err, "sin nube mockeada tiene que fallar al llamar a cloud");
  assert.notEqual(err.code, "busy", "el fallo no puede ser el candado: ya estaba libre");
}));

jobs.push(t("bankIssuesOf sigue excluyendo hipos pasajeros", () => {
  const out = ctx.bankIssuesOf([
    { aspsp:"CaixaBank", ok:false, expired:true },
    { aspsp:"Sabadell", ok:false },
    { aspsp:"BBVA", ok:false, noacct:true },
  ]);
  assert.deepEqual(out.map(function(x){ return x.aspsp+":"+x.kind; }),
    ["CaixaBank:expired", "BBVA:noacct"]);
}));

Promise.all(jobs).then(
  () => console.log("bank-connect-once: ok"),
  () => process.exit(1),
);
