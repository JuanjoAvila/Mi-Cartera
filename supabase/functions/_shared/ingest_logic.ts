// Lógica pura de ingest (tests + edge function). Mantener alineado con KW en public/index.html.

// Mantener alineado con KW en src/modules/00-core.js (cliente). Orden importa (pan antes que bares, pelu antes que salud).
export const CATEGORIAS: Record<string, string[]> = {
  pan:        ["panaderia","pasteleria","pastisseria","fleca","forn de pa","forn ","obrador","croissant","boulangerie","bakery","granier","santagloria","santa gloria","panificadora","brioche","horno de pan","horno artesano"],
  bares:      ["restaurante","bar","cafe","cafeteria","mcdonald","burger","pizza","sushi","tapas","cerveceria","bodega","heladeria","bocadillo","kebab","pollo","grill","braseria","taberna","comida","food","lunch","dinner","brunch","desayuno","telepizza","glovo","just eat","uber eats","kfc","five guys","fiveguys","goiko","tgb","taco bell","tacobell","domino","papa john","subway","starbucks","vips","foster","montadito","rodilla","pans","wok","ramen","poke","taco","churreria","churros","asador","brasa","marisqueria","mariscos","pub","shawarma","doner","nandos","popeyes","dunkin","donut","tim hortons","cien montaditos","la sureña","sureña","muerde la pasta","ginos","la tagliatella","tagliatella","udon","wagamama","honest greens","croqueteria","tortilleria","gastrobar","vermuteria","coctel","cocktail","gin","vending","expendedor"],
  super:      ["mercadona","lidl","aldi","carrefour","dia","bonpreu","bon preu","consum","eroski","spar","alcampo","simply","supermercado","market","fresco","verduleria","fruteria"],
  transporte: ["renfe","fgc","tmb","metro","autobus","bus","taxi","cabify","uber","gasolina","repsol","cepsa","shell","bp ","galp","autopista","peaje","tram","vueling","iberia","ryanair","easyjet","aeropuerto","bicing","blablacar","flixbus"],
  parking:    ["parking","parquimetro","parkimetro","parquímetro","aparcament","aparcamiento","saba","b:sm","bsm","empark","interparking","apk2","apk80","onepark","elparking","easypark","telpark","zona azul","zona verde","area verde","àrea verda","grua municipal"],
  ocio:       ["cinema","cine","cinesa","yelmo","spotify","netflix","hbo","disney","steam","playstation","xbox","nintendo","fnac","museo","teatro","concierto","ticketmaster","decathlon","padel","playtomic","gym","gimnasio","sport","bolera","anthropic","claude","openai","chatgpt","google one","icloud","apple.com","apple servic","youtube premium","youtube music","prime video","amazon prime","twitch","crunchyroll","dazn","filmin","movistar plus","rakuten","audible","deezer","tidal","dropbox","notion","canva","duolingo"],
  compras:    ["zara","mango","primark","stradivarius","bershka","pull","el corte","amazon","amzn","openbank","open bank","aliexpress","pccomponentes","mediamarkt","worten","nike","adidas","foot locker","alehop","ale hop","ale-hop","saona","tiger","flying tiger","normal ","tedi","action","casa ","muy mucho","sostrene","kiabi","lefties","springfield","cortefiel","jd sports","sprinter","shein","temu","massimo","oysho","cyrillus","calzedonia","intimissimi","clas ohlson","veritas","douglas perfum","cofidis"],
  hogar:      ["ikea","leroy","bricomart","bauhaus","ferreteria","muebles","sofa","lampara"],
  pelu:       ["peluqueria","perruqueria","barberia","barber","estilis","hair","salon de belleza","nails","manicura","pedicura","lash","cejas","estetica","belleza","depilacion"],
  salud:      ["farmacia","clinica","medico","dentista","hospital","optica","fisio","masaje"],
  regalos:    ["regalo","flores","floristeria","joyeria","perfumeria","sephora","douglas"],
};

export function norm(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function categorizar(comercio: string): string {
  const c = norm(comercio);
  for (const [cat, kws] of Object.entries(CATEGORIAS)) {
    for (const kw of kws) if (c.includes(kw)) return cat;
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
