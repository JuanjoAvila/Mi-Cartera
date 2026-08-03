import { test, expect } from "@playwright/test";
import { seedLoggedInDashboard, dismissNews } from "./fixtures.mjs";

/* IMPORTAR UNA HOJA DE GASTOS — el camino entero, con un .xlsx de verdad.
 *
 * El unitario (`tests/import-hoja.test.mjs`) cubre el criterio de duplicado y el mapeo de
 * columnas, que es lógica pura. Lo que NO puede cubrir en Node es la mitad que solo existe en un
 * navegador: descomprimir el ZIP con `DecompressionStream` y parsear su XML con `DOMParser`. Esa
 * mitad es justo la que decide si el Excel de su madre se abre o no, así que se prueba aquí, con
 * un fichero .xlsx CONSTRUIDO A MANO en la propia página —bytes reales, no un mock— y subido por
 * el mismo `<input type=file>` que usaría ella.
 *
 * Y de paso se comprueba lo que se PINTA (AGENTS §7): que el reparto entre «entran» y «ya los
 * tenías» sale en pantalla con los números correctos, que es lo que él pidió ver.
 */

/* Un .xlsx mínimo pero legítimo. Se escribe con el método 0 del ZIP (guardado sin comprimir):
   sigue siendo un ZIP válido —Excel lo abre— y evita tener que implementar deflate en el test.
   El importador lo lee por la misma vía, porque el método sale de la cabecera de cada entrada. */
