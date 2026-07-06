// ============================================================
// Edge Function: ingest
// Recibe las notificaciones de Trade Republic (lector nativo de la app Android,
// antes MacroDroid), las CLASIFICA, parsea, categoriza e inserta en `expenses`.
//
// Clasificación (bug Bizum 2026-07-05: un bizum RECIBIDO entraba como gasto):
//   - gasto         → compra con tarjeta (comportamiento clásico)
//   - ingreso       → bizum RECIBIDO: importe NEGATIVO + cat "ingreso" (resta del mes)
//   - gasto_nocard  → bizum ENVIADO: gasto con no_card=true (sale del saldo,
//                     pero NO alimenta el round-up: TR solo redondea tarjeta)
//   - ignorado      → ruido de TR: intereses, dividendos, órdenes, planes de
//                     inversión, round-up/saveback, depósitos propios (ya modelados
//                     con `inject`), transferencias no-bizum, avisos de seguridad…
//
// Además devuelve `alert` (presupuesto superado / 80% / gasto tocho) calculada
// server-side, para que el lector nativo pueda enseñar una notificación real
// aunque la app esté cerrada.
//
// Sin sesión de usuario (verify_jwt = false): el lector no tiene login.
// Se protege con un token propio (INGEST_TOKEN) y escribe SIEMPRE para el
// usuario configurado (INGEST_USER_ID), usando la service role key (salta RLS).
//
// Secretos necesarios en el proyecto:
//   INGEST_TOKEN     — token compartido que el lector envía (?token=… o cabecera x-ingest-token)
//   INGEST_USER_ID   — uuid de tu usuario (auth.users) dueño de los gastos
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — los inyecta Supabase automáticamente
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CATEGORIAS: Record<string, string[]> = {
  bares:      ["restaurante","bar","cafe","cafè","cafeteria","mcdonalds","burger","pizza","sushi","tapas","cerveceria","bodega","heladeria","pasteleria","panaderia","bocadillo","kebab","pollo","grill","braseria","taberna","comida","food","lunch","dinner","brunch","desayuno","just eat","justeat","glovo","uber eats","ubereats","vending","expendedor"],
  super:      ["mercadona","lidl","aldi","carrefour","dia ","bon preu","consum","eroski","spar","alcampo","simply","supermercado","market","fresco","verdura","fruteria"],
  transporte: ["renfe","fgc","tmb","metro","bus","taxi","cabify","uber","parking","gasolina","repsol","cepsa","bp ","shell","autopista","peaje","tram","vueling","iberia","ryanair","easyjet","aeropuerto"],
  ocio:       ["cinema","cines","cinesa","yelmo","spotify","netflix","hbo","disney","steam","playstation","xbox","nintendo","fnac","game ","museo","teatro","concierto","ticketmaster","decathlon","padel","playtomic","gym","gimnasio","sport"],
  compras:    ["zara","mango","hm ","h&m","primark","stradivarius","bershka","pull","cortefiel","el corte","amazon","aliexpress","pccomponentes","mediamarkt","leroy","ikea","worten","nike","adidas","foot locker","cofidis"],
  hogar:      ["ikea","leroy merlin","bricomart","bauhaus","ferreteria","muebles","sofa","lampara"],
  salud:      ["farmacia","clinica","medico","dentista","hospital","optica","fisio","masaje","peluqueria","barberia","estetica","belleza","depilacion"],
  regalos:    ["regalo","flores","floristeria","joyeria","perfumeria","sephora","douglas"],
};

