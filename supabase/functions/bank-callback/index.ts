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

    // Extracción robusta de la cuenta autorizada. Enable Banking devuelve `accounts` como
    // lista de objetos {uid, account_id:{iban}}, pero según banco/versión puede venir como
    // string (uid pelado) o con la cuenta sin uid. Buscamos la PRIMERA cuenta con uid usable
    // en vez de coger ciegamente accounts[0] (que para algunos bancos no traía uid → status
    // 'error' → la app lo pintaba como "caducado").
    // deno-lint-ignore no-explicit-any
    const accounts: any[] = Array.isArray(session.accounts) ? session.accounts : [];
    // deno-lint-ignore no-explicit-any
    const uidOf = (a: any): string | null =>
      (typeof a === "string" ? a : (a?.uid || a?.account_id?.uid || a?.id || null)) || null;
    // deno-lint-ignore no-explicit-any
    const ibanOf = (a: any): string | null =>
      (typeof a === "string" ? null : (a?.account_id?.iban || a?.iban || null)) || null;
    const acc = accounts.find((a) => uidOf(a)) || accounts[0] || null;
    const uid = uidOf(acc);
    const iban = ibanOf(acc);

    await admin.from("bank_links").update({
      session_id: session.session_id || null,
      account_uid: uid,
      iban,
      status: uid ? "active" : "error",
      last_sync: null,
      updated_at: new Date().toISOString(),
    }).eq("id", link.id);

    // Si autorizó pero no obtuvimos una cuenta legible, no mentimos con "bank=ok":
    // devolvemos error con detalle para que la app lo muestre y el usuario reintente.
    if (!uid) {
      const detail = `sin cuenta utilizable (recibidas: ${accounts.length})`;
      return Response.redirect(`${APP_URL}?bank=error&msg=${encodeURIComponent(detail)}`, 302);
    }

    return Response.redirect(`${APP_URL}?bank=ok`, 302);
  } catch (e) {
    return Response.redirect(`${APP_URL}?bank=error&msg=${encodeURIComponent(String((e as Error)?.message || e))}`, 302);
  }
});
