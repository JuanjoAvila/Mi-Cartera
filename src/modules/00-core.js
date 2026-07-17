/* ============================================================
   MI CARTERA v3 — fuente JSX (se compila con runtime clásico)
   ============================================================ */
const { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue } = React;

/* ---------- CONFIG ---------- */
const CONFIG = {
  PAGE_SIZE: 12,
  TR_INJECTION: 1500,          // €/mes que entran al efectivo de TR con la nómina (1000 caprichos + 500 colchón). Los 50 del FTSE van aparte (manual).
  // --- Supabase (Fase 1). La anon key es pública por diseño (va protegida con RLS). ---
  SUPABASE_URL: "https://sfyfjagbnhbplrljpbvh.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeWZqYWdibmhicGxybGpwYnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NzYyODAsImV4cCI6MjA5NzM1MjI4MH0.umMHOZanC4aRSBqiNAjsegyXxcZ-Q-g2oTQtS1JXzZk",
  APP_VERSION: "dev",          // lo sella el CI en cada deploy (scripts/stamp-version.mjs)
  SENTRY_DSN: "",              // opcional: inyectar SENTRY_DSN en CI (scripts/build-app.mjs)
};

/* ---------- Rendimiento: trabajo no urgente tras el primer pintado ---------- */
function mcScheduleIdle(fn, timeoutMs){
  timeoutMs=timeoutMs||2500;
  try{
    if(typeof requestIdleCallback==="function"){ requestIdleCallback(fn,{timeout:timeoutMs}); return; }
  }catch(e){}
  setTimeout(fn, 16);
}

var _mcSentryReady=false;
var _mcSentryQueue=[];
function mcInitSentry(){
  if(!CONFIG.SENTRY_DSN || typeof Sentry==="undefined") return;
  try{
    Sentry.init({
      dsn: CONFIG.SENTRY_DSN,
      release: "mi-cartera@"+CONFIG.APP_VERSION,
      environment: (typeof _mcNative!=="undefined"&&_mcNative) ? "android" : "web",
      tracesSampleRate: 0.05,
      // No mandar cuerpos/URL con posibles cifras de la cartera (privacidad).
      beforeSend: function(ev){
        try{
          if(ev&&ev.request){ delete ev.request.data; delete ev.request.cookies; if(ev.request.headers){ delete ev.request.headers.Authorization; delete ev.request.headers.authorization; } }
          if(ev&&ev.extra){ ["state","expenses","accounts","investments","budget"].forEach(function(k){ delete ev.extra[k]; }); }
        }catch(e){}
        return ev;
      }
    });
    _mcSentryReady=true;
    while(_mcSentryQueue.length){
      var q=_mcSentryQueue.shift();
      try{ Sentry.captureException(q.err, q.ctx?{extra:q.ctx}:undefined); }catch(e){}
    }
  }catch(e){}
}
// Sentry (~340 KB) NO se parsea en el cold start: se inyecta tras el primer pintado (feedback 2026-07-16).
function mcLoadSentryDeferred(){
  if(!CONFIG.SENTRY_DSN) return;
  if(typeof Sentry!=="undefined"){ mcInitSentry(); return; }
  if(document.querySelector('script[data-mc-sentry]')) return;
  var s=document.createElement("script");
  s.src="vendor/sentry.bundle.min.js";
  s.async=true;
  s.setAttribute("data-mc-sentry","1");
  s.onload=function(){ mcInitSentry(); };
  s.onerror=function(){};
  (document.head||document.documentElement).appendChild(s);
}

function mcCaptureError(err, ctx){
  try{
    if(!CONFIG.SENTRY_DSN) return;
    if(typeof Sentry!=="undefined"&&_mcSentryReady){ Sentry.captureException(err, ctx?{extra:ctx}:undefined); return; }
    // Cola corta: un error justo al abrir no se pierde si Sentry aún está bajando.
    if(_mcSentryQueue.length<8) _mcSentryQueue.push({err:err,ctx:ctx});
  }catch(e){}
}

/* ---------- Categorías de gasto variable ---------- */
const CATEGORIES = [
  { id:"super",      name:"Supermercado",        color:"#5FD08A", icon:"🛒" },
  { id:"pan",        name:"Panadería",           color:"#E0B080", icon:"🥖" },
  { id:"bares",      name:"Bares y restaurantes", color:"#E6C36A", icon:"🍽️" },
  { id:"cine",       name:"Cine",                color:"#E8A0C8", icon:"🍿" },
  { id:"ocio",       name:"Ocio",                color:"#9BD0E0", icon:"🎬" },
  { id:"transporte", name:"Transporte",          color:"#7FB5E8", icon:"🚇" },
  { id:"parking",    name:"Parking",             color:"#8AA0B8", icon:"🅿️" },
  { id:"tasas",      name:"Impuestos y multas",  color:"#C97D5F", icon:"🏛️" },
  { id:"compras",    name:"Compras",             color:"#C9A0E0", icon:"🛍️" },
  { id:"salud",      name:"Salud",               color:"#6FD6C9", icon:"💊" },
  { id:"pelu",       name:"Peluquería",          color:"#D8A3C8", icon:"💇" },
  { id:"hogar",      name:"Hogar",               color:"#B7C98A", icon:"🏠" },
  { id:"regalos",    name:"Regalos",             color:"#E89CB0", icon:"🎁" },
  { id:"otros",      name:"Otros",               color:"#8FA89A", icon:"📦" },
];
const CAT = Object.fromEntries(CATEGORIES.map(c=>[c.id,c]));
const INGRESO_CAT = { id:"ingreso", name:"Ingreso", color:"#5FD08A", icon:"💰" };
const catOf = (id)=> id==="ingreso" ? INGRESO_CAT : (CAT[id] || CAT.otros);
const catName = (id)=> t("cat_"+(catOf(id).id));   // nombre traducido de la categoría
const freqLabel = (f)=> t("freq_"+f);              // frecuencia traducida

