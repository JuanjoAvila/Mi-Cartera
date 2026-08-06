import { assertEquals } from "jsr:@std/assert";
import {
  categorizar, clasificar, extraerComercio, extraerConcepto, extraerImporte, limpiarTexto,
} from "../_shared/ingest_logic.ts";

// ---- El bar del padre y el gasto de Splau (2026-08-06) ----
// Dos formas de perder un gasto SIN DEJAR RASTRO, que es lo que las hacía indiagnosticables:
// un `ignorado` no se guarda ni avisa, y un INSERT rechazado solo deja un error en el panel.

Deno.test("el nombre del comercio NO se mira buscando ruido", () => {
  // «BAR STOP» picaba en "stop" y «BAR EL DEPÓSITO» en "deposito": el gasto se tiraba entero.
  assertEquals(clasificar("Has gastado 9,90 € en BAR STOP", "Trade Republic"), "gasto");
  assertEquals(clasificar("Has gastado 9,90 € en BAR EL DEPOSITO", "Trade Republic"), "gasto");
  assertEquals(clasificar("Has gastado 9,90 € en RESTAURANT EL LIMITE", ""), "gasto");
});

Deno.test("…y el ruido de TR se sigue tirando igual", () => {
  assertEquals(clasificar("Se ha invertido tu redondeo de 0,42 € en iShares Core", ""), "ignorado");
  assertEquals(clasificar("Tu plan de inversión ha ejecutado 50 € en Vanguard", ""), "ignorado");
  assertEquals(clasificar("Nuevo inicio de sesión en tu cuenta", ""), "ignorado");
});

Deno.test("comercio sucio del datáfono: se limpia, no tumba el INSERT", () => {
  const ctrl = String.fromCharCode(0x85);   // el invisible que salió en la compra de Splau
  const nul = String.fromCharCode(0);       // este además hace que Postgres RECHACE la fila
  assertEquals(
    extraerComercio("Has gastado 76,08 € en 10638 CORNELLA" + ctrl + " SPLAU SC", ""),
    "10638 CORNELLA SPLAU SC",
  );
  assertEquals(limpiarTexto("CORNELLA" + nul + " SPLAU").includes(nul), false);
});

Deno.test("extraerComercio: «en» de otra palabra no parte el nombre", () => {
  // Sin el \b, «Orden ejecutada en Apple» daba comercio = «ejecutada en Apple».
  assertEquals(extraerComercio("Orden ejecutada en Apple", ""), "Apple");
});

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
