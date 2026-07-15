#!/usr/bin/env node
/**
 * Tests de clasificación del ingest (Edge Function supabase/functions/ingest).
 * Lógica duplicada aquí a propósito: si cambia ingest/index.ts, actualizar estos casos.
 * Casos reales documentados en comentarios del ingest (bizum, 3DS, intereses…).
 */
import assert from "node:assert/strict";

function norm(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function clasificar(texto, titulo) {
  const t = norm(titulo + " " + texto);
  const IGNORAR = [
    "interes", "dividendo", "rendimiento", "rentabilidad",
    "saveback", "redondeo", "round up", "roundup", "round-up",
    "confirma", "confirmar", "autoriza", "autorizacion",
    "inicio de sesion", "codigo", "seguridad",
  ];
  if (IGNORAR.some((k) => t.includes(k))) return "ignorado";
  const esBizum = t.includes("bizum");
  const recibido = /(has recibido|recibido|recibiste|te ha enviado)/.test(t);
  const enviado = /(has enviado|enviaste|le has enviado)/.test(t);
  if (esBizum) {
    if (enviado) return "gasto_nocard";
    if (recibido) return "ingreso";
    return "ignorado";
  }
  if (recibido || t.includes("transferencia")) return "ignorado";
  return "gasto";
}

function t(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.error(`  ✗ ${name}`);
    throw e;
  }
}

console.log("ingest-classify");

t("compra tarjeta clásica → gasto", () => {
  assert.equal(clasificar("Has gastado 12,50 € en Mercadona", "Trade Republic"), "gasto");
});

t("bizum recibido → ingreso (bug 2026-07-05)", () => {
  assert.equal(clasificar("Has recibido 20 € de María por Bizum", ""), "ingreso");
});

t("bizum enviado → gasto_nocard", () => {
  assert.equal(clasificar("Has enviado 15 € a Pedro por Bizum", ""), "gasto_nocard");
});

t("intereses → ignorado", () => {
  assert.equal(clasificar("Has recibido 2,03 € de intereses", ""), "ignorado");
});

t("confirmación 3DS → ignorado (bug cobro doble 2026-07-10)", () => {
  assert.equal(clasificar("Confirma el pago de 50 € en DGT", ""), "ignorado");
});

t("transferencia recibida → ignorado (inject manual)", () => {
  assert.equal(clasificar("Has recibido una transferencia de 1500 €", ""), "ignorado");
});

console.log("\ningest-classify: OK");