/* Autodetección de categoría por comercio (mismas keywords que el GAS, ampliadas) */
/* Overrides personales: comercios concretos que mapeas a tu manera (substring en minúsculas) */
// (vacío desde v3.73: los overrides personales viven en state.catOverrides de cada usuario;
//  el "mapfre→bares" del creador se siembra solo en su cartera demo en seedFlows)
const MERCHANT_OVERRIDES = {};
// Overrides PERSONALES del usuario (comercio→categoría), que aprende al recategorizar a mano.
// Se puebla desde state.catOverrides al cargar. Tiene prioridad sobre las keywords.
let USER_OVERRIDES = {};
function catKey(merchant){ return (merchant||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").trim(); }
const KW = {
  // "pan" y "cine" ANTES que "bares": panadería/pastelería y Kinepolis no deben caer en bares.
  pan:["panaderia","pasteleria","pastisseria","fleca","forn de pa","forn ","obrador","croissant","boulangerie","bakery","granier","santagloria","santa gloria","panificadora","brioche","horno de pan","horno artesano"],
  cine:["cinema","cine","cinesa","yelmo","kinepolis","odeon","mk2","renoir","multicines","entradas.com","atrapalo","ticketmaster","imax"],
  bares:["restaurante","bar","cafe","cafeteria","mcdonald","burger","pizza","sushi","tapas","cerveceria","bodega","heladeria","bocadillo","kebab","pollo","grill","braseria","taberna","comida","food","lunch","dinner","brunch","desayuno","telepizza","glovo","just eat","uber eats","kfc","five guys","fiveguys","goiko","tgb","taco bell","tacobell","domino","papa john","subway","starbucks","vips","foster","montadito","rodilla","pans","wok","ramen","poke","taco","churreria","churros","asador","brasa","marisqueria","mariscos","pub","shawarma","doner","döner","nandos","popeyes","dunkin","donut","tim hortons","cien montaditos","la sureña","sureña","muerde la pasta","ginos","la tagliatella","tagliatella","udon","wagamama","honest greens","croqueteria","tortilleria","gastrobar","vermuteria","coctel","cocktail","gin","vending","expendedor"],
  super:["mercadona","lidl","aldi","carrefour","dia","bonpreu","bon preu","consum","eroski","spar","alcampo","simply","supermercado","market","fresco","verduleria","fruteria"],
  transporte:["renfe","fgc","tmb","metro","autobus","bus","taxi","cabify","uber","gasolina","repsol","cepsa","shell","bp ","galp","autopista","peaje","tram","vueling","iberia","ryanair","easyjet","aeropuerto","bicing","blablacar","flixbus","moove","bolt","ouigo","iryo","avlo","rodalies","emt ","alsa","avanza","ok mobility","sixt","hertz","europcar"],
  parking:["parking","parquimetro","parkimetro","parquímetro","aparcament","aparcamiento","saba","b:sm","bsm","empark","interparking","apk2","apk80","onepark","elparking","easypark","telpark","zona azul","zona verde","area verde","àrea verda","grua municipal"],
  tasas:["gencat","generalitat","atc ","agencia tributaria","aeat","ajuntament","ayuntamiento","diputacio","diputación","dgt","multa","multa transit","sancion","sanción","tribut","impost","impuesto","tax agency","taxes","ibi","ivtm","basura","residus","residuos","canon agua","canon de l'aigua","tasa","taxa","registro mercantil","registro civil","notaria","notaría","gestoria","gestoría","procurador","abogado","lexnet","catastro","seguretat social","seguridad social","tgss","recaudacion","recaudación","zona bajas emisiones","zbe"],
  ocio:["spotify","netflix","hbo","disney","steam","playstation","xbox","nintendo","fnac","museo","teatro","concierto","decathlon","padel","playtomic","gym","gimnasio","sport","bolera","anthropic","claude","claude.ai","openai","chatgpt","gpt-","google one","google play","googleplay","play store","playstore","icloud","apple.com","apple servic","youtube premium","youtube music","prime video","amazon prime","twitch","crunchyroll","dazn","filmin","movistar plus","rakuten","audible","deezer","tidal","dropbox","notion","canva","duolingo","cursor","midjourney","perplexity","hotel","hostal","booking","airbnb","apartament turistic","apartamento turistico","atraccion","atracción","parque tematico","zoologic","zoológico","aquarium","aquari","escape room","ocio"],
  compras:["zara","mango","primark","stradivarius","bershka","pull","el corte","amazon","amzn","openbank","open bank","aliexpress","pccomponentes","mediamarkt","worten","nike","adidas","foot locker","alehop","ale hop","ale-hop","saona","tiger","flying tiger","normal ","tedi","action","casa ","muy mucho","sostrene","søstrene","kiabi","lefties","springfield","cortefiel","jd sports","sprinter","shein","temu","massimo","oysho","cyrillus","calzedonia","intimissimi","clas ohlson","veritas","douglas perfum","cofidis","papeleria","papelería","copisteria","copistería","liberia","libreria","druni","primor","sephora","perfumeria"],
  hogar:["ikea","leroy","bricomart","bauhaus","ferreteria","muebles","sofa","lampara","tintoreria","tintorería","lavanderia","lavandería","mrw","seur","correos","amazon locker","zooplus","kivet","tiendanimal","miscota"],
  // "pelu" ANTES que salud: peluquería/estética dejan de caer en Salud (categoría propia, backlog 2026-07)
  pelu:["peluqueria","perruqueria","barberia","barber","estilis","hair","salon de belleza","nails","manicura","pedicura","lash","cejas","estetica","belleza","depilacion"],
  salud:["farmacia","clinica","clínica","medico","médico","doctor","dra.","dr.","consulta","ambulatorio","urgencias","hospital","optica","óptica","fisio","fisioterapia","masaje","podologo","podólogo","psicologo","psicólogo","psiquiatra","sanitas","adeslas","asisa","dkv","mutua","quiron","quirón","cima","cap ","centro medico","centro médico","laboratorio","analisis","análisis","radiologia","radiología","dentista","dental","ortodoncia","oculista","oftalmo"],
  regalos:["regalo","flores","floristeria","joyeria","perfumeria","sephora","douglas"],
};
function autoCategory(merchant){
  const c=(merchant||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const key=c.trim();
  if(USER_OVERRIDES[key]) return USER_OVERRIDES[key];                                        // lo que T\u00da has aprendido a mano
  for(const k in MERCHANT_OVERRIDES){ if(c.indexOf(k)!==-1) return MERCHANT_OVERRIDES[k]; }  // overrides de ejemplo
  // Keywords cortas (bar, bus…) con límite de palabra: si no, "Barcelona" caía en bares
  // por el substring «bar» (bug Kinepolis 2026-07-17).
  const hit=function(hay, needle){
    if(needle.length>=4) return hay.indexOf(needle)!==-1;
    let i=0;
    while((i=hay.indexOf(needle,i))!==-1){
      const before=i===0 || /[^a-z0-9]/.test(hay.charAt(i-1));
      const after=i+needle.length>=hay.length || /[^a-z0-9]/.test(hay.charAt(i+needle.length));
      if(before && after) return true;
      i++;
    }
    return false;
  };
  for(const cat in KW){ if(KW[cat].some(function(k){ return hit(c,k); })) return cat; }
  return "otros";
}
function resolveCategory(sheetCat, merchant){
  // "ambas": usa la del Sheet; si falta o es "otros", autodetecta por comercio
  if(sheetCat==="ingreso") return "ingreso";   // no está en CAT (es especial) pero debe respetarse
  if(sheetCat && sheetCat!=="otros" && CAT[sheetCat]) return sheetCat;
  return autoCategory(merchant);
}

/* ---------- Entidades (bancos/brókers) ---------- */
const ENT = {
  sabadell:       { label:"Sabadell",       mono:"Sb", color:"#4A9FE8" },
  revolut:        { label:"Revolut",        mono:"Rv", color:"#5FD08A" },
  trade_republic: { label:"Trade Republic", mono:"TR", color:"#E6C36A" },
  myinvestor:     { label:"MyInvestor",     mono:"MI", color:"#C9A0E0" },
  caixabank:      { label:"CaixaBank",      mono:"Cx", color:"#3FA9E0" },
  bbva:           { label:"BBVA",           mono:"BB", color:"#4B7FD6" },
  santander:      { label:"Santander",      mono:"Sa", color:"#E2705F" },
  ing:            { label:"ING",            mono:"IN", color:"#E2A05F" },
  openbank:       { label:"Openbank",       mono:"Ob", color:"#E2705F" },
  bankinter:      { label:"Bankinter",      mono:"Bk", color:"#E2A05F" },
  n26:            { label:"N26",            mono:"N2", color:"#3FB8A0" },
  kutxabank:      { label:"Kutxabank",      mono:"Ku", color:"#5FB0D0" },
  abanca:         { label:"Abanca",         mono:"Ab", color:"#5F90D0" },
  unicaja:        { label:"Unicaja",        mono:"Un", color:"#5FA0C0" },
  cajamar:        { label:"Cajamar",        mono:"Cj", color:"#6FB08A" },
  imagin:         { label:"imagin",         mono:"im", color:"#3FC0A8" },
  familia:        { label:"Familia",        mono:"Fa", color:"#E2705F" },
};
const entOf = (id)=> ENT[id] || { label:id, mono:"··", color:"#8FA89A" };

function fxTableOf(s){
  const t=s&&s.fxRates;
  if(t&&typeof t==="object") return t;
  const usd=(s&&s.fx)>0?s.fx:0.92;
  return { USD:usd };
}
/** Importe en `cur` → EUR. fxRates guarda XXX→EUR (1 USD = r EUR). */
function toEurAmt(amount, cur, s){
  const n=Number(amount)||0;
  const c=String(cur||"EUR").toUpperCase();
  if(!c||c==="EUR") return n;
  const r=fxTableOf(s)[c];
  if(r>0) return n*r;
  if(c==="USD"&&s&&s.fx>0) return n*s.fx;
  return n; // divisa desconocida: no inventar tipo
}
function fromEurAmt(amountEur, cur, s){
  const n=Number(amountEur)||0;
  const c=String(cur||"EUR").toUpperCase();
  if(!c||c==="EUR") return n;
  const r=fxTableOf(s)[c];
  if(r>0) return n/r;
  if(c==="USD"&&s&&s.fx>0) return n/s.fx;
  return n;
}
/** Coste en € anclado (costEur) o conversión spot del cost nativo. */
function invCostEur(i, s){
  if(!i) return 0;
  if(typeof i.costEur==="number"&&isFinite(i.costEur)) return i.costEur;
  return toEurAmt(i.cost||0, i.cur||"EUR", s);
}
function invValueEur(i, s){
  return toEurAmt(i&&i.value, i&&i.cur||"EUR", s);
}

/* ---------- Storage (localStorage con fallback) ---------- */
const _mem = {};
const store = {
  get(k){ try{ const v=localStorage.getItem(k); return v==null?null:JSON.parse(v);}catch(e){ return (k in _mem)?_mem[k]:null; } },
  set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){ _mem[k]=v; } },
};

/* ---------- Supabase: sincronización en la nube (Fase 1) ----------
   Offline-first: si no hay librería/red o no hay sesión, la app funciona igual con localStorage.
   Al iniciar sesión (magic link) se sincroniza el estado entre dispositivos.
   - app_state (JSONB): todo el estado de la app (cuentas, inversiones, gastos…).
   - tabla expenses: buzón donde MacroDroid (y la app) escriben gastos; la app los lee al sincronizar. */
const cloud = (function(){
  let sb = null;
  try {
    if (window.supabase && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY) {
      sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    }
  } catch(e){ sb = null; }
  return {
    enabled(){ return !!sb; },
    async session(){ if(!sb) return null; const {data}=await sb.auth.getSession(); return data.session; },
    onAuth(cb){ if(sb) sb.auth.onAuthStateChange(function(ev,session){ cb(session, ev); }); },
    async signIn(email){
      if(!sb) throw new Error("nube no disponible");
      const {error}=await sb.auth.signInWithOtp({ email:email, options:{ emailRedirectTo: location.href.split('#')[0] } });
      if(error) throw error;
    },
    async signOut(){ if(sb) await sb.auth.signOut(); },
    async signInPassword(email,password){ if(!sb) throw new Error("nube no disponible"); const {error}=await sb.auth.signInWithPassword({email:email,password:password}); if(error) throw error; },
    async signUpPassword(email,password){ if(!sb) throw new Error("nube no disponible"); const {data,error}=await sb.auth.signUp({email:email,password:password}); if(error) throw error; return data; },
    async resetPassword(email){ if(!sb) throw new Error("nube no disponible"); const {error}=await sb.auth.resetPasswordForEmail((email||"").trim(), { redirectTo: location.href.split('#')[0] }); if(error) throw error; },
    async updatePassword(newPass){ if(!sb) throw new Error("nube no disponible"); const {error}=await sb.auth.updateUser({ password:newPass }); if(error) throw error; },
    async pullState(){
      if(!sb) return null;
      const {data,error}=await sb.from('app_state').select('data,updated_at').maybeSingle();
      if(error) throw error;
      return data ? { data:data.data, updated_at:data.updated_at } : null;
    },
    async pushState(uid, data, lastKnownUpdatedAt){
      if(!sb || !uid) return null;
      const now=new Date().toISOString();
      if(lastKnownUpdatedAt){
        const {data:rows,error}=await sb.from('app_state')
          .update({ user_id:uid, data:data, updated_at:now })
          .eq('user_id', uid).eq('updated_at', lastKnownUpdatedAt)
          .select('updated_at');
        if(error) throw error;
        if(!rows || !rows.length) return { conflict:true };
        return { updated_at:rows[0].updated_at };
      }
      const {data:rows,error}=await sb.from('app_state')
        .upsert({ user_id:uid, data:data, updated_at:now }, { onConflict:'user_id' })
        .select('updated_at');
      if(error) throw error;
      return { updated_at: rows && rows[0] && rows[0].updated_at };
    },
    async pullExpenses(){
      if(!sb) return [];
      const {data,error}=await sb.from('expenses').select('*').order('fecha',{ascending:false}).limit(2000);
      if(error) throw error;
      return data || [];
    },
    async addExpense(e){
      if(!sb) return;
      const {data:{session}}=await sb.auth.getSession();
      if(!session) return;
      // source lleva el banco embebido (ob:caixa…) para filtrar en Gastos tras reinstalación
      // sin columna nueva en Supabase (feedback 2026-07-16).
      const {error}=await sb.from('expenses').upsert(
        { user_id:session.user.id, fecha:e.date, importe:e.amount, comercio:e.merchant, cat:e.category, source:expenseSourceForCloud(e), no_card:!!e.noCard },
        { onConflict:'user_id,fecha,importe,comercio', ignoreDuplicates:true }
      );
      if(error) throw error;
    },
    // Persiste el flag 💳/🔄 en la tabla (si no, el siguiente pull lo pisaría en gastos de la nube).
    async setExpenseNoCard(e, noCard){
      if(!sb) return;
      const {data:{session}}=await sb.auth.getSession();
      if(!session) return;
      const {error}=await sb.from('expenses').update({ no_card:!!noCard })
        .eq('user_id',session.user.id).eq('fecha',e.date).eq('importe',e.amount).eq('comercio',e.merchant||"");
      if(error) throw error;
    },
    async deleteExpense(e){
      if(!sb) return;
      const {data:{session}}=await sb.auth.getSession();
      if(!session) return;
      const {error}=await sb.from('expenses').delete()
        .eq('user_id',session.user.id).eq('fecha',e.date).eq('importe',e.amount).eq('comercio',e.merchant||"");
      if(error) throw error;
    },
    async prices(symbols){
      if(!sb) throw new Error("nube no disponible");
      // manda los tickers reales de la cartera: la función ya no está clavada a 6 símbolos
      const opts=(symbols&&symbols.length)?{body:{symbols:symbols}}:undefined;
      const {data,error}=await sb.functions.invoke('prices',opts);
      if(error) throw error;
      return data;
    },
    // IA / KW: sugiere categoría de gasto (Edge Function `categorize`). Sin OPENAI_API_KEY
    // en Supabase cae a keywords; si hay key, solo se usa cuando KW dice «otros».
    async suggestCategory(merchant){
      if(!sb) throw new Error("nube no disponible");
      const {data,error}=await sb.functions.invoke("categorize",{ body:{ merchant:String(merchant||"").slice(0,120) } });
      if(error) throw error;
      return data;
    },
    // Copia de seguridad diaria del estado COMPLETO (idempotente por día) + poda a 30 días.
    // Best-effort: si la tabla aún no existe (migración 0002 sin aplicar), simplemente falla y se ignora.
    async backupState(uid, data){
      if(!sb || !uid) return;
      const today=new Date().toISOString().slice(0,10);
      const {error}=await sb.from('state_backups').upsert(
        { user_id:uid, day:today, data:data },
        { onConflict:'user_id,day' }
      );
      if(error) throw error;
      const cutoff=new Date(Date.now()-30*86400000).toISOString().slice(0,10);
      try{ await sb.from('state_backups').delete().eq('user_id',uid).lt('day',cutoff); }catch(e){}
    },
    // ---- Open Banking (Enable Banking) · Capa 2 ----
    // Genera el enlace de login del banco (la Edge Function guarda el 'pending').
    async bankConnect(aspsp_name, country){
      if(!sb) throw new Error("nube no disponible");
      // platform:"app" → bank-callback devuelve la página puente micartera:// (vuelve a la APP,
      // no al navegador — bloqueante 3 del feedback pareja). En web, redirect normal con ?bank=.
      const native=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());
      const {data,error}=await sb.functions.invoke('bank-connect',{ body:{ aspsp_name:aspsp_name||"Banco de Sabadell", country:(country||"ES"), platform:(native?"app":"web") } });
      if(error) throw error;
      if(!data || !data.ok) throw new Error((data&&data.error)||"no se pudo conectar");
      return data;   // { ok, url }
    },
    // Lista de bancos soportados por Enable Banking para el selector (con logo).
    async bankAspsps(country){
      if(!sb) throw new Error("nube no disponible");
      const {data,error}=await sb.functions.invoke('bank-aspsps',{ body:{ country:(country||"ES") } });
      if(error) throw error;
      if(!data || !data.ok) throw new Error((data&&data.error)||"no se pudieron listar los bancos");
      return data.aspsps||[];
    },
    // Trae saldo (+ movimientos, que en Capa 2 ignoramos) de los bancos enlazados.
    async bankSync(){
      if(!sb) throw new Error("nube no disponible");
      const {data,error}=await sb.functions.invoke('bank-sync');
      if(error) throw error;
      if(!data || !data.ok) throw new Error((data&&data.error)||"sync falló");
      return data;   // { ok, dryRun, links:[{aspsp, iban, balances, transactions}] }
    },
    // IMPORTAR HISTÓRICO: trae movimientos desde dateFrom (YYYY-MM-DD, tope PSD2 ~90 días).
    // Modo lectura pura del servidor (no toca saldos). Devuelve { links:[{aspsp, accounts:[{transactions}]}] }.
    async bankSyncHistory(dateFrom){
      if(!sb) throw new Error("nube no disponible");
      const {data,error}=await sb.functions.invoke('bank-sync',{ body:{ dateFrom:dateFrom } });
      if(error) throw error;
      if(!data || !data.ok) throw new Error((data&&data.error)||"histórico falló");
      return data;
    },
    // Quita un banco enlazado (revoca en Enable Banking + borra la fila). Reversible: reconectar.
    async bankDisconnect(aspsp_name){
      if(!sb) throw new Error("nube no disponible");
      const {data,error}=await sb.functions.invoke('bank-disconnect',{ body:{ aspsp_name } });
      if(error) throw error;
      if(!data || !data.ok) throw new Error((data&&data.error)||"no se pudo quitar el banco");
      return data;   // { ok }
    },
    // Estado de los enlaces para pintar "conectado ✓" / caducidad (RLS: solo lo del usuario).
    async bankLinks(){
      if(!sb) return [];
      const {data,error}=await sb.from('bank_links').select('aspsp_name,aspsp_country,iban,status,valid_until,last_sync,accounts');
      if(error) throw error;
      return data||[];
    },
    // --- MyInvestor (API no oficial, fondos indexados) — mismo patrón que Trade Republic pero
    // por Edge Function (funciona en web y app; MyInvestor no lleva WAF en frío como TR). La
    // contraseña viaja SOLO en connect y NUNCA se guarda: se persisten solo los tokens.
    async myinvestorConnect(payload){
      if(!sb) throw new Error("nube no disponible");
      const {data,error}=await sb.functions.invoke('myinvestor-connect',{ body:payload });
      if(error) throw error;
      return data;
    },
    async myinvestorSync(){
      if(!sb) throw new Error("nube no disponible");
      const {data,error}=await sb.functions.invoke('myinvestor-sync');
      if(error) throw error;
      return data;
    },
    async myinvestorDisconnect(){
      if(!sb) return;
      try{ await sb.functions.invoke('myinvestor-disconnect'); }catch(e){}
    },
    async myinvestorStatus(){
      if(!sb) return null;
      const {data:{session}}=await sb.auth.getSession();
      if(!session) return null;
      // Solo columnas NO sensibles (grant a nivel de columna; los tokens no se exponen).
      const {data,error}=await sb.from('myinvestor_links').select('status,last_sync,updated_at').eq('user_id',session.user.id).maybeSingle();
      if(error) return null;
      return data||null;
    },
    // --- ingest MULTIUSUARIO (0008_ingest_tokens): cada persona apunta SUS gastos de TR en SU
    // cuenta. Guarda/actualiza el token del usuario (upsert por user_id, RLS: solo el suyo).
    async setIngestToken(token){
      if(!sb) throw new Error("nube no disponible");
      const {data:{session}}=await sb.auth.getSession();
      if(!session) throw new Error("sin sesión");
      const {error}=await sb.from('ingest_tokens').upsert(
        { token:token, user_id:session.user.id },
        { onConflict:'user_id' }
      );
      if(error) throw error;
    },
    async clearIngestToken(){
      if(!sb) return;
      const {data:{session}}=await sb.auth.getSession();
      if(!session) return;
      try{ await sb.from('ingest_tokens').delete().eq('user_id',session.user.id); }catch(e){}
    },
    // --- Telemetría solo-admin (0006_app_events): errores y pings de quien usa la app.
    // best-effort SIEMPRE (nunca rompe nada); máx 20 por sesión y dedupe del mismo mensaje.
    async logEvent(kind, message, detail){
      try{
        if(!sb) return;
        this._evSent=this._evSent||{}; this._evN=this._evN||0;
        const key=kind+"|"+String(message).slice(0,120);
        if(this._evSent[key] || this._evN>=20) return;
        this._evSent[key]=1; this._evN++;
        const {data:{session}}=await sb.auth.getSession();
        if(!session) return;
        await sb.from('app_events').insert({
          user_id:session.user.id,
          email:session.user.email||null,
          kind:kind||'error',
          message:String(message||"").slice(0,500),
          detail:detail?String(detail).slice(0,2000):null,
          app_version:CONFIG.APP_VERSION,
          platform:(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform())?'android':'web'
        });
      }catch(e){}
    },
    // Sugerencias/errores del popup de Novedades → app_events con kind 'feedback'.
    // A diferencia de logEvent, NO comparte el tope de 20/sesión ni el dedupe (un feedback
    // no puede perderse en silencio) y FALLA visible (el caller avisa si no se pudo enviar).
    async feedback(text){
      if(!sb) throw new Error("sin nube");
      const {data:{session}}=await sb.auth.getSession();
      if(!session) throw new Error("sin sesión");
      const s=String(text||"");
      const {error}=await sb.from('app_events').insert({
        user_id:session.user.id,
        email:session.user.email||null,
        kind:'feedback',
        message:s.slice(0,500),
        detail:s.length>500?s.slice(0,2000):null,
        app_version:CONFIG.APP_VERSION,
        platform:(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform())?'android':'web'
      });
      if(error) throw error;
    },
    // Panel del admin: últimos eventos de TODOS los usuarios (RLS deja leer solo al admin).
    async adminEvents(limit){
      if(!sb) return [];
      const {data,error}=await sb.from('app_events')
        .select('email,kind,message,detail,app_version,platform,created_at')
        .order('created_at',{ascending:false}).limit(limit||60);
      if(error) throw error;
      return data||[];
    },
    async fetchProfile(){
      if(!sb) return null;
      const {data,error}=await sb.from('profiles').select('is_admin').maybeSingle();
      if(error) throw error;
      return data;
    },
    async deleteAccount(password){
      if(!sb) throw new Error("nube no disponible");
      const {data,error}=await sb.functions.invoke('delete-account',{ body:{ password:password } });
      if(error) throw error;
      if(!data || !data.ok) throw new Error((data&&data.error)||"no se pudo borrar la cuenta");
      await sb.auth.signOut();
      return data;
    },
    // ---- Hogar compartido (snapshots Fase 1) ----
    async createHousehold(name, inviteCode){
      if(!sb) throw new Error("nube no disponible");
      const {data:{session}}=await sb.auth.getSession();
      if(!session) throw new Error("sin sesión");
      const code=String(inviteCode||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8);
      if(code.length<4) throw new Error("código inválido");
      const {data:hh,error}=await sb.from("households").insert({
        name:String(name||"Mi hogar").slice(0,80),
        invite_code:code,
        created_by:session.user.id,
      }).select().single();
      if(error) throw error;
      const {error:e2}=await sb.from("household_members").insert({
        household_id:hh.id, user_id:session.user.id, role:"owner",
      });
      if(e2) throw e2;
      return hh;
    },
    async joinHousehold(code){
      if(!sb) throw new Error("nube no disponible");
      const {data,error}=await sb.rpc("join_household_by_code",{ p_code:String(code||"").trim() });
      if(error) throw error;
      return data;
    },
    async fetchHouseholdBundle(){
      if(!sb) return { household:null, snapshots:[] };
      const {data:mem,error:e1}=await sb.from("household_members").select("household_id,role").limit(1);
      if(e1) throw e1;
      if(!mem||!mem.length) return { household:null, snapshots:[] };
      const hid=mem[0].household_id;
      const {data:hh,error:e2}=await sb.from("households").select("*").eq("id",hid).maybeSingle();
      if(e2) throw e2;
      if(!hh) return { household:null, snapshots:[] };
      const {data:snaps,error:e3}=await sb.from("household_snapshots")
        .select("user_id,payload,published_at").eq("household_id",hid);
      if(e3) throw e3;
      return { household:hh, snapshots:snaps||[], myRole:mem[0].role };
    },
    async publishHouseholdSnapshot(householdId, payload){
      if(!sb) throw new Error("nube no disponible");
      const {data:{session}}=await sb.auth.getSession();
      if(!session) throw new Error("sin sesión");
      const {error}=await sb.from("household_snapshots").upsert({
        household_id:householdId,
        user_id:session.user.id,
        payload:payload,
        published_at:new Date().toISOString(),
      }, { onConflict:"household_id,user_id" });
      if(error) throw error;
    },
    async leaveHousehold(householdId){
      if(!sb) throw new Error("nube no disponible");
      const {data:{session}}=await sb.auth.getSession();
      if(!session) throw new Error("sin sesión");
      await sb.from("household_snapshots").delete().eq("household_id",householdId).eq("user_id",session.user.id);
      const {error}=await sb.from("household_members").delete().eq("household_id",householdId).eq("user_id",session.user.id);
      if(error) throw error;
    },
  };
})();

