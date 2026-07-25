#!/usr/bin/env node
/**
 * Coste en EUROS de los metales de Revolut, que vive en un fichero DISTINTO al de las onzas.
 *
 * Petición 2026-07-25: «lo del puto oro no funciona de saber cuántas ganancias tengo». La causa
 * no era el parser (las onzas salían bien): es que Revolut parte cada conversión en dos apuntes
 * y solo manda los euros en el extracto de la cuenta principal. Sin coste no hay % contra el que
 * comparar, así que la ficha del oro no podía decir si subes o bajas.
 *
 * Los CSV del usuario NO se commitean (AGENTS §9, repo público). Estas fixtures son inventadas
 * pero con la MISMA forma que las reales, incluidas las dos trampas que traían:
 *   · dos conversiones el mismo día (por eso se casa por marca de tiempo, no por fecha)
 *   · la comisión del metal viene en ONZAS y ya está descontada de la cantidad
 */
import assert from "node:assert/strict";
import { loadPureLogicFromFile } from "../scripts/load-pure-logic.mjs";

const ctx = loadPureLogicFromFile();
let n = 0;
const ok = (name) => { n++; console.log(`  ✓ ${name}`); };

console.log("revo-metales-coste");

const CAB = "Tipo,Producto,Fecha de inicio,Fecha de finalización,Descripción,Importe,Comisión,Divisa,State,Saldo";
const fila = (ts, desc, imp, com, div, saldo) =>
  `Cambio,Actual,${ts},${ts},${desc},${imp},${com},${div},COMPLETADO,${saldo}`;

/* ---- 1. Dos compras de oro: el coste es la suma de las dos patas en € ---- */
{
  const metales = [CAB,
    fila("2025-08-28 15:56:48", "Conversión a XAU", "0.033804", "0.000338", "XAU", "0.033466"),
    fila("2025-09-29 14:49:11", "Conversión a XAU", "0.030402", "0.000304", "XAU", "0.063564"),
  ].join("\n");
  const euros = [CAB,
    fila("2025-08-28 15:56:48", "Conversión a XAU", "-100.00", "0.00", "EUR", "595.93"),
    fila("2025-09-29 14:49:11", "Conversión a XAU", "-150.00", "0.00", "EUR", "286.46"),
  ].join("\n");

  const costs = ctx.revoMetalCostsFromFiat(euros);
  assert.ok(costs && costs.XAU, "encuentra los costes del oro en el extracto en €");
  const res = ctx.revoParseCommodities(metales);
  const oro = res.positions.find((p) => p.ticker === "XAU");
  assert.equal(ctx.revoMetalCost(oro.mov, costs.XAU), 250);
  ok("dos compras → coste = 100 + 150");
}

/* ---- 2. Dos metales el MISMO día: cada uno con su coste, sin mezclarse ----
   Es el caso real: el usuario convirtió a oro a las 09:19 y a plata a las 11:10 del 30/01. */
{
  const metales = [CAB,
    fila("2026-01-30 09:19:51", "Conversión a XAU", "0.114044", "0.001129", "XAU", "0.112915"),
    fila("2026-01-30 11:10:15", "Conversión a XAG", "1.190754", "0.011908", "XAG", "1.178846"),
  ].join("\n");
  const euros = [CAB,
    fila("2026-01-30 09:19:51", "Conversión a XAU", "-500.00", "0.00", "EUR", "947.48"),
    fila("2026-01-30 11:10:15", "Conversión a XAG", "-100.00", "0.00", "EUR", "1030.36"),
  ].join("\n");

  const costs = ctx.revoMetalCostsFromFiat(euros);
  const res = ctx.revoParseCommodities(metales);
  const oro = res.positions.find((p) => p.ticker === "XAU");
  const plata = res.positions.find((p) => p.ticker === "XAG");
  assert.equal(ctx.revoMetalCost(oro.mov, costs.XAU), 500);
  assert.equal(ctx.revoMetalCost(plata.mov, costs.XAG), 100);
  ok("dos metales el mismo día no se mezclan (se casa por hora, no por fecha)");
}

/* ---- 3. Venta parcial: se lleva su parte proporcional del coste (coste medio) ---- */
{
  const metales = [CAB,
    fila("2025-08-28 15:56:48", "Conversión a XAU", "0.100000", "0.000000", "XAU", "0.100000"),
    fila("2026-05-28 18:32:25", "Conversión a EUR", "-0.075000", "0.000000", "XAU", "0.025000"),
  ].join("\n");
  const euros = [CAB, fila("2025-08-28 15:56:48", "Conversión a XAU", "-400.00", "0.00", "EUR", "10.00")].join("\n");

  const costs = ctx.revoMetalCostsFromFiat(euros);
  const res = ctx.revoParseCommodities(metales);
  const oro = res.positions.find((p) => p.ticker === "XAU");
  // Vendidas 3/4 → queda 1/4 de las onzas y 1/4 del coste.
  assert.equal(ctx.revoMetalCost(oro.mov, costs.XAU), 100);
  ok("venta parcial deja el coste proporcional (400 € → 100 €)");
}

/* ---- 4. Vendido TODO: no queda posición, así que no hay coste que enseñar ---- */
{
  const metales = [CAB,
    fila("2026-01-30 11:10:15", "Conversión a XAG", "1.000000", "0.000000", "XAG", "1.000000"),
    fila("2026-05-28 18:32:25", "Conversión a EUR", "-1.000000", "0.000000", "XAG", "0.000000"),
  ].join("\n");
  const euros = [CAB, fila("2026-01-30 11:10:15", "Conversión a XAG", "-100.00", "0.00", "EUR", "10.00")].join("\n");
  const costs = ctx.revoMetalCostsFromFiat(euros);
  const res = ctx.revoParseCommodities(metales);
  // La posición a cero se filtra fuera: no se importa un metal que ya no tienes.
  assert.equal(res, null);
  ok("metal vendido del todo no entra en el importador");
  assert.ok(costs.XAG, "aun así el coste se había leído bien");
}

/* ---- 5. Falta la pata en € de UNA compra → «—», no un coste a medias ----
   Regla de la casa (AGENTS §1): si un dato no lo sabes, no te lo inventes. Un coste parcial
   haría que el «sube/baja» mintiera, que es peor que no enseñar nada. */
{
  const metales = [CAB,
    fila("2025-08-28 15:56:48", "Conversión a XAU", "0.033804", "0.000338", "XAU", "0.033466"),
    fila("2025-09-29 14:49:11", "Conversión a XAU", "0.030402", "0.000304", "XAU", "0.063564"),
  ].join("\n");
  const euros = [CAB, fila("2025-08-28 15:56:48", "Conversión a XAU", "-100.00", "0.00", "EUR", "595.93")].join("\n");
  const costs = ctx.revoMetalCostsFromFiat(euros);
  const res = ctx.revoParseCommodities(metales);
  const oro = res.positions.find((p) => p.ticker === "XAU");
  assert.equal(ctx.revoMetalCost(oro.mov, costs.XAU), null);
  ok("una compra sin su pata en € → null (no se inventa el coste)");
}

/* ---- 6. Sin extracto en € no se rompe nada: sigue el flujo de teclearlo a mano ---- */
{
  const soloAcciones = "Ticker,Type,Quantity,Price per share\nNVDA,BUY,1,100";
  assert.equal(ctx.revoMetalCostsFromFiat(soloAcciones), null);
  ok("un extracto que no es de cuenta no aporta costes (devuelve null)");
}

console.log(`\n${n} comprobaciones OK`);
