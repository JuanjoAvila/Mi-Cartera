// ============================================================
// Edge Function: bank-sync  (verify_jwt = true)
// La llama la app (usuario logueado). Trae SALDO + MOVIMIENTOS de los bancos
// enlazados del usuario.
//
// CAPA 1 (ahora): DRY-RUN — devuelve los datos como JSON, NO escribe nada.
// CAPA 2/3 (después): usaremos esto para el saldo y, con cuidado, los gastos.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS, ebApi, ebConfig, jsonResp, makeJWT, mapTransaction } from "../_shared/enablebanking.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const supa = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return jsonResp({ ok: false, error: "sin sesión" }, 401);

    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: links } = await admin
      .from("bank_links").select("*")
      .eq("user_id", user.id).eq("status", "active");

    const { appId, pem } = ebConfig();
    const jwt = await makeJWT(appId, pem);

    const out: unknown[] = [];
    for (const link of links || []) {
      const uid = link.account_uid;
      if (!uid) continue;
      const bal = await ebApi(jwt, `/accounts/${uid}/balances`);
      const tx = await ebApi(jwt, `/accounts/${uid}/transactions`);

      // deno-lint-ignore no-explicit-any
      const balances = (bal.balances || []).map((b: any) => ({
        type: b.balance_type || b.name || "",
        amount: Number(b?.balance_amount?.amount || 0),
        currency: b?.balance_amount?.currency || "",
      }));
      // deno-lint-ignore no-explicit-any
      const transactions = (tx.transactions || []).map((t: any) => mapTransaction(t));

      await admin.from("bank_links").update({ last_sync: new Date().toISOString() }).eq("id", link.id);

      out.push({
        aspsp: link.aspsp_name,
        iban: link.iban,
        balances,
        count: transactions.length,
        transactions,
      });
    }

    return jsonResp({ ok: true, dryRun: true, links: out });
  } catch (e) {
    return jsonResp({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});