/* Codifica el banco en `source` de la tabla (sin migración SQL): ob:caixa, ob-hist:sabadell,
   macrodroid (= Trade Republic). Así el filtro por banco sobrevive a reinstalaciones. */
function expenseSourceForCloud(e){
  const ent=e&&e.ent; const s=(e&&e.source)||"manual";
  if(ent&&(s==="ob"||String(s).indexOf("ob:")===0)) return "ob:"+ent;
  if(ent&&(s==="ob-hist"||String(s).indexOf("ob-hist:")===0)) return "ob-hist:"+ent;
  if(s==="macrodroid"||s==="tr") return "macrodroid";
  if(s==="supabase") return "manual";
  return s||"manual";
}
/* Banco de un gasto (ent) o null si es a mano / desconocido. */
function expenseBankOf(e){
  if(!e) return null;
  if(e.ent) return e.ent;
  const s=String(e.source||"");
  if(s==="macrodroid"||s==="tr") return "trade_republic";
  if(s.indexOf("ob:")===0) return s.slice(3)||null;
  if(s.indexOf("ob-hist:")===0) return s.slice(8)||null;
  return null;
}
/* Convierte una fila de la tabla `expenses` al formato interno de la app. */
function expenseFromRow(r){
  const raw=String(r.source||"manual");
  let ent=null, source=raw;
  if(raw==="macrodroid"||raw==="tr"){ ent="trade_republic"; source="macrodroid"; }
  else if(raw.indexOf("ob:")===0){ ent=raw.slice(3)||null; source="ob"; }
  else if(raw.indexOf("ob-hist:")===0){ ent=raw.slice(8)||null; source="ob-hist"; }
  else if(raw==="supabase"){ source="manual"; }   // legado: antes el pull marcaba todo como supabase
  return {
    id: r.id,
    date: new Date(r.fecha).toISOString(),
    merchant: r.comercio || "Gasto",
    amount: Number(r.importe) || 0,
    // misma autodetección que el path del Sheet: si la cat es genérica, la deduce por comercio
    category: resolveCategory(r.cat, r.comercio || ""),
    source: source,
    ent: ent||undefined,
    noCard: r.no_card ? true : undefined,   // bizum/transfer: fuera del round-up (columna 0005)
  };
}

