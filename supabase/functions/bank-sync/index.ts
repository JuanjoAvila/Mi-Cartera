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

    // RESILIENCIA (bug Sabadell): cada banco se sincroniza por separado dentro de su try/catch.
    // Si UNO falla (sesión caducada, banco caído, rate-limit PSD2…) NO tumba a los demás: la app
    // sigue recibiendo los que sí funcionaron y un aviso del que falló. Antes, un solo fallo
    // lanzaba 500 y obligaba a "resincronizar" todo.
    const out: unknown[] = [];
    for (const link of links || []) {
      const uid = link.account_uid;
      if (!uid || typeof uid !== "string") {
        // enlace sin cuenta válida: hay que reconectar este banco (no el resto).
        await admin.from("bank_links")
          .update({ status: "expired", updated_at: new Date().toISOString() })
          .eq("id", link.id);
        out.push({ aspsp: link.aspsp_name, iban: link.iban, ok: false, expired: true, error: "cuenta sin uid · reconecta", balances: [], count: 0, transactions: [] });
        continue;
      }
      try {
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

        await admin.from("bank_links")
          .update({ last_sync: new Date().toISOString(), status: "active", updated_at: new Date().toISOString() })
          .eq("id", link.id);

        out.push({ aspsp: link.aspsp_name, iban: link.iban, ok: true, balances, count: transactions.length, transactions });
      } catch (err) {
        const msg = String((err as Error)?.message || err);
        // 401/403/404 o "expired/invalid/unauthorized" = el permiso del banco caducó → marca SOLO este enlace
        // para que la app pinte "caducado · reconectar" en ese banco, sin afectar a los demás.
        const expired = /\b40[134]\b|expired|invalid|unauthor/i.test(msg);
        await admin.from("bank_links")
          .update({ status: expired ? "expired" : link.status, updated_at: new Date().toISOString() })
          .eq("id", link.id);
        out.push({ aspsp: link.aspsp_name, iban: link.iban, ok: false, expired, error: msg, balances: [], count: 0, transactions: [] });
      }
    }

    const anyOk = out.some((l) => (l as { ok?: boolean }).ok);
    return jsonResp({ ok: true, dryRun: true, anyOk, links: out });
  } catch (e) {
    return jsonResp({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});
