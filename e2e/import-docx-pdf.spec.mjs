import { test, expect } from "@playwright/test";
import { seedLoggedInDashboard, dismissNews } from "./fixtures.mjs";

/* IMPORTAR DESDE WORD (.docx) — la mitad que SÍ necesita navegador (petición 2026-08-03).
 *
 * Un .docx es el mismo ZIP+XML que un .xlsx (ver `e2e/import-hoja.spec.mjs`), así que aquí se
 * reutiliza el mismo constructor de ZIP a mano, cambiando solo qué XML va dentro:
 * `word/document.xml` con una tabla, en vez de una hoja de cálculo. Lo que NO puede probarse en
 * Node (`tests/import-docx-pdf.test.mjs`) es justo esto: descomprimir el ZIP y parsear el XML con
 * `DOMParser`, que no existe fuera de un navegador.
 *
 * El PDF NO necesita `DOMParser` en ningún punto (no hay XML de por medio) y ya tiene cobertura
 * completa —con streams FlateDecode reales— en el unitario de Node; aquí solo se añade un
 * apunte para confirmar que el `DecompressionStream`/`CompressionStream` de un navegador de
 * verdad se comporta igual que el de Node. */

/** Igual que `CONSTRUIR_XLSX` de `import-hoja.spec.mjs`, pero recibe la lista de ficheros del ZIP
 *  en vez de tenerla fija: así sirve tanto para un .xlsx como para un .docx. Se guarda sin
 *  comprimir (método 0) — sigue siendo un ZIP válido y evita implementar deflate en el test. */
const CONSTRUIR_ZIP = `(function(ficheros){
  const enc=new TextEncoder();
  const crc32=(function(){
    const t=new Uint32Array(256);
    for(let i=0;i<256;i++){ let c=i; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; t[i]=c>>>0; }
    return function(u8){ let c=0xFFFFFFFF; for(let i=0;i<u8.length;i++) c=t[(c^u8[i])&0xFF]^(c>>>8); return (c^0xFFFFFFFF)>>>0; };
  })();
  const locales=[], central=[]; let off=0;
  ficheros.forEach(function(f){
    const nom=enc.encode(f[0]), datos=enc.encode(f[1]), crc=crc32(datos);
    const lh=new DataView(new ArrayBuffer(30));
    lh.setUint32(0,0x04034b50,true); lh.setUint16(4,20,true); lh.setUint16(6,0,true); lh.setUint16(8,0,true);
    lh.setUint16(10,0,true); lh.setUint16(12,0,true); lh.setUint32(14,crc,true);
    lh.setUint32(18,datos.length,true); lh.setUint32(22,datos.length,true);
    lh.setUint16(26,nom.length,true); lh.setUint16(28,0,true);
    locales.push(new Uint8Array(lh.buffer),nom,datos);
    const ch=new DataView(new ArrayBuffer(46));
    ch.setUint32(0,0x02014b50,true); ch.setUint16(4,20,true); ch.setUint16(6,20,true);
    ch.setUint16(8,0,true); ch.setUint16(10,0,true); ch.setUint16(12,0,true); ch.setUint16(14,0,true);
    ch.setUint32(16,crc,true); ch.setUint32(20,datos.length,true); ch.setUint32(24,datos.length,true);
    ch.setUint16(28,nom.length,true); ch.setUint16(30,0,true); ch.setUint16(32,0,true);
    ch.setUint16(34,0,true); ch.setUint16(36,0,true); ch.setUint32(38,0,true); ch.setUint32(42,off,true);
    central.push(new Uint8Array(ch.buffer),nom);
    off+=30+nom.length+datos.length;
  });
  const cdIni=off;
  let cdLen=0; central.forEach(function(p){ cdLen+=p.length; });
  const eocd=new DataView(new ArrayBuffer(22));
  eocd.setUint32(0,0x06054b50,true); eocd.setUint16(8,ficheros.length,true); eocd.setUint16(10,ficheros.length,true);
  eocd.setUint32(12,cdLen,true); eocd.setUint32(16,cdIni,true);
  const partes=locales.concat(central,[new Uint8Array(eocd.buffer)]);
  let total=0; partes.forEach(function(p){ total+=p.length; });
  const out=new Uint8Array(total); let p=0;
  partes.forEach(function(x){ out.set(x,p); p+=x.length; });
  return out;
})`;

const CONTENT_TYPES = '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>';

/** Un `word/document.xml` mínimo con una tabla de 3 columnas (fecha · concepto · importe) y dos
 *  filas de datos, igual que apuntaría alguien a mano en Word. */
const DOCUMENT_CON_TABLA = `<?xml version="1.0"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
<w:p><w:r><w:t>Mis gastos de la compra</w:t></w:r></w:p>
<w:tbl>
<w:tr><w:tc><w:p><w:r><w:t>Fecha</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Concepto</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Importe</w:t></w:r></w:p></w:tc></w:tr>
<w:tr><w:tc><w:p><w:r><w:t>03/04/2026</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Mercadona</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>23,45</w:t></w:r></w:p></w:tc></w:tr>
<w:tr><w:tc><w:p><w:r><w:t>04/04/2026</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Bar Paco</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>8,10</w:t></w:r></w:p></w:tc></w:tr>
</w:tbl>
</w:body>
</w:document>`;

/** Un Word sin tabla: cada línea es un párrafo suelto con tabuladores, como quien escribe rápido
 *  sin dar formato de tabla. */
const DOCUMENT_SIN_TABLA = `<?xml version="1.0"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
<w:p><w:r><w:t>03/04/2026</w:t></w:r><w:r><w:tab/><w:t>Mercadona</w:t></w:r><w:r><w:tab/><w:t>23,45</w:t></w:r></w:p>
<w:p><w:r><w:t>04/04/2026</w:t></w:r><w:r><w:tab/><w:t>Bar Paco</w:t></w:r><w:r><w:tab/><w:t>8,10</w:t></w:r></w:p>
</w:body>
</w:document>`;