/* Une gastos en la lista local con dedup por clave (fecha|importe|comercio).
   ADITIVO: nunca borra los que ya tenías; solo añade los nuevos. Esto evita perder
   datos durante la migración (la tabla de la nube puede estar aún vacía). */
function mergeExpenses(prevList, incoming){
  const keyOf=function(e){ return String(e.date).slice(0,10)+"|"+e.amount+"|"+(e.merchant||""); };
  const seen={}; const list=[];
  (prevList||[]).forEach(function(e){ const k=keyOf(e); if(!seen[k]){ seen[k]=1; list.push(e); } });
  let nuevos=0;
  (incoming||[]).forEach(function(e){ const k=keyOf(e); if(!seen[k]){ seen[k]=1; list.push(e); nuevos++; } });
  return { list:list, nuevos:nuevos };
}

/* ¿El estado bajado de la nube tiene forma válida? Evita machacar lo local con algo corrupto/parcial.
   (Los arrays pueden estar vacíos —usuario nuevo— pero deben EXISTIR y ser arrays.) */
function validCloudState(s){
  if(!s || typeof s!=="object") return false;
  return ["accounts","investments","debts","fixed"].every(function(k){ return Array.isArray(s[k]); });
}

/* Para el push FRECUENTE a la nube (cada ~1,2s): los gastos viven en su tabla `expenses`
   (fuente de verdad), así que NO los duplicamos en el JSONB de app_state → se mantiene ligero
   aunque haya miles de gastos. El backup diario sí guarda el estado completo. */
