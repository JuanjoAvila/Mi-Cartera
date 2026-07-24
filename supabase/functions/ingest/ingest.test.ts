import { assertEquals } from "jsr:@std/assert";
import { clasificar, extraerConcepto, extraerImporte, categorizar } from "../_shared/ingest_logic.ts";

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

// ---- CONCEPTO del movimiento (petición del padre, 2026-07-24) ----
// El mensaje del bizum viaja en la noti y se tiraba. Estos casos son las formas reales en que los
// bancos y TR lo mandan. Ojo con el último: si no hay concepto de verdad, mejor VACÍO que ruido.

Deno.test("extraerConcepto: etiqueta explícita «concepto:»", () => {
  assertEquals(extraerConcepto("Has recibido 40,00 € de María. Concepto: alquiler julio"), "alquiler julio");
  assertEquals(extraerConcepto("Bizum enviado. Motivo: cena del sábado"), "cena del sábado");
});

Deno.test("extraerConcepto: mensaje entrecomillado", () => {
  assertEquals(extraerConcepto('Has recibido 20 € de Pedro «gasolina del finde»'), "gasolina del finde");
  assertEquals(extraerConcepto('Bizum de Ana: "regalo de Luis"'), "regalo de Luis");
});

Deno.test("extraerConcepto: lo que va tras «por» al final", () => {
  assertEquals(extraerConcepto("Has recibido 15 € de Marta por la cena"), "la cena");
});

Deno.test("extraerConcepto: «por Bizum» NO es un concepto", () => {
  // Es el CÓMO, no el QUÉ: sacarlo en la lista sería ruido en todas las filas.
  assertEquals(extraerConcepto("Has recibido 20 € de María por Bizum"), "");
  assertEquals(extraerConcepto("Has enviado 15,00 € a Pedro por bizum"), "");
});

Deno.test("extraerConcepto: sin nada que decir, vacío (no inventar)", () => {
  assertEquals(extraerConcepto("Has gastado 12,50 € en Mercadona"), "");
  assertEquals(extraerConcepto(""), "");
});

Deno.test("extraerConcepto: recorta a 160", () => {
  assertEquals(extraerConcepto("Concepto: " + "x".repeat(400)).length, 160);
});