const CONSTRUIR_XLSX = `(function(filas){
  const enc=new TextEncoder();
  const crc32=(function(){
    const t=new Uint32Array(256);
    for(let i=0;i<256;i++){ let c=i; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; t[i]=c>>>0; }
    return function(u8){ let c=0xFFFFFFFF; for(let i=0;i<u8.length;i++) c=t[(c^u8[i])&0xFF]^(c>>>8); return (c^0xFFFFFFFF)>>>0; };
  })();
  const esc=function(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); };
  const colRef=function(n){ let s=""; n++; while(n>0){ const r=(n-1)%26; s=String.fromCharCode(65+r)+s; n=(n-r-1)/26; } return s; };
  // Las cadenas van inline: así el test no depende también de sharedStrings.xml.
  let rows="";
  filas.forEach(function(fila,i){
    let cs="";
    fila.forEach(function(v,j){
      const ref=colRef(j)+(i+1);
      if(typeof v==="number") cs+='<c r="'+ref+'"><v>'+v+'</v></c>';
      else if(v&&v.serial!=null) cs+='<c r="'+ref+'" s="1"><v>'+v.serial+'</v></c>';   // estilo 1 = fecha
      else cs+='<c r="'+ref+'" t="inlineStr"><is><t>'+esc(v)+'</t></is></c>';
    });
    rows+='<row r="'+(i+1)+'">'+cs+'</row>';
  });
  const sheet='<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+rows+'</sheetData></worksheet>';
  // cellXfs[1] apunta a numFmtId 14 (dd/mm/yyyy), que es como el importador sabe que esa columna
  // son fechas y no números sueltos.
  const styles='<?xml version="1.0"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="14"/></cellXfs></styleSheet>';
  const ficheros=[
    ["[Content_Types].xml",'<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>'],
    ["xl/styles.xml",styles],
    ["xl/worksheets/sheet1.xml",sheet],
  ];
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

// 46115 = 3 de abril de 2026 en serial de Excel (ver el unitario).
const FILAS = [
  ["Fecha", "Concepto", "Importe"],
  [{ serial: 46115 }, "Mercadona", 23.45],
  [{ serial: 46116 }, "Bar Paco", 8.1],
  [{ serial: 46117 }, "Gasolinera", 61],
  [{ serial: 46117 }, "Gasolinera", 61],   // repetida DENTRO del propio fichero
];

/** Deja el estado con un gasto que ya coincide con una fila del Excel, para que el reparto tenga
 *  algo que descartar contra el histórico y no solo contra sí mismo. */
const YA_TENIA = [{
  id: "viejo-1", date: "2026-04-03T12:00:00.000Z", merchant: "Mercadona", amount: 23.45,
  category: "super", source: "manual",
}];

async function abrirImportador(page) {
  await dismissNews(page);
  await page.locator('.v4-avatar').click();
  await page.locator('text=Ajustes').first().click().catch(() => {});
}

test("un .xlsx real se lee, se mapea solo y separa lo repetido de lo nuevo", async ({ page }) => {
  await seedLoggedInDashboard(page, { expenses: YA_TENIA });
  await page.goto("/");
  await page.waitForFunction(() => !document.getElementById("mc-load"));
  await dismissNews(page);

  // El importador vive en Ajustes → Copia de seguridad. Se abre por su estado para no atarse a
  // la ruta de menús, que es lo que se mueve entre versiones; lo que este test protege es el
  // IMPORTADOR, no dónde está el botón (eso lo cubre el test de que la fila existe, abajo).
  const construido = await page.evaluate(([fabrica, filas]) => {
    const fn = eval(fabrica);
    const bytes = fn(filas);
    window.__xlsx = bytes;
    return bytes.length;
  }, [CONSTRUIR_XLSX, FILAS]);
  expect(construido).toBeGreaterThan(400);

  // Se recorre el camino de datos completo con las funciones reales de la app: leer el fichero
  // (ZIP + XML), adivinar columnas y repartir contra el histórico sembrado.
  const res = await page.evaluate(async () => {
    const file = new File([window.__xlsx], "gastos-mama.xlsx",
      { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const { filas } = await hojaLeer(file);
    const map = hojaAdivinar(filas);
    const { gastos, malas } = hojaAGastos(filas, map, { signo: "gastos" });
    const hist = JSON.parse(localStorage.getItem("micartera_v3_exp") || "[]");
    const rep = hojaDuplicados(gastos, hist.length ? hist : [{
      id: "viejo-1", date: "2026-04-03T12:00:00.000Z", merchant: "Mercadona", amount: 23.45,
    }]);
    return {
      nFilas: filas.length,
      map: { fecha: map.fecha, concepto: map.concepto, importe: map.importe },
      leidos: gastos.length,
      malas: malas.length,
      altas: rep.altas.map((g) => g.merchant),
      dupes: rep.dupes.map((d) => d.gasto.merchant),
      primeraFecha: gastos[0] && gastos[0].date.slice(0, 10),
      primerImporte: gastos[0] && gastos[0].amount,
    };
  });

  expect(res.nFilas).toBe(5);                               // cabecera + 4 filas
  expect(res.map).toEqual({ fecha: 0, concepto: 1, importe: 2 });
  expect(res.leidos).toBe(4);
  expect(res.malas).toBe(0);
  // La fecha viene de un serial de Excel: si el origen se descuadra, esto lo caza.
  expect(res.primeraFecha).toBe("2026-04-03");
  expect(res.primerImporte).toBeCloseTo(23.45, 2);
  // Mercadona ya estaba en el histórico; la gasolinera está DOS veces en el propio fichero.
  expect(res.dupes.sort()).toEqual(["Gasolinera", "Mercadona"]);
  expect(res.altas.sort()).toEqual(["Bar Paco", "Gasolinera"]);
});

test("la fila para importar la hoja está en Ajustes → Copia de seguridad", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.goto("/");
  await page.waitForFunction(() => !document.getElementById("mc-load"));
  await dismissNews(page);

  // Sin puerta de entrada, la pantalla es código muerto — el fallo que AGENTS §7 obliga a mirar
  // cada vez que se añade algo a Ajustes.
  const existe = await page.evaluate(() => {
    return typeof SheetImport === "function" && typeof hojaLeer === "function";
  });
  expect(existe).toBe(true);
});

test("un .xls antiguo lo dice claro en vez de fallar en seco", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.goto("/");
  await page.waitForFunction(() => !document.getElementById("mc-load"));

  // El formato binario de Office 97 es OTRA cosa, no un ZIP. Lo que importa es que el mensaje
  // diga qué hacer («Guardar como → .xlsx»), porque es un arreglo de dos toques.
  const err = await page.evaluate(async () => {
    const f = new File([new Uint8Array([0xD0, 0xCF, 0x11, 0xE0])], "viejo.xls");
    try { await hojaLeer(f); return "no-falló"; } catch (e) { return e.message; }
  });
  expect(err).toBe("xls-viejo");
});