function slimForCloud(s){ const c=Object.assign({},s); delete c.expenses; delete c.bankTx; return c; }

/* ---------- Desbloqueo biométrico (huella / Face ID vía WebAuthn) ----------
   Candado LOCAL por dispositivo: tras iniciar sesión una vez, la app pide huella al abrir.
   No verifica en servidor (suficiente para uso personal); es una capa de UX tipo app de banco. */
function bufToB64(buf){ const b=new Uint8Array(buf); let s=""; for(let i=0;i<b.length;i++) s+=String.fromCharCode(b[i]); return btoa(s); }
function b64ToBuf(b64){ const s=atob(b64); const a=new Uint8Array(s.length); for(let i=0;i<s.length;i++) a[i]=s.charCodeAt(i); return a.buffer; }
/* Plugin nativo de la app Android (biometría, widget, notificaciones). null en web pura. */
function natPlugin(){
  try{ return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.MiCartera) || null; }catch(e){ return null; }
}
const bio = {
  // En la app Android la WebView NO expone WebAuthn → usa el plugin nativo (BiometricPrompt).
  supported(){ if(natPlugin()) return true; return !!(window.PublicKeyCredential && navigator.credentials && location.protocol==="https:"); },
  enabled(){ return !!store.get("bio_cred"); },
  async enable(uid, email){
    const nat=natPlugin();
    if(nat){
      const r=await nat.bioAvailable();
      if(!r || !r.available) throw new Error("Configura primero la huella o el bloqueo de pantalla del móvil");
      await nat.bioVerify();                       // pide la huella YA, como el create() de WebAuthn
      store.set("bio_cred", { native:true });
      return true;
    }
    if(!this.supported()) throw new Error("Este dispositivo/navegador no soporta huella");
    const cred = await navigator.credentials.create({ publicKey:{
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp:{ id: location.hostname, name:"Mi Cartera" },
      user:{ id: new TextEncoder().encode(String(uid||email||"user")), name: email||"usuario", displayName: email||"Mi Cartera" },
      pubKeyCredParams:[{type:"public-key",alg:-7},{type:"public-key",alg:-257}],
      authenticatorSelection:{ authenticatorAttachment:"platform", userVerification:"required", residentKey:"preferred" },
      timeout:60000,
    }});
    store.set("bio_cred", { id: bufToB64(cred.rawId) });
    return true;
  },
  disable(){ try{ localStorage.removeItem("bio_cred"); }catch(e){} store.set("bio_cred", null); },
  async unlock(){
    const c = store.get("bio_cred"); if(!c) return true;
    if(c.native){
      const nat=natPlugin();
      if(!nat) return true;   // candado nativo pero sin plugin (no debería pasar): no dejar la app inaccesible
      await nat.bioVerify();
      return true;
    }
    await navigator.credentials.get({ publicKey:{
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId: location.hostname,
      allowCredentials:[{ type:"public-key", id: b64ToBuf(c.id) }],
      userVerification:"required",
      timeout:60000,
    }});
    return true;  // si no lanza, la huella se verificó
  },
};

/* ---------- Helpers ---------- */
const NF  = new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2});
const NF0 = new Intl.NumberFormat('es-ES',{maximumFractionDigits:0});
// Moneda de visualización. Todos los importes de la app están en € (base); DISP los convierte
// a la moneda elegida (k = factor sobre €, sym = símbolo). Se fija en App según ajustes + fx.
let DISP = { sym:"€", k:1 };
const eur  = (n)=> NF.format((n||0)*DISP.k)+" "+DISP.sym;
const eur0 = (n)=> NF0.format(Math.round((n||0)*DISP.k))+" "+DISP.sym;
