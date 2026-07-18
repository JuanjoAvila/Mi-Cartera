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
// Sin sesión de usuario (verify_jwt = false): el lector nativo no tiene login de Supabase.
// MULTIUSUARIO vía token propio (migración 0008_ingest_tokens):
//   · INGEST_TOKEN + INGEST_USER_ID → token legacy del creador (sigue igual).
//   · Cualquier otro token → lookup en ingest_tokens → user_id del titular.
// La app genera el token por usuario en Ajustes → notificaciones TR y el plugin Android
// lo manda en ?token=… (setIngestUrl). Escritura con service role (RLS no aplica al insert).
//
// Secretos necesarios en el proyecto:
//   INGEST_TOKEN     — token compartido que el lector envía (?token=… o cabecera x-ingest-token)
//   INGEST_USER_ID   — uuid de tu usuario (auth.users) dueño de los gastos
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — los inyecta Supabase automáticamente
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  categorizar, clasificar, extraerComercio, extraerImporte, extraerPersona, type Tipo,
} from "../_shared/ingest_logic.ts";

function parseFecha(t: string): string {
  const n = parseInt(t);
  const d = !isNaN(n) && n > 0 ? new Date(n) : new Date(t);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  // Cliente service role (salta RLS): lo usamos para resolver el token → usuario y para escribir.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1) Autenticación + MULTIUSUARIO (migración 0008): el lector nativo manda un token propio.
  //    · Token del CREADOR (secreto INGEST_TOKEN → INGEST_USER_ID): sigue igual, cero disrupción.
  //    · Cualquier otro token: se busca en `ingest_tokens` y se apunta el gasto en SU cuenta.
  //    Así una pareja/amigo apunta sus gastos de TR en su propia cuenta, no en la del creador.
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || req.headers.get("x-ingest-token") || "";
  if (!token) return json({ ok: false, error: "sin token" }, 403);

  let userId: string | null = null;
  const legacyToken = Deno.env.get("INGEST_TOKEN");
  if (legacyToken && token === legacyToken) {
    userId = Deno.env.get("INGEST_USER_ID") || null;
    if (!userId) return json({ ok: false, error: "INGEST_USER_ID no configurado" }, 500);
  } else {
    const { data: tok } = await supabase
      .from("ingest_tokens").select("user_id").eq("token", token).maybeSingle();
    userId = tok?.user_id || null;
  }
  if (!userId) {
    await logIngestError(supabase, null, "token inválido (lector nativo con token no registrado)", "token=" + token.slice(0, 8) + "…");
    return json({ ok: false, error: "token inválido" }, 403);
  }

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

  // 3) Inserción (service role → salta RLS, cliente creado arriba). Dedup contra expenses_dedup_idx.
  // VENTANA ANTI-DUPLICADO (bug cobro doble 2026-07-10): el índice de dedup exige el MISMO
  // timestamp, pero un pago con confirmación genera dos notis con minutos de diferencia
  // (autorizar → cargo) y entraba dos veces. Mismo usuario + mismo importe a <10 min = el
  // mismo movimiento → se ignora. (Dos compras REALES idénticas en <10 min es rarísimo;
  // si pasa, se apunta a mano — mejor eso que cobros fantasma duplicados.)
  const t0 = new Date(fecha).getTime();
  const { data: dupRows } = await supabase
    .from("expenses").select("fecha")
    .eq("user_id", userId).eq("importe", importe)
    .gte("fecha", new Date(t0 - 10 * 60 * 1000).toISOString())
    .lte("fecha", new Date(t0 + 10 * 60 * 1000).toISOString())
    .limit(1);
  if (dupRows && dupRows.length) return json({ ok: true, tipo, skipped: true, dup: true });

  const { error } = await supabase
    .from("expenses")
    .upsert(
      { user_id: userId, fecha, importe, comercio, cat, source: "macrodroid", no_card: noCard },
      { onConflict: "user_id,fecha,importe,comercio", ignoreDuplicates: true },
    );
  if (error) {
    await logIngestError(supabase, userId, "no se pudo guardar el gasto: " + error.message, comercio + " · " + importe + "€");
    return json({ ok: false, error: error.message }, 500);
  }

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
      // Umbrales 50/95 añadidos 2026-07-18 (petición: avisos aunque la app esté cerrada —
      // esta respuesta la renderiza el lector nativo, así que funciona en frío).
      if (before <= budget && after > budget)       alert = { kind: "over", monthSpent: after, budget };
      else if (before < budget * 0.95 && after >= budget * 0.95 && after <= budget)
                                                    alert = { kind: "p95", monthSpent: after, budget };
      else if (before < budget * 0.8 && after >= budget * 0.8 && after < budget * 0.95)
                                                    alert = { kind: "p80", monthSpent: after, budget };
      else if (before < budget * 0.5 && after >= budget * 0.5 && after < budget * 0.8)
                                                    alert = { kind: "p50", monthSpent: after, budget };
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

// Telemetría solo-admin: los fallos del ingest eran INVISIBLES (pasaban en el servidor, lejos
// de la app → app_events no se enteraba y el gasto "desaparecía" sin rastro — bug 2026-07-11).
// Best-effort: nunca rompe el ingest. Sin user resuelto se apunta al del creador (es su panel).
// deno-lint-ignore no-explicit-any
async function logIngestError(supabase: any, userId: string | null, message: string, detail?: string) {
  try {
    const uid = userId || Deno.env.get("INGEST_USER_ID");
    if (!uid) return;
    await supabase.from("app_events").insert({
      user_id: uid, email: null, kind: "error",
      message: ("INGEST: " + message).slice(0, 500),
      detail: detail ? String(detail).slice(0, 2000) : null,
      app_version: "edge", platform: "android",
    });
  } catch (_) { /* opcional */ }
}
