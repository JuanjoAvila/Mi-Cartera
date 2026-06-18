// ============================================================
// Edge Function: ingest
// Recibe las notificaciones de gasto de MacroDroid (POST), las parsea,
// categoriza e inserta en la tabla `expenses`. Reemplaza a doPost del Apps Script.
//
// Sin sesión de usuario (verify_jwt = false): MacroDroid no tiene login.
// Se protege con un token propio (INGEST_TOKEN) y escribe SIEMPRE para el
// usuario configurado (INGEST_USER_ID), usando la service role key (salta RLS).
//
// Secretos necesarios en el proyecto:
//   INGEST_TOKEN     — token compartido que MacroDroid envía (?token=… o cabecera x-ingest-token)
//   INGEST_USER_ID   — uuid de tu usuario (auth.users) dueño de los gastos
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — los inyecta Supabase automáticamente
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CATEGORIAS: Record<string, string[]> = {
  bares:      ["restaurante","bar","cafe","cafè","cafeteria","mcdonalds","burger","pizza","sushi","tapas","cerveceria","bodega","heladeria","pasteleria","panaderia","bocadillo","kebab","pollo","grill","braseria","taberna","comida","food","lunch","dinner","brunch","desayuno"],
  super:      ["mercadona","lidl","aldi","carrefour","dia ","bon preu","consum","eroski","spar","alcampo","simply","supermercado","market","fresco","verdura","fruteria"],
  transporte: ["renfe","fgc","tmb","metro","bus","taxi","cabify","uber","parking","gasolina","repsol","cepsa","bp ","shell","autopista","peaje","tram","vueling","iberia","ryanair","easyjet","aeropuerto"],
  ocio:       ["cinema","cines","cinesa","yelmo","spotify","netflix","hbo","disney","steam","playstation","xbox","nintendo","fnac","game ","museo","teatro","concierto","ticketmaster","decathlon","padel","playtomic","gym","gimnasio","sport"],
  compras:    ["zara","mango","hm ","h&m","primark","stradivarius","bershka","pull","cortefiel","el corte","amazon","aliexpress","pccomponentes","mediamarkt","leroy","ikea","worten","nike","adidas","foot locker"],
  hogar:      ["ikea","leroy merlin","bricomart","bauhaus","ferreteria","muebles","sofa","lampara"],
  salud:      ["farmacia","clinica","medico","dentista","hospital","optica","fisio","masaje","peluqueria","barberia","estetica","belleza","depilacion"],
  regalos:    ["regalo","flores","floristeria","joyeria","perfumeria","sephora","douglas"],
};

function categorizar(comercio: string): string {
  // NFD + quita diacríticos (\p{Diacritic}) para que "cafè" ≈ "cafe"
  const c = (comercio || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  for (const [cat, kws] of Object.entries(CATEGORIAS)) {
    for (const kw of kws) if (c.includes(kw)) return cat;
  }
  return "otros";
}

function extraerImporte(texto: string): number {
  const m1 = (texto || "").match(/(\d+[.,]\d+)\s*€/);
  if (m1) return parseFloat(m1[1].replace(",", "."));
  const m2 = (texto || "").match(/(\d+[.,]\d+)/);
  if (m2) return parseFloat(m2[1].replace(",", "."));
  return 0;
}

function extraerComercio(texto: string, titulo: string): string {
  const m = (texto || "").match(/en\s+(.+)$/i);
  if (m) return m[1].trim();
  return (titulo || "Desconocido").trim();
}

function parseFecha(t: string): string {
  const n = parseInt(t);
  const d = !isNaN(n) && n > 0 ? new Date(n) : new Date(t);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  // 1) Autenticación propia (token compartido con MacroDroid)
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || req.headers.get("x-ingest-token") || "";
  if (token !== Deno.env.get("INGEST_TOKEN")) return json({ ok: false, error: "token inválido" }, 403);

  const userId = Deno.env.get("INGEST_USER_ID");
  if (!userId) return json({ ok: false, error: "INGEST_USER_ID no configurado" }, 500);

  // 2) Parseo del cuerpo (JSON o form-urlencoded, como mandaba MacroDroid)
  const raw = await req.text();
  let data: Record<string, string> = {};
  try { data = JSON.parse(raw); }
  catch { data = Object.fromEntries(new URLSearchParams(raw)); }

  const texto = data.texto || data.notiText || "";
  const titulo = data.titulo || data.notiTitle || "";
  const triggertime = data.fecha || data.triggertime || "";

  const importe = extraerImporte(texto);
  const comercio = extraerComercio(texto, titulo);
  const cat = categorizar(comercio);
  const fecha = parseFecha(triggertime);

  // 3) Inserción (service role → salta RLS). Dedup contra expenses_dedup_idx.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { error } = await supabase
    .from("expenses")
    .upsert(
      { user_id: userId, fecha, importe, comercio, cat, source: "macrodroid" },
      { onConflict: "user_id,fecha,importe,comercio", ignoreDuplicates: true },
    );

  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true, fecha, importe, comercio, cat });
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
