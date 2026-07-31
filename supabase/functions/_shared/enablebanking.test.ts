import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mapTransaction } from "./enablebanking.ts";

/* Convención del cliente: amount POSITIVO = gasto, NEGATIVO = ingreso.
   Fija por escrito en tests/ob-ingresos.test.mjs — aquí se fija el otro extremo: cómo se
   construye ese signo a partir de lo que manda el ASPSP (2026-07-31, incidente TR real). */

Deno.test("mapTransaction: ASPSP conforme (magnitud sin signo) — cargo queda positivo", () => {
  const tx = mapTransaction({
    transaction_amount: { amount: "45.30" },
    credit_debit_indicator: "DBIT",
    booking_date: "2026-07-30",
  });
  assertEquals(tx.amount, 45.3);
});

Deno.test("mapTransaction: ASPSP conforme — abono queda negativo", () => {
  const tx = mapTransaction({
    transaction_amount: { amount: "1250" },
    credit_debit_indicator: "CRDT",
    booking_date: "2026-07-30",
  });
  assertEquals(tx.amount, -1250);
});

Deno.test("mapTransaction: ASPSP que manda el importe YA firmado — el cargo NO se dobla a ingreso", () => {
  // El fallo real: un ASPSP nuevo (conectado 2026-07-31) mandaba el importe con signo propio
  // (negativo en un cargo) en vez de la magnitud sin signo que pide la spec. Sin abs(), aplicar
  // el signo del indicador sobre un amt ya negativo doblaba el signo: el gasto salía negativo y,
  // por convención, se contaba como ingreso. Todos los gastos del mes se apuntaron como ingresos.
  const tx = mapTransaction({
    transaction_amount: { amount: "-45.30" },
    credit_debit_indicator: "DBIT",
    booking_date: "2026-07-31",
  });
  assertEquals(tx.amount, 45.3, "un cargo tiene que quedar positivo pase lo que pase con el signo de origen");
});

Deno.test("mapTransaction: ASPSP no conforme — abono con importe ya firmado sigue negativo", () => {
  const tx = mapTransaction({
    transaction_amount: { amount: "-900" },
    credit_debit_indicator: "CRDT",
    booking_date: "2026-07-31",
  });
  assertEquals(tx.amount, -900);
});
