// ============================================================
// Edge Function: bank-callback  (verify_jwt = false)
// Aquí ATERRIZA el navegador tras autorizar en el banco (con ?code=&state=).
// No hay sesión: localizamos al usuario por el `state` guardado en bank-connect,
// canjeamos el code por una sesión de Enable Banking, guardamos la cuenta
// autorizada y devolvemos al usuario a la app. NO escribe en expenses.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ebApi, ebConfig, makeJWT } from "../_shared/enablebanking.ts";

const APP_URL = Deno.env.get("APP_URL") || "https://juanjoavila.github.io/Mi-Cartera/";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const ebError = url.searchParams.get("error") || url.searchParams.get("error_description");
  const rawQuery = url.search || "(vacío)";
  try {
    if (ebError) throw new Error("banco devolvió error: " + ebError + " · " + rawQuery);
    if (!code || !state) throw new Error("faltan code/state · recibido: " + rawQuery);
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: link } = await admin.from("bank_links").select("*").eq("state", state).maybeSingle();
    if (!link) throw new Error("state desconocido");

    const { appId, pem } = ebConfig();
    const jwt = await makeJWT(appId, pem);
    const session = await ebApi(jwt, "/sessions", { method: "POST", body: { code } });
    const sessionId = session.session_id || session.id || null;

    // --- Extracción robusta de la cuenta autorizada ---
    // Enable Banking devuelve las cuentas en formas DISTINTAS según banco/endpoint:
    //   · POST /sessions      → `accounts`: objetos {uid, account_id:{iban}}   (Sabadell: OK)
    //   · otros bancos        → `accounts` vacío y los uids en `accounts_data` [{uid, identification_hash}]
    //   · GET /sessions/{id}  → `accounts`: uids (strings) + `accounts_data`: objetos
    // (MyInvestor/Revolut/Caixa daban `recibidas: 0` porque solo mirábamos `accounts` como objetos).
    // Leemos las DOS listas y, si el POST viene vacío, preguntamos con GET /sessions/{id}.
    // deno-lint-ignore no-explicit-any
    const uidOf = (a: any): string | null =>
      (typeof a === "string" ? a : (a?.uid || a?.account_id?.uid || a?.id || null)) || null;
    // deno-lint-ignore no-explicit-any
    const ibanOf = (a: any): string | null =>
      (typeof a === "string" ? null : (a?.account_id?.iban || a?.iban || null)) || null;
    // deno-lint-ignore no-explicit-any
    const collect = (o: any): any[] => {
      const a = Array.isArray(o?.accounts) ? o.accounts : [];
      const d = Array.isArray(o?.accounts_data) ? o.accounts_data : [];
      return a.concat(d);
    };

    let acc = collect(session).find((a) => uidOf(a)) || null;
    // Fallback: el POST no trajo cuenta usable pero sí hay session_id → pídelas con GET.
    if (!acc && sessionId) {
      try {
        const full = await ebApi(jwt, `/sessions/${sessionId}`);
        acc = collect(full).find((a) => uidOf(a)) || null;
      } catch (_) { /* lo reportamos abajo con diagnóstico */ }
    }
    const uid = uidOf(acc);
    const iban = ibanOf(acc);

    await admin.from("bank_links").update({
      session_id: sessionId,
      account_uid: uid,
      iban,
      status: uid ? "active" : "error",
      last_sync: null,
      updated_at: new Date().toISOString(),
    }).eq("id", link.id);

    // Si autorizó pero no obtuvimos una cuenta legible, no mentimos con "bank=ok":
    // devolvemos un diagnóstico real (qué claves/conteos trae este banco) para afinar.
    if (!uid) {
      const keys = Object.keys(session || {}).join(",");
      const nAcc = Array.isArray(session.accounts) ? session.accounts.length : -1;
      const nData = Array.isArray(session.accounts_data) ? session.accounts_data.length : -1;
      const detail = `sin cuenta · keys:[${keys}] accounts:${nAcc} data:${nData} sid:${sessionId ? "si" : "no"}`;
      return Response.redirect(`${APP_URL}?bank=error&msg=${encodeURIComponent(detail)}`, 302);
    }

    return Response.redirect(`${APP_URL}?bank=ok`, 302);
  } catch (e) {
    return Response.redirect(`${APP_URL}?bank=error&msg=${encodeURIComponent(String((e as Error)?.message || e))}`, 302);
  }
});
