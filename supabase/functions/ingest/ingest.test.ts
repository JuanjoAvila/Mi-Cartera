import { assertEquals } from "jsr:@std/assert";
import { clasificar, extraerImporte, categorizar } from "../_shared/ingest_logic.ts";

Deno.test("clasificar: bizum enviado vs recibido", () => {
  assertEquals(clasificar("Has enviado 12,50 € a María por bizum", ""), "gasto_nocard");
  assertEquals(clasificar("Has recibido 12,50 € de María por bizum", ""), "ingreso");
});

Deno.test("clasificar: 3DS ignorado (anti cobro doble)", () => {
  assertEquals(clasificar("Confirma el pago de 50,00 € en DGT Multas", "Autoriza el pago"), "ignorado");
});

Deno.test("extraerImporte: formato español con miles", () => {
  assertEquals(extraerImporte("Has pagado 1.234,56 € en Mercadona"), 1234.56);
});

Deno.test("categorizar: panadería → pan", () => {
  assertEquals(categorizar("PANADERIA LA ESQUINA"), "pan");
});

Deno.test("categorizar: parking → parking (no transporte)", () => {
  assertEquals(categorizar("PARKING SABA"), "parking");
});
