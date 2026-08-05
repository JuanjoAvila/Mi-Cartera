// Lógica pura de ingest (tests + edge function). Mantener alineado con KW en public/index.html.

// Mantener alineado con KW en src/modules/00-core.js (cliente). Orden importa
// (pan/cine antes que bares; padel DESPUÉS de bares; viajes antes que ocio; mascotas/energía antes que hogar).
export const CATEGORIAS: Record<string, string[]> = {
  pan:        ["panaderia","pasteleria","pastisseria","fleca","forn de pa","forn ","obrador","croissant","boulangerie","bakery","granier","santagloria","santa gloria","panificadora","brioche","horno de pan","horno artesano","panaria","el forn","viena ","entpan","panetteria"],
  cine:       ["cinema","cine","cinesa","yelmo","kinepolis","odeon","mk2","renoir","multicines","entradas.com","atrapalo","ticketmaster","imax","cinemes","filmotech"],

  bares:      ["restaurante","bar ","cafe","cafeteria","mcdonald","burger","pizza","sushi","tapas","cerveceria","bodega","heladeria","bocadillo","kebab","pollo","grill","braseria","taberna","comida","food","lunch","dinner","brunch","desayuno","telepizza","glovo","just eat","uber eats","kfc","five guys","fiveguys","goiko","tgb","taco bell","tacobell","domino","papa john","subway","starbucks","vips","foster","montadito","rodilla","pans &","pans ","wok ","ramen","poke","taco","churreria","churros","asador","brasa","marisqueria","mariscos","pub ","shawarma","doner","döner","nandos","popeyes","dunkin","donut","tim hortons","cien montaditos","la sureña","sureña","muerde la pasta","ginos","la tagliatella","tagliatella","udon","wagamama","honest greens","croqueteria","tortilleria","gastrobar","vermuteria","coctel","cocktail","vending","expendedor","deliveroo","too good to go","toogoodtogo","mcdonalds","burger king","hamburgues","cervecer","cerveseria","fosters hollywood","100 montaditos","comida a domicilio"],
  padel:      ["padel","pádel","playtomic","paddle","club de padel","club padel","pista padel","padel pro","world padel","premier padel","indoor padel"],
  super:      ["mercadona","lidl","aldi","carrefour","dia ","bonpreu","bon preu","consum","eroski","spar","alcampo","simply","supermercado","market","fresco","verduleria","fruteria","hipercor","caprabo","condis","ahorramas","gadis","froiz","bm supermarket","family cash","supeco","costco","makro","amazon fresh","glovo market"],
  viajes:     ["booking","airbnb","hotel","hostal","hostel","apartament turistic","apartamento turistico","vueling","iberia","ryanair","easyjet","vuelos","vuelo ","aeropuerto","airport","expedia","trivago","kayak","edreams","rumbo","logitravel","civitatis","getyourguide","marriott","hilton","ibis ","nh hotel","melia","barcelo","ac hotel","travelodge","camping","ferry","balearia","crucero","cruise","turismo"],
  transporte: ["renfe","fgc","tmb","metro","autobus","bus ","taxi","cabify","uber","gasolina","repsol","cepsa","shell","bp ","galp","autopista","peaje","tram","bicing","blablacar","flixbus","moove","bolt","ouigo","iryo","avlo","rodalies","emt ","alsa","avanza","ok mobility","sixt","hertz","europcar","ballenoil","carburante","gasoleo","diesel","recarga electr","free now","freenow"],
  parking:    ["parking","parquimetro","parkimetro","parquímetro","aparcament","aparcamiento","saba","b:sm","bsm","empark","interparking","apk2","apk80","onepark","elparking","easypark","telpark","zona azul","zona verde","area verde","àrea verda","grua municipal","indigo parking"],
  energia:    ["endesa","iberdrola","naturgy","repsol luz","holaluz","octopus energy","octopus ","totalenergies","factor energia","lucera","pepeenergy","gas natural","canal de isabel","aigues de barcelona","aigües de barcelona","agbar","aqualia","sorea","factura luz","factura gas","factura agua","suministro electric"],
  tasas:      ["gencat","generalitat","atc ","agencia tributaria","aeat","ajuntament","ayuntamiento","diputacio","diputación","dgt","multa","multa transit","sancion","sanción","tribut","impost","impuesto","tax agency","taxes","ibi","ivtm","basura","residus","residuos","canon agua","canon de l'aigua","tasa","taxa","registro mercantil","registro civil","notaria","notaría","gestoria","gestoría","procurador","abogado","lexnet","catastro","seguretat social","seguridad social","tgss","recaudacion","recaudación","zona bajas emisiones","zbe","hacienda","hisenda"],
  educacion:  ["universidad","universitat","uab ","upc ","upf ","ub ","uoc ","uned","campus","matricula","matrícula","academia","curso ","cursos","formacion","formación","master ","máster","mba ","udemy","coursera","domestika","linkedin learning","skillshare","colegio","escola","guarderia","guardería","autoescuela","autoescola","british council","openenglish"],
  ocio:       ["spotify","netflix","hbo","disney","steam","playstation","xbox","nintendo","fnac","museo","teatro","concierto","decathlon","gym","gimnasio","sport","bolera","anthropic","claude","openai","chatgpt","google one","google play","icloud","apple.com","youtube premium","prime video","amazon prime","twitch","crunchyroll","dazn","filmin","movistar plus","audible","deezer","tidal","dropbox","notion","canva","duolingo","cursor","atraccion","atracción","parque tematico","zoologic","zoológico","aquarium","aquari","escape room","ocio","basic fit","synergym","crossfit","portaventura","tibidabo"],
  compras:    ["zara","mango","primark","stradivarius","bershka","pull &","el corte","amazon","amzn","aliexpress","pccomponentes","mediamarkt","worten","nike","adidas","foot locker","alehop","tiger","flying tiger","normal ","tedi","action","muy mucho","sostrene","kiabi","lefties","springfield","cortefiel","jd sports","sprinter","shein","temu","massimo","oysho","calzedonia","intimissimi","clas ohlson","veritas","douglas perfum","cofidis","papeleria","papelería","copisteria","libreria","druni","primor","sephora","perfumeria","uniqlo","h&m","bimba y lola"],
  salud:      ["farmacia","clinica","medico","dentista","hospital","optica","fisio","masaje","sanitas","adeslas","asisa","dkv","mutua","quiron","vitaldent","promofarma","dosfarma","laboratorio","analisis","urgencias"],
  pelu:       ["peluqueria","perruqueria","barberia","barber","estilis","hair","salon de belleza","nails","manicura","pedicura","lash","cejas","estetica","belleza","depilacion"],
  mascotas:   ["zooplus","kivet","tiendanimal","miscota","animalis","kiwoko","pienso","veterinario","veterinari","clinica veterinaria","peluqueria canina","royal canin","purina","mascota"],
  hogar:      ["ikea","leroy","bricomart","bauhaus","ferreteria","muebles","sofa","lampara","tintoreria","tintorería","lavanderia","lavandería","mrw","seur","correos","amazon locker","bricodepot","aki "],
  regalos:    ["regalo","flores","floristeria","joyeria","perfumeria","sephora","douglas","interflora"],
};

