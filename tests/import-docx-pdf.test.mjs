#!/usr/bin/env node
/**
 * IMPORTAR DESDE WORD (.docx) Y PDF — petición suya 2026-08-03: «que se pueda importar un pdf o
 * documento con gastos, recibos e ingresos que la gente escribe a mano en un Word».
 *
 * Un .docx es el MISMO ZIP+XML que un .xlsx (ver `tests/import-hoja.test.mjs`), así que la parte
 * que necesita `DOMParser` (sacar filas de `word/document.xml`) tiene la misma limitación que el
 * Excel: Node no trae `DOMParser`, así que esa mitad se prueba en `e2e/import-docx-pdf.spec.mjs`
 * con un navegador de verdad. Aquí se prueban las piezas que SÍ son lógica pura sin DOM:
 * `filaDeTexto` (repartir un párrafo/línea suelta en columnas) y `docxMejorTabla` (elegir la tabla
 * con más filas del documento).
 *
 * El PDF es distinto: no necesita `DOMParser` en ningún punto (no hay XML), solo `TextEncoder`/
 * `TextDecoder`/`Blob`/`Response`/`DecompressionStream`, que Node trae de serie desde hace tiempo
 * — así que aquí se prueba EL CAMINO ENTERO, con streams `FlateDecode` reales (comprimidos con el
 * `CompressionStream` nativo, no un mock), incluidos los dos casos de fallo honesto que pidió:
 * un PDF que es una foto escaneada (sin ningún operador de texto) y un PDF con texto pero sin
 * ninguna fila con fecha e importe reconocibles — ninguno de los dos debe inventar filas ni
 * fallar en silencio.
 */
import { loadPureLogicFromFile } from "../scripts/load-pure-logic.mjs";

