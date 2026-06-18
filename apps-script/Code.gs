// ============================================================
// MI CARTERA — Google Apps Script
// Variables MacroDroid: {notiText}, {notiTitle}, {Year}-{Month}-{Day}
// ------------------------------------------------------------
// ⚠️  SECRETOS: la API key de Finnhub NO va aquí en claro en el repo.
//     Se guarda en Script Properties (Project Settings > Script Properties).
//     Clave: FINNHUB_KEY  ·  Valor: tu key de finnhub.io
//     Este Code.gs SÍ se commitea; la key NO.
// ============================================================

const SHEET_ID   = "1Pl9thaULwg7jCSgCxp-MAxb-jtysMMQ7LyiLCfgfse8";
const SHEET_NAME = "Hoja 1";

const CATEGORIAS = {
  bares:      ["restaurante","bar","cafe","cafè","cafeteria","mcdonalds","burger","pizza","sushi",
                "tapas","cerveceria","bodega","heladeria","pasteleria","panaderia","bocadillo",
                "kebab","pollo","grill","braseria","taberna","comida","food","lunch",
                "dinner","brunch","desayuno"],
  super:      ["mercadona","lidl","aldi","carrefour","dia ","bon preu","consum","eroski",
                "spar","alcampo","simply","supermercado","market","fresco","verdura","fruteria"],
  transporte: ["renfe","fgc","tmb","metro","bus","taxi","cabify","uber","parking",
                "gasolina","repsol","cepsa","bp ","shell","autopista","peaje","tram",
                "vueling","iberia","ryanair","easyjet","aeropuerto"],
  ocio:       ["cinema","cines","cinesa","yelmo","spotify","netflix","hbo","disney",
                "steam","playstation","xbox","nintendo","fnac","game ","museo","teatro",
                "concierto","ticketmaster","decathlon","padel","playtomic","gym","gimnasio","sport"],
  compras:    ["zara","mango","hm ","h&m","primark","stradivarius","bershka","pull",
                "cortefiel","el corte","amazon","aliexpress","pccomponentes","mediamarkt",
                "leroy","ikea","worten","nike","adidas","foot locker"],
  hogar:      ["ikea","leroy merlin","bricomart","bauhaus","ferreteria","muebles","sofa","lampara"],
  salud:      ["farmacia","clinica","medico","dentista","hospital","optica","fisio",
                "masaje","peluqueria","barberia","estetica","belleza","depilacion"],
  regalos:    ["regalo","flores","floristeria","joyeria","perfumeria","sephora","douglas"],
};