// minúsculas + sin acentos, para comparar keywords ("cafè" ≈ "cafe")
function norm(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function categorizar(comercio: string): string {
  const c = norm(comercio);
  for (const [cat, kws] of Object.entries(CATEGORIAS)) {
    for (const kw of kws) if (c.includes(kw)) return cat;
  }
  return "otros";
}

type Tipo = "gasto" | "gasto_nocard" | "ingreso" | "ignorado";

// Clasifica la notificación por su texto. Orden importa: primero el ruido
// (un "has recibido 2,03 € de intereses" debe caer en IGNORAR, no en ingreso).
function clasificar(texto: string, titulo: string): Tipo {
  const t = norm(titulo + " " + texto);

  // 1) Notificaciones de TR que NO son movimientos de gasto del día a día
  const IGNORAR = [
    "interes", "dividendo", "rendimiento", "rentabilidad",
    "saveback", "redondeo", "round up", "roundup", "round-up",
    "plan de inversion", "inversion programada", "aporte periodico", "savings plan", "saving plan",
    "has invertido", "hemos invertido", "se ha invertido", "invertido",
    "orden de compra", "orden de venta", "orden ejecutada", "ejecutado", "ejecutada", "limit", "stop",
    "deposito", "has anadido", "anadido dinero", "ingresado en tu cuenta", "recarga", "top up", "top-up",
    "alerta de precio", "precio objetivo", "cotizacion",
    "inicio de sesion", "codigo", "seguridad", "dispositivo",
  ];
  if (IGNORAR.some((k) => t.includes(k))) return "ignorado";

  const esBizum  = t.includes("bizum");
  const recibido = /(has recibido|recibido|recibiste|te ha enviado|te envio|te ha hecho|has rebut|t'ha enviat|received|sent you)/.test(t);
  const enviado  = /(has enviado|enviaste|le has enviado|has hecho un bizum|has fet un bizum|you sent|enviado a)/.test(t);

  // 2) Bizum: recibido = ingreso; enviado = gasto sin tarjeta (no round-up).
  //    Si no queda claro el sentido, mejor fuera que contarlo como compra.
  if (esBizum) {
    if (enviado) return "gasto_nocard";
    if (recibido) return "ingreso";
    return "ignorado";
  }

  // 3) Transferencia/entrada no-bizum = normalmente TU propia aportación mensual
  //    (ya modelada en la app con `inject`) o un movimiento interno → fuera.
  if (recibido || t.includes("transferencia")) return "ignorado";

  // 4) Lo demás con importe = compra con tarjeta (el caso clásico que ya funcionaba)
  return "gasto";
}

function extraerImporte(texto: string): number {
  const m1 = (texto || "").match(/(\d+(?:\.\d{3})*[.,]\d+)\s*€/);
  if (m1) return parseFloat(m1[1].replace(/\.(?=\d{3})/g, "").replace(",", "."));
  const m2 = (texto || "").match(/(\d+[.,]\d+)/);
  if (m2) return parseFloat(m2[1].replace(",", "."));
  return 0;
}

function extraerComercio(texto: string, titulo: string): string {
  const m = (texto || "").match(/en\s+(.+)$/i);
  if (m) return m[1].trim();
  return (titulo || "Desconocido").trim();
}

// Para bizums: intenta sacar el nombre de la otra persona ("… de María" / "… a María")
function extraerPersona(texto: string, prep: "de" | "a"): string {
  const re = new RegExp("\\b" + prep + "\\s+([^.\\d€]+?)\\s*(?:por\\s+bizum)?\\s*[.!]?$", "i");
  const m = (texto || "").match(re);
  return m ? m[1].trim() : "";
}

function parseFecha(t: string): string {
  const n = parseInt(t);
  const d = !isNaN(n) && n > 0 ? new Date(n) : new Date(t);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  // 1) Autenticación propia (token compartido con el lector)
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || req.headers.get("x-ingest-token") || "";
  if (token !== Deno.env.get("INGEST_TOKEN")) return json({ ok: false, error: "token inválido" }, 403);

  const userId = Deno.env.get("INGEST_USER_ID");
  if (!userId) return json({ ok: false, error: "INGEST_USER_ID no configurado" }, 500);

  // 2) Parseo del cuerpo (JSON o form-urlencoded, compat MacroDroid)
  const raw = await req.text();
  let data: Record<string, string> = {};
  try { data = JSON.parse(raw); }
  catch { data = Object.fromEntries(new URLSearchParams(raw)); }

  const texto = data.texto || data.notiText || "";
  const titulo = data.titulo || data.notiTitle || "";
  const triggertime = data.fecha || data.triggertime || "";

  const tipo = clasificar(texto, titulo);
  if (tipo === "ignorado") return json({ ok: true, tipo, skipped: true });

  const bruto = extraerImporte(texto);
  if (!(bruto > 0)) return json({ ok: true, tipo: "ignorado", skipped: true, error: "sin importe" });

  const fecha = parseFecha(triggertime);
  let importe = bruto;
  let comercio: string;
  let cat: string;
  let noCard = false;

  if (tipo === "ingreso") {
    importe = -bruto;                                   // resta del gasto del mes
    const quien = extraerPersona(texto, "de");
    comercio = quien ? "Bizum de " + quien : "Bizum recibido";
    cat = "ingreso";
    noCard = true;
  } else if (tipo === "gasto_nocard") {
    const quien = extraerPersona(texto, "a");
    comercio = quien ? "Bizum a " + quien : "Bizum enviado";
    cat = "otros";
    noCard = true;                                      // no alimenta el round-up
  } else {
    comercio = extraerComercio(texto, titulo);
    cat = categorizar(comercio);
  }

  // 3) Inserción (service role → salta RLS). Dedup contra expenses_dedup_idx.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { error } = await supabase
    .from("expenses")
    .upsert(
      { user_id: userId, fecha, importe, comercio, cat, source: "macrodroid", no_card: noCard },
      { onConflict: "user_id,fecha,importe,comercio", ignoreDuplicates: true },
    );
  if (error) return json({ ok: false, error: error.message }, 500);

  // 4) Total del mes + alerta de presupuesto server-side (best-effort): el lector
  //    nativo lo usa para refrescar el WIDGET y lanzar la notificación aunque la
  //    app esté cerrada. Mismas reglas que la app (al_over > al_80 > al_big).
  let alert: Record<string, unknown> | null = null;
  let month: Record<string, number> | null = null;
  try {
    const { data: st } = await supabase.from("app_state").select("data").eq("user_id", userId).maybeSingle();
    const budget = Number(st?.data?.budget) || 0;
    const now = new Date(fecha);
    const desde = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const { data: rows } = await supabase
      .from("expenses").select("importe")
      .eq("user_id", userId).gte("fecha", desde);
    const after = (rows || []).reduce((a, r) => a + (Number(r.importe) || 0), 0);
    month = { spent: Math.round(after * 100) / 100, budget };
    if (tipo === "gasto" && budget > 0) {
      const before = after - importe;
      if (before <= budget && after > budget)       alert = { kind: "over", monthSpent: after, budget };
      else if (before < budget * 0.8 && after >= budget * 0.8 && after <= budget)
                                                    alert = { kind: "p80", monthSpent: after, budget };
      else if (importe >= budget * 0.15 && importe >= 50)
                                                    alert = { kind: "big", monthSpent: after, budget };
    }
  } catch (_) { /* opcional; el movimiento ya está guardado */ }

  return json({ ok: true, tipo, fecha, importe, comercio, cat, alert, month });
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
