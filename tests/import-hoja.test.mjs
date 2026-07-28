#!/usr/bin/env node
/**
 * IMPORTADOR DE HOJAS DE GASTOS — la lógica que decide qué entra y qué se descarta.
 *
 * Se prueba aquí todo lo que NO necesita navegador: leer un CSV, adivinar qué columna es cada
 * cosa, entender las fechas de casa, y sobre todo el criterio de DUPLICADO. Lo que sí necesita
 * navegador (descomprimir el .xlsx y parsear su XML con `DOMParser`) va en
 * `e2e/import-hoja.spec.mjs`, con un Excel de verdad generado en la propia página.
 *
 * Por qué importa tanto lo del duplicado: el importador escribe en el HISTÓRICO DE GASTOS de una
 * persona real. Pasarse de fino duplica la compra del súper; pasarse de grueso se come dos cafés
 * distintos del mismo día. El criterio (día + importe al céntimo + comercio normalizado) está
 * fijado con estos casos, no de memoria.
 */
import { loadPureLogicFromFile } from "../scripts/load-pure-logic.mjs";

const S = loadPureLogicFromFile();
let fallos = 0;
const ok = (cond, msg) => { console.log(`  ${cond ? "✓" : "✗"} ${msg}`); if (!cond) fallos++; };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}${JSON.stringify(a) === JSON.stringify(b) ? "" : `  (esperaba ${JSON.stringify(b)}, salió ${JSON.stringify(a)})`}`);

console.log("import-hoja");

/* ---------- CSV: separador y comillas ---------- */
{
  // Un Excel español exporta con `;`; uno inglés con `,`. Acertar solo con uno es medio importador.
  const es = S.csvTabla('Fecha;Concepto;Importe\n03/04/2026;Mercadona;23,45\n');
  eq(es[1], ["03/04/2026", "Mercadona", "23,45"], "CSV con punto y coma (Excel español)");

  const en = S.csvTabla('Date,Description,Amount\n2026-04-03,Mercadona,23.45\n');
  eq(en[1], ["2026-04-03", "Mercadona", "23.45"], "CSV con coma (Excel inglés)");

  // Una coma dentro de comillas NO parte la celda, y "" es una comilla escapada.
  const q = S.csvTabla('a,b\n"Bar ""El Rincón"", centro",12.00\n');
  eq(q[1], ['Bar "El Rincón", centro', "12.00"], "comillas y comas dentro de una celda");

  // Las filas en blanco de una hoja de casa no son gastos vacíos: se tiran.
  const hueco = S.csvTabla("a;b\n\n1;2\n;\n");
  eq(hueco.length, 2, "las filas vacías no cuentan");
}

/* ---------- ¿Hay cabecera? ---------- */
{
  ok(S.hojaTieneCabecera([["Fecha", "Concepto", "Importe"], ["03/04/2026", "Bar", "3,20"]]),
    "detecta la fila de cabecera");
  ok(!S.hojaTieneCabecera([["03/04/2026", "Bar", "3,20"], ["04/04/2026", "Súper", "21,10"]]),
    "sin cabecera, la primera fila NO se pierde");
}

/* ---------- Adivinar columnas ---------- */
{
  const conCab = S.csvTabla([
    "Fecha;Descripción;Importe;Categoría",
    "03/04/2026;Mercadona;23,45;super",
    "04/04/2026;Bar Paco;8,10;bares",
  ].join("\n"));
  const m1 = S.hojaAdivinar(conCab);
  eq([m1.fecha, m1.concepto, m1.importe, m1.categoria], [0, 1, 2, 3], "mapea por el nombre de la cabecera");

  // En inglés, que es como media España tiene puestas las cabeceras de su Excel.
  const en = S.csvTabla("Date,Description,Amount\n2026-04-03,Mercadona,23.45\n2026-04-04,Bar,8.10");
  const m2 = S.hojaAdivinar(en);
  eq([m2.fecha, m2.concepto, m2.importe], [0, 1, 2], "mapea cabeceras en inglés");

  // SIN cabeceras: hay que deducirlo del contenido, y en otro orden para que no cuele por suerte.
  const sinCab = S.csvTabla([
    "Mercadona;23,45;03/04/2026",
    "Bar Paco;8,10;04/04/2026",
    "Gasolinera Repsol;61,00;05/04/2026",
  ].join("\n"));
  const m3 = S.hojaAdivinar(sinCab);
  eq([m3.fecha, m3.concepto, m3.importe], [2, 0, 1], "sin cabeceras, adivina por el contenido");
}

/* ---------- Fechas ---------- */
{
  const d = S.hojaFecha("03/04/2026");
  eq([d.getDate(), d.getMonth() + 1, d.getFullYear()], [3, 4, 2026],
    "3/4 es el 3 de ABRIL (formato de aquí, no el americano)");

  const iso = S.hojaFecha("2026-04-03");
  eq([iso.getDate(), iso.getMonth() + 1], [3, 4], "ISO se lee como año-mes-día");

  const corto = S.hojaFecha("3-4-26");
  eq([corto.getDate(), corto.getMonth() + 1, corto.getFullYear()], [3, 4, 2026], "año de dos cifras");

  ok(S.hojaFecha("") === null && S.hojaFecha("no soy una fecha") === null, "lo que no es fecha devuelve null");

  // Serial de Excel: 45385 = 3 de abril de 2026. Si esto se descuadra, TODAS las fechas de un
  // .xlsx salen corridas un par de días y nadie lo nota hasta ver el histórico raro.
  const x = S.xlsxFecha(46115);
  eq([x.getUTCDate(), x.getUTCMonth() + 1, x.getUTCFullYear()], [3, 4, 2026], "serial de Excel → fecha real");
}

/* ---------- Columnas de Excel ---------- */
eq([S.xlsxCol("A1"), S.xlsxCol("B7"), S.xlsxCol("Z1"), S.xlsxCol("AA1"), S.xlsxCol("BC12")],
  [0, 1, 25, 26, 54], "referencia de celda → índice de columna");

/* ---------- De la tabla a gastos ---------- */
{
  const filas = S.csvTabla([
    "Fecha;Concepto;Importe",
    "03/04/2026;Mercadona;23,45",
    "04/04/2026;Nómina;-1500,00",
    "05/04/2026;;12,00",          // sin concepto: entra igual, con nombre por defecto
    "sin fecha;Bar;3,00",         // se cae: no hay fecha
    "06/04/2026;Bar;no es número", // se cae: no hay importe
  ].join("\n"));
  const map = S.hojaAdivinar(filas);

  // Modo «todo son gastos»: es la hoja de casa típica, donde nadie pone signos.
  const g1 = S.hojaAGastos(filas, map, { signo: "gastos" });
  eq(g1.gastos.length, 3, "entran las 3 filas con fecha e importe");
  eq(g1.malas.length, 2, "las 2 filas incompletas se quedan fuera y se cuentan");
  ok(g1.gastos.every((g) => g.amount > 0), "en modo «todo gastos» la nómina también entra como gasto");
  eq(g1.gastos[0].category, "super", "Mercadona se categoriza sola");

  // Modo mezclado: el menos de la hoja significa ingreso.
  const g2 = S.hojaAGastos(filas, map, { signo: "auto" });
  const nomina = g2.gastos.filter((g) => g.merchant === "Nómina")[0];
  ok(nomina && nomina.amount === -1500 && nomina.category === "ingreso",
    "en modo mezclado, el importe negativo es un ingreso");

  ok(g1.gastos.every((g) => g.source === "hoja"), "todo lo importado queda marcado con su origen");
}

/* ---------- Duplicados: lo que decide qué se descarta ---------- */
{
  const hist = [
    { id: "v1", date: "2026-04-03T12:00:00.000Z", merchant: "Mercadona", amount: 23.45 },
    { id: "v2", date: "2026-04-03T12:00:00.000Z", merchant: "Bar Paco", amount: 1.2 },
  ];
  const nuevos = [
    { id: "n1", date: "2026-04-03T09:30:00.000Z", merchant: "MERCADONA", amount: 23.45 },  // repe (hora distinta, mayúsculas)
    { id: "n2", date: "2026-04-03T12:00:00.000Z", merchant: "Bar Paco", amount: 1.2 },     // repe exacto
    { id: "n3", date: "2026-04-03T12:00:00.000Z", merchant: "Bar Pepe", amount: 1.2 },     // OTRO bar, mismo día e importe
    { id: "n4", date: "2026-04-04T12:00:00.000Z", merchant: "Mercadona", amount: 23.45 },  // otro día
    { id: "n5", date: "2026-04-03T12:00:00.000Z", merchant: "Mercadona", amount: 23.46 },  // un céntimo distinto
  ];
  const r = S.hojaDuplicados(nuevos, hist);
  eq(r.dupes.map((d) => d.gasto.id), ["n1", "n2"], "descarta solo los que ya estaban");
  eq(r.altas.map((g) => g.id), ["n3", "n4", "n5"], "no se come dos gastos distintos del mismo día");

  // Una hoja de casa REPITE filas: se copian y se pegan meses enteros. El duplicado también se
  // mira contra el propio fichero, no solo contra el histórico.
  const repes = [
    { id: "a", date: "2026-05-01T12:00:00.000Z", merchant: "Luz", amount: 61 },
    { id: "b", date: "2026-05-01T12:00:00.000Z", merchant: "Luz", amount: 61 },
  ];
  const r2 = S.hojaDuplicados(repes, []);
  eq([r2.altas.length, r2.dupes.length], [1, 1], "las filas repetidas DENTRO del fichero también se descartan");

  // Tildes y espacios de más: la misma tienda escrita de dos maneras es la misma tienda.
  const r3 = S.hojaDuplicados(
    [{ id: "x", date: "2026-05-01T12:00:00.000Z", merchant: "Farmàcia  Sant Joan", amount: 9.9 }],
    [{ id: "y", date: "2026-05-01T20:00:00.000Z", merchant: "farmacia sant joan", amount: 9.9 }]);
  eq(r3.dupes.length, 1, "el comercio se compara sin tildes, mayúsculas ni espacios de más");
}

console.log(fallos ? `\nimport-hoja: ${fallos} FALLO(S)` : "\nimport-hoja: OK");
process.exit(fallos ? 1 : 0);
