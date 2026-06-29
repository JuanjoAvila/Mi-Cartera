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
  try {
    if (!code || !state) throw new Error("faltan code/state");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: link } = await admin.from("bank_links").select("*").eq("state", state).maybeSingle();
    if (!link) throw new Error("state desconocido");

    const { appId, pem } = ebConfig();
    const jwt = await makeJWT(appId, pem);
    const session = await ebApi(jwt, "/sessions", { method: "POST", body: { code } });

    const accounts = session.accounts || [];
    const acc = accounts[0] || {};
    const uid = acc.uid || acc.account_id || acc.id || null;
    const iban = (acc.account_id && acc.account_id.iban) || acc.iban || null;

    await admin.from("bank_links").update({
      session_id: session.session_id || null,
      account_uid: uid,
      iban,
      status: uid ? "active" : "error",
      last_sync: null,
      updated_at: new Date().toISOString(),
    }).eq("id", link.id);

    return Response.redirect(`${APP_URL}?bank=ok`, 302);
  } catch (e) {
    return Response.redirect(`${APP_URL}?bank=error&msg=${encodeURIComponent(String((e as Error)?.message || e))}`, 302);
  }
});