const S = loadPureLogicFromFile();
let fallos = 0;
const ok = (cond, msg) => { console.log(`  ${cond ? "✓" : "✗"} ${msg}`); if (!cond) fallos++; };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}${JSON.stringify(a) === JSON.stringify(b) ? "" : `  (esperaba ${JSON.stringify(b)}, salió ${JSON.stringify(a)})`}`);

console.log("import-docx-pdf");

/* ---------- DOCX: piezas puras (sin DOMParser) ---------- */
{
  eq(S.filaDeTexto("03/04/2026\tMercadona\t23,45"), ["03/04/2026", "Mercadona", "23,45"],
    "un párrafo con tabuladores se reparte en columnas");
  eq(S.filaDeTexto("03/04/2026   Mercadona   23,45"), ["03/04/2026", "Mercadona", "23,45"],
    "…y también con dos o más espacios seguidos (sin tabulador)");
  eq(S.filaDeTexto("Una frase con espacios simples"), ["Una frase con espacios simples"],
    "una frase normal (un solo espacio entre palabras) NO se trocea: no es una fila de datos");

  // La primera tabla de un Word para currar suele ser una portada de una sola fila; la de gastos
  // de verdad es la más larga — `docxMejorTabla` recibe las tablas YA extraídas (sin DOM).
  const tablas = [[["Portada", ""]], [["Fecha", "Concepto", "Importe"], ["03/04/2026", "Mercadona", "23,45"], ["04/04/2026", "Bar Paco", "8,10"]], [["Pie", ""]]];
  eq(S.docxMejorTabla(tablas), tablas[1], "de varias tablas, se queda con la más larga (la de gastos, no la portada)");
  eq(S.docxMejorTabla([]), [], "sin tablas, no hay nada que elegir");
}

/* ---------- PDF: texto y líneas (lógica pura, sin descomprimir) ---------- */
{
  eq(S.pdfEscStr("Bar \\(El Rinc\\363n\\)"), "Bar (El Rincón)",
    "desescapa paréntesis y un octal de un string literal de PDF");
  eq(S.pdfHexStr("4D65726361646F6E61"), "Mercadona", "un string hexadecimal <...> se lee byte a byte");

  // Un generador simple que posiciona cada celda con `Td` (columna nueva = desplazamiento en X con
  // Y casi plano; línea nueva = desplazamiento real en Y). Es la forma más común de "tabla" en un
  // PDF creado desde Word/Excel/una plantilla.
  const csTabla = [
    "BT", "36 700 Td", "(Fecha) Tj", "100 0 Td", "(Concepto) Tj", "100 0 Td", "(Importe) Tj",
    "-200 -14 Td", "(03/04/2026) Tj", "100 0 Td", "(Mercadona) Tj", "100 0 Td", "(23,45) Tj",
    "T*", "-200 0 Td", "(04/04/2026) Tj", "100 0 Td", "(Bar Paco) Tj", "100 0 Td", "(8,10) Tj", "ET",
  ].join("\n");
  eq(S.pdfLineas(csTabla),
    [["Fecha", "Concepto", "Importe"], ["03/04/2026", "Mercadona", "23,45"], ["04/04/2026", "Bar Paco", "8,10"]],
    "reconstruye una tabla a partir de las posiciones Td/T* (columna nueva vs. línea nueva)");

  // Un generador más simple escribe la línea ENTERA de un tirón, alineando con espacios en vez de
  // con posiciones — se reparte con la misma heurística que un párrafo de Word (`filaDeTexto`).
  const csPlano = [
    "BT", "36 700 Td", "(03/04/2026    Mercadona    23,45) Tj",
    "T*", "(04/04/2026    Bar Paco    8,10) Tj", "ET",
  ].join("\n");
  eq(S.pdfLineas(csPlano),
    [["03/04/2026", "Mercadona", "23,45"], ["04/04/2026", "Bar Paco", "8,10"]],
    "una línea escrita de un tirón (con espacios) también se reparte en columnas");

  // Un TJ con kerning (números entre las cadenas) no debe partir la celda: son ajustes de tipografía,
  // no una columna nueva.
  eq(S.pdfLineas("BT\n[(Merca) -20 (dona)] TJ\nET"), [["Mercadona"]],
    "el kerning de un TJ no trocea la palabra en columnas distintas");
}

/* ---------- PDF: el camino entero, con streams FlateDecode reales ----------
   `CompressionStream`/`DecompressionStream` son APIs de navegador que Node también trae, así que
   aquí se construye un PDF sintético de verdad (bytes reales, comprimidos con deflate de verdad)
   sin necesitar un navegador — al revés que el .docx/.xlsx, el PDF no usa `DOMParser` en ningún
   punto de la lectura. */
async function pdfSintetico(contenido, comprimir) {
  const armar = (bytes) => {
    const pre = `%PDF-1.4\n1 0 obj\n<< /Length ${bytes.length} /Filter /FlateDecode >>\nstream\n`;
    const post = "\nendstream\nendobj\n%%EOF";
    const preB = new TextEncoder().encode(pre), postB = new TextEncoder().encode(post);
    const out = new Uint8Array(preB.length + bytes.length + postB.length);
    out.set(preB, 0); out.set(bytes, preB.length); out.set(postB, preB.length + bytes.length);
    return out.buffer;
  };
  if (!comprimir) return armar(new TextEncoder().encode(contenido));
  const cs = new CompressionStream("deflate");
  const w = cs.writable.getWriter();
  w.write(new TextEncoder().encode(contenido));
  w.close();
  const ab = await new Response(cs.readable).arrayBuffer();
  return armar(new Uint8Array(ab));
}
const archivo = (buf, nombre) => ({ name: nombre, arrayBuffer: () => Promise.resolve(buf) });

/* Dos filas reconocibles (fecha + concepto + importe), escritas de un tirón por línea — el caso
   típico de un PDF exportado desde Word/Excel/Google Docs, que NO es una foto escaneada. */
const CS_GASTOS = [
  "BT", "36 700 Td", "(03/04/2026    Mercadona    23,45) Tj",
  "T*", "(04/04/2026    Bar Paco    8,10) Tj", "ET",
].join("\n");

{
  const buf = await pdfSintetico(CS_GASTOS, true);
  const r = await S.pdfLeer(archivo(buf, "gastos.pdf"));
  eq(r.filas, [["03/04/2026", "Mercadona", "23,45"], ["04/04/2026", "Bar Paco", "8,10"]],
    "un PDF de texto simple (comprimido con FlateDecode de verdad) se lee razonablemente");
  eq(r.tipo, "pdf", "se marca con su tipo");
}
{
  // Algunos PDF simples no comprimen sus streams de contenido: el bloque «stream…endstream» trae
  // el texto tal cual. `pdfInflar` prueba a inflar y, si no era deflate, se queda con el texto.
  const buf = await pdfSintetico(CS_GASTOS, false);
  const r = await S.pdfLeer(archivo(buf, "gastos-sin-comprimir.pdf"));
  eq(r.filas.length, 2, "un content stream SIN comprimir también se lee (no todo PDF usa FlateDecode)");
}
{
  // Una «foto escaneada»: bytes sin ningún operador de texto (`Tj`/`TJ`). Nunca se debe inventar
  // una fila ni fallar en silencio: tiene que avisar con un mensaje claro y específico.
  const basura = String.fromCharCode(137, 80, 78, 71, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10).repeat(30);
  const buf = await pdfSintetico(basura, true);
  let err = null;
  try { await S.pdfLeer(archivo(buf, "escaneado.pdf")); } catch (e) { err = e.message; }
  eq(err, "pdf-imagen", "un PDF sin texto extraíble (escaneado) falla con un mensaje específico, no en silencio");
}
{
  // Hay texto de verdad, pero ninguna fila se parece a fecha+importe (prosa suelta). Tampoco aquí
  // se debe inventar una fila: mejor decir que ESTE PDF en concreto no se ha podido leer.
  const prosa = [
    "BT", "36 700 Td", "(Este documento es una carta normal, sin ninguna cifra de dinero) Tj",
    "T*", "(Solo texto seguido, nada que se parezca a una fecha ni a un importe) Tj", "ET",
  ].join("\n");
  const buf = await pdfSintetico(prosa, true);
  let err = null;
  try { await S.pdfLeer(archivo(buf, "carta.pdf")); } catch (e) { err = e.message; }
  eq(err, "pdf-sin-filas", "hay texto pero sin fecha+importe reconocibles: avisa en vez de dejar entrar filas basura");
}
{
  // El dispatcher general (el mismo que usa la pantalla de importar) tiene que enrutar un .pdf al
  // lector de PDF, y seguir rechazando los .xls/.doc viejos con el mismo aviso de siempre.
  const buf = await pdfSintetico(CS_GASTOS, true);
  const r = await S.hojaLeer(archivo(buf, "gastos.pdf"));
  eq(r.tipo, "pdf", "hojaLeer() enruta un .pdf al lector de PDF");

  let err = null;
  try { await S.hojaLeer(archivo(new ArrayBuffer(4), "viejo.doc")); } catch (e) { err = e.message; }
  eq(err, "xls-viejo", "un .doc antiguo (binario de Office 97) se rechaza igual que un .xls, mismo aviso");
}

console.log(fallos ? `\nimport-docx-pdf: ${fallos} FALLO(S)` : "\nimport-docx-pdf: OK");
process.exit(fallos ? 1 : 0);