function categorizar(comercio) {
  const c = (comercio||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  for (const [cat, kws] of Object.entries(CATEGORIAS)) {
    for (const kw of kws) { if (c.includes(kw)) return cat; }
  }
  return "otros";
}

function extraerImporte(texto) {
  const match = (texto||"").match(/(\d+[.,]\d+)\s*€/);
  if (match) return parseFloat(match[1].replace(",","."));
  const match2 = (texto||"").match(/(\d+[.,]\d+)/);
  if (match2) return parseFloat(match2[1].replace(",","."));
  return 0;
}

function extraerComercio(texto, titulo) {
  const match = (texto||"").match(/en\s+(.+)$/i);
  if (match) return match[1].trim();
  return (titulo||"Desconocido").trim();
}

function parsearFecha(triggertime) {
  try {
    const d = new Date(parseInt(triggertime) || Date.now());
    return Utilities.formatDate(d, "Europe/Madrid", "yyyy-MM-dd HH:mm");
  } catch(e) {
    return Utilities.formatDate(new Date(), "Europe/Madrid", "yyyy-MM-dd HH:mm");
  }
}

// Normaliza CUALQUIER fecha (Date o string) a "yyyy-MM-dd HH:mm"
function normalizarFecha(valor) {
  if (valor instanceof Date) {
    return Utilities.formatDate(valor, "Europe/Madrid", "yyyy-MM-dd HH:mm");
  }
  const s = String(valor || "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return Utilities.formatDate(d, "Europe/Madrid", "yyyy-MM-dd HH:mm");
  return s;
}

function doPost(e) {
  try {
    const raw = e.postData.contents;
    Logger.log("Raw body: " + raw);

    let data = {};
    try { data = JSON.parse(raw); } catch(err) {
      (raw||"").split("&").forEach(p => {
        const [k,v] = p.split("=");
        if(k) data[decodeURIComponent(k)] = decodeURIComponent((v||"").replace(/\+/g," "));
      });
    }

    const texto  = data.texto  || data.notiText  || "";
    const titulo = data.titulo || data.notiTitle || "";
    const triggertime = data.fecha || data.triggertime || "";

    const importe  = extraerImporte(texto);
    const comercio = extraerComercio(texto, titulo);
    const fecha    = parsearFecha(triggertime);
    const cat      = categorizar(comercio);

    const ss    = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    sheet.appendRow([fecha, importe, comercio, cat]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok:true, fecha, importe, comercio, cat }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    Logger.log("ERROR: " + err.message);
    return ContentService
      .createTextOutput(JSON.stringify({ ok:false, error:err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  if (e && e.parameter && e.parameter.prices) return doGetPrices();
  try {
    const params = e && e.parameter ? e.parameter : {};
    const mesKey = params.mes || Utilities.formatDate(new Date(), "Europe/Madrid", "yyyy-MM");
    const ss     = SpreadsheetApp.openById(SHEET_ID);
    const sheet  = ss.getSheetByName(SHEET_NAME);
    const rows   = sheet.getDataRange().getValues();
    const gastos = [];
    for (let i = 1; i < rows.length; i++) {
      const fechaNorm = normalizarFecha(rows[i][0]);
      const importe   = rows[i][1];
      const comercio  = rows[i][2];
      const cat       = rows[i][3];
      if (!fechaNorm) continue;
      if (fechaNorm.indexOf(mesKey) === 0) {
        gastos.push({
          fecha:    fechaNorm,
          importe:  Number(importe) || 0,
          comercio: comercio || "",
          cat:      cat || "otros",
        });
      }
    }
    const total  = gastos.reduce((s,g)=>s+g.importe,0);
    const porCat = {};
    for (const g of gastos) porCat[g.cat] = (porCat[g.cat]||0) + g.importe;
    return ContentService
      .createTextOutput(JSON.stringify({ ok:true, mes:mesKey, total, porCat, gastos }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok:false, error:err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Tickers a cotizar (acciones de Revolut)
const TICKERS = ["NVDA", "GOOG", "TSM", "AVGO", "MU", "AMD"];

function doGetPrices() {
  // 🔑 La key se lee de Script Properties, NO está hardcodeada en el repo.
  const FINNHUB_KEY = PropertiesService.getScriptProperties().getProperty("FINNHUB_KEY");
  if (!FINNHUB_KEY) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok:false, error:"FINNHUB_KEY no configurada en Script Properties" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  const prices = {};
  for (var i = 0; i < TICKERS.length; i++) {
    const sym = TICKERS[i];
    try {
      const url = "https://finnhub.io/api/v1/quote?symbol=" + sym + "&token=" + FINNHUB_KEY;
      const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      const data = JSON.parse(res.getContentText());
      if (data && typeof data.c === "number" && data.c > 0) prices[sym] = data.c;  // c = precio actual
    } catch (err) {
      // si una falla, seguimos con las demás
    }
    Utilities.sleep(120);
  }
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, prices: prices, ts: Date.now() }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------- TESTS (ejecutar desde el editor de Apps Script) ----------
function testManual() {
  const fakePost = {
    postData: { contents: JSON.stringify({
      texto:  "Gastaste 9,19 € en Consum",
      titulo: "Consum",
      fecha:  String(Date.now())
    })}
  };
  Logger.log(doPost(fakePost).getContent());
}

function testGet() {
  Logger.log(doGet({ parameter: { mes: "2026-06" } }).getContent());
}

function testPrices() {
  Logger.log(doGetPrices().getContent());
}