export function norm(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function categorizar(comercio: string): string {
  const c = norm(comercio);
  // Keywords cortas con límite de palabra (mismo criterio que el cliente: «bar» ≠ Barcelona).
  const hit = (hay: string, needle: string) => {
    if (needle.length >= 4) return hay.includes(needle);
    let i = 0;
    while ((i = hay.indexOf(needle, i)) !== -1) {
      const before = i === 0 || /[^a-z0-9]/.test(hay.charAt(i - 1));
      const after = i + needle.length >= hay.length || /[^a-z0-9]/.test(hay.charAt(i + needle.length));
      if (before && after) return true;
      i++;
    }
    return false;
  };
  for (const [cat, kws] of Object.entries(CATEGORIAS)) {
    for (const kw of kws) if (hit(c, kw)) return cat;
  }
  return "otros";
}

export type Tipo = "gasto" | "gasto_nocard" | "ingreso" | "ignorado";

export function clasificar(texto: string, titulo: string): Tipo {
  const t = norm(titulo + " " + texto);
  const IGNORAR = [
    "interes", "dividendo", "rendimiento", "rentabilidad",
    "saveback", "redondeo", "round up", "roundup", "round-up",
    "plan de inversion", "inversion programada", "aporte periodico", "savings plan", "saving plan",
    "has invertido", "hemos invertido", "se ha invertido", "invertido",
    "orden de compra", "orden de venta", "orden ejecutada", "ejecutado", "ejecutada", "limit", "stop",
    "deposito", "has anadido", "anadido dinero", "ingresado en tu cuenta", "recarga", "top up", "top-up",
    "alerta de precio", "precio objetivo", "cotizacion",
    "inicio de sesion", "codigo", "seguridad", "dispositivo",
    "confirma", "confirmar", "autoriza", "autorizacion", "aprueba", "aprobacion",
    "verifica el pago", "verificacion", "3d secure", "3ds", "pendiente de confirmacion",
  ];
  if (IGNORAR.some((k) => t.includes(k))) return "ignorado";
  const esBizum  = t.includes("bizum");
  const recibido = /(has recibido|recibido|recibiste|te ha enviado|te envio|te ha hecho|has rebut|t'ha enviat|received|sent you)/.test(t);
  const enviado  = /(has enviado|enviaste|le has enviado|has hecho un bizum|has fet un bizum|you sent|enviado a)/.test(t);
  if (esBizum) {
    if (enviado) return "gasto_nocard";
    if (recibido) return "ingreso";
    return "ignorado";
  }
  if (recibido || t.includes("transferencia")) return "ignorado";
  return "gasto";
}

export function extraerImporte(texto: string): number {
  const m1 = (texto || "").match(/(\d+(?:\.\d{3})*[.,]\d+)\s*€/);
  if (m1) return parseFloat(m1[1].replace(/\.(?=\d{3})/g, "").replace(",", "."));
  const m2 = (texto || "").match(/(\d+[.,]\d+)/);
  if (m2) return parseFloat(m2[1].replace(",", "."));
  return 0;
}

export function extraerComercio(texto: string, titulo: string): string {
  const m = (texto || "").match(/en\s+(.+)$/i);
  if (m) return m[1].trim();
  return (titulo || "Desconocido").trim();
}

export function extraerPersona(texto: string, prep: "de" | "a"): string {
  const re = new RegExp("\\b" + prep + "\\s+([^.\\d€]+?)\\s*(?:por\\s+bizum)?\\s*[.!]?$", "i");
  const m = (texto || "").match(re);
  return m ? m[1].trim() : "";
}

/**
 * CONCEPTO del movimiento a partir del texto de la notificación (petición 2026-07-24).
 *
 * En el histórico solo se veía «Bizum de María» y había que abrir la app del banco para saber de
 * qué era. El mensaje del bizum SÍ viaja en la noti — normalmente entre comillas o tras un
 * «concepto:» / «motivo:» — pero se descartaba junto con el resto del texto.
 *
 * Devuelve "" cuando no hay nada que valga la pena enseñar (mejor un hueco que ruido: regla de la
 * casa — si no lo sabes, no te lo inventes).
 */
export function extraerConcepto(texto: string, titulo = ""): string {
  const raw = String(texto || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";

  // 1) «concepto: X» / «motivo: X» / «mensaje: X» — lo más explícito, gana siempre.
  const etiqueta = raw.match(/\b(?:concepto|motivo|mensaje|asunto|descripci[oó]n)\s*:\s*(.+?)\s*$/i);
  if (etiqueta) return limpiarConcepto(etiqueta[1]);

  // 2) Entrecomillado: «cena del sábado», "alquiler julio", 'gasolina'.
  const comillas = raw.match(/[«"“']([^»"”']{2,120})[»"”']/);
  if (comillas) return limpiarConcepto(comillas[1]);

  // 3) Bizum sin marca explícita: lo que va detrás de «por» al final de la frase
  //    («Has recibido 20 € de María por la cena»). Ojo: «por Bizum» NO es un concepto.
  const porAlFinal = raw.match(/\bpor\s+(?!bizum\b)([^.!?]{3,120})[.!?]?\s*$/i);
  if (porAlFinal) return limpiarConcepto(porAlFinal[1]);

  return "";
}

function limpiarConcepto(s: string): string {
  const out = String(s || "")
    .replace(/\s+/g, " ")
    .replace(/^[\s:,;.\-–—]+|[\s:,;.\-–—]+$/g, "")
    .trim();
  // Coletillas que no aportan nada (son el «cómo», no el «qué»).
  if (/^(bizum|transferencia|tarjeta|movimiento)$/i.test(out)) return "";
  return out.slice(0, 160);
}