test("un .docx con una tabla de gastos se lee bien", async ({ page }) => {
  await seedLoggedInDashboard(page, {
    expenses: [{ id: "viejo-1", date: "2026-04-03T12:00:00.000Z", merchant: "Mercadona", amount: 23.45 }],
  });
  await page.goto("/");
  await page.waitForFunction(() => !document.getElementById("mc-load"));
  await dismissNews(page);

  const bytes = await page.evaluate(([fabrica, ficheros]) => {
    const fn = eval(fabrica);
    const b = fn(ficheros);
    window.__docx = b;
    return b.length;
  }, [CONSTRUIR_ZIP, [["[Content_Types].xml", CONTENT_TYPES], ["word/document.xml", DOCUMENT_CON_TABLA]]]);
  expect(bytes).toBeGreaterThan(200);

  const res = await page.evaluate(async () => {
    const file = new File([window.__docx], "gastos-mama.docx",
      { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const { filas, tipo } = await hojaLeer(file);
    const map = hojaAdivinar(filas);
    const { gastos, malas } = hojaAGastos(filas, map, { signo: "gastos" });
    const hist = JSON.parse(localStorage.getItem("micartera_v3_exp") || "[]");
    const rep = hojaDuplicados(gastos, hist.length ? hist : [{
      id: "viejo-1", date: "2026-04-03T12:00:00.000Z", merchant: "Mercadona", amount: 23.45,
    }]);
    return {
      tipo, nFilas: filas.length,
      map: { fecha: map.fecha, concepto: map.concepto, importe: map.importe },
      leidos: gastos.length, malas: malas.length,
      altas: rep.altas.map((g) => g.merchant), dupes: rep.dupes.map((d) => d.gasto.merchant),
    };
  });

  expect(res.tipo).toBe("docx");
  expect(res.nFilas).toBe(3);                              // cabecera + 2 filas
  expect(res.map).toEqual({ fecha: 0, concepto: 1, importe: 2 });
  expect(res.leidos).toBe(2);
  expect(res.malas).toBe(0);
  expect(res.dupes).toEqual(["Mercadona"]);                 // ya estaba en el histórico sembrado
  expect(res.altas).toEqual(["Bar Paco"]);
});

test("un .docx sin tabla (párrafos con tabuladores) también se reparte en columnas", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.goto("/");
  await page.waitForFunction(() => !document.getElementById("mc-load"));
  await dismissNews(page);

  await page.evaluate(([fabrica, ficheros]) => {
    const fn = eval(fabrica);
    window.__docx2 = fn(ficheros);
  }, [CONSTRUIR_ZIP, [["[Content_Types].xml", CONTENT_TYPES], ["word/document.xml", DOCUMENT_SIN_TABLA]]]);

  const res = await page.evaluate(async () => {
    const file = new File([window.__docx2], "apuntes.docx",
      { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const { filas } = await hojaLeer(file);
    const map = hojaAdivinar(filas);
    const { gastos, malas } = hojaAGastos(filas, map, { signo: "gastos" });
    return { nFilas: filas.length, primeraFila: filas[0], leidos: gastos.length, malas: malas.length };
  });

  expect(res.nFilas).toBe(2);
  expect(res.primeraFila).toEqual(["03/04/2026", "Mercadona", "23,45"]);
  expect(res.leidos).toBe(2);
  expect(res.malas).toBe(0);
});

test("un .doc antiguo (binario) lo dice claro, igual que un .xls", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.goto("/");
  await page.waitForFunction(() => !document.getElementById("mc-load"));

  const err = await page.evaluate(async () => {
    const f = new File([new Uint8Array([0xD0, 0xCF, 0x11, 0xE0])], "viejo.doc");
    try { await hojaLeer(f); return "no-falló"; } catch (e) { return e.message; }
  });
  expect(err).toBe("xls-viejo");
});

test("un PDF de texto simple, con FlateDecode real de navegador, se lee razonablemente", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.goto("/");
  await page.waitForFunction(() => !document.getElementById("mc-load"));
  await dismissNews(page);

  // Igual que en el unitario de Node, pero comprimido con el `CompressionStream` del navegador
  // de verdad — confirma que no hay una diferencia sutil entre motores en cómo se infla luego.
  const res = await page.evaluate(async () => {
    const contenido = [
      "BT", "36 700 Td", "(03/04/2026    Mercadona    23,45) Tj",
      "T*", "(04/04/2026    Bar Paco    8,10) Tj", "ET",
    ].join("\n");
    const cs = new CompressionStream("deflate");
    const w = cs.writable.getWriter();
    w.write(new TextEncoder().encode(contenido));
    w.close();
    const comprimido = new Uint8Array(await new Response(cs.readable).arrayBuffer());
    const pre = new TextEncoder().encode(
      "%PDF-1.4\n1 0 obj\n<< /Length " + comprimido.length + " /Filter /FlateDecode >>\nstream\n");
    const post = new TextEncoder().encode("\nendstream\nendobj\n%%EOF");
    const out = new Uint8Array(pre.length + comprimido.length + post.length);
    out.set(pre, 0); out.set(comprimido, pre.length); out.set(post, pre.length + comprimido.length);
    const file = new File([out], "gastos.pdf", { type: "application/pdf" });
    const { filas, tipo } = await hojaLeer(file);
    return { tipo, filas };
  });

  expect(res.tipo).toBe("pdf");
  expect(res.filas).toEqual([["03/04/2026", "Mercadona", "23,45"], ["04/04/2026", "Bar Paco", "8,10"]]);
});
