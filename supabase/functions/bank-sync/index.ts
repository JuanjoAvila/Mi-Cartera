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

    // IMPORTAR HISTÓRICO (opcional): la app manda { dateFrom:"YYYY-MM-DD" } para traer los
    // movimientos desde esa fecha (tope PSD2 ~90 días). Modo LECTURA PURA: NO toca saldos ni el
    // estado de los enlaces (a diferencia del sync normal). Solo devuelve las transacciones para
    // que la app enseñe un selector "elige qué gastos importar".
    const body = await req.json().catch(() => ({}));
    const dateFrom = (typeof body?.dateFrom === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dateFrom))
      ? body.dateFrom : null;

    // OJO (bug CaixaBank 2026-07-11): también se devuelven los enlaces caducados/rotos, marcados
    // ok:false. Antes solo venían los 'active' → un banco caducado desaparecía del sync, la app
    // reconstruía obAccounts sin él y sus cuentas se ESFUMABAN del patrimonio sin ningún aviso.
    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: allLinks } = await admin
      .from("bank_links").select("*")
      .eq("user_id", user.id).in("status", ["active", "expired", "error"]);
    const links = (allLinks || []).filter((l) => l.status === "active");
    const deadLinks = (allLinks || []).filter((l) => l.status !== "active");

    const { appId, pem } = ebConfig();
    const jwt = await makeJWT(appId, pem);

    if (dateFrom) {
      const hist: unknown[] = [];
      for (const link of links || []) {
        // deno-lint-ignore no-explicit-any
        const acctList: any[] = (Array.isArray(link.accounts) && link.accounts.length)
          ? link.accounts
          : (link.account_uid ? [{ uid: link.account_uid, iban: link.iban, name: null }] : []);
        // deno-lint-ignore no-explicit-any
        const accts: any[] = [];
        for (const ac of acctList) {
          const uid = ac?.uid;
          if (!uid || typeof uid !== "string") continue;
          try {
            // deno-lint-ignore no-explicit-any
            let all: any[] = [];
            let contKey: string | null = null;
            let pages = 0;
            do {
              const qs = `?date_from=${dateFrom}` + (contKey ? `&continuation_key=${encodeURIComponent(contKey)}` : "");
              const tx = await ebApi(jwt, `/accounts/${uid}/transactions${qs}`);
              // deno-lint-ignore no-explicit-any
              all = all.concat((tx.transactions || []).map((t: any) => mapTransaction(t)));
              contKey = tx.continuation_key || null;
              pages++;
            } while (contKey && pages < 12 && all.length < 2000);   // tope duro anti-runaway
            accts.push({ uid, iban: ac.iban || null, name: ac.name || null, ok: true, count: all.length, transactions: all });
          } catch (err) {
            accts.push({ uid, iban: ac.iban || null, ok: false, error: String((err as Error)?.message || err), transactions: [] });
          }
        }
        hist.push({ aspsp: link.aspsp_name, iban: link.iban, accounts: accts });
      }
      return jsonResp({ ok: true, history: true, dateFrom, links: hist });
    }

    // RESILIENCIA (bug Sabadell): cada banco se sincroniza por separado dentro de su try/catch.
    // Si UNO falla (sesión caducada, banco caído, rate-limit PSD2…) NO tumba a los demás: la app
    // sigue recibiendo los que sí funcionaron y un aviso del que falló. Antes, un solo fallo
    // lanzaba 500 y obligaba a "resincronizar" todo.
    const out: unknown[] = [];
    for (const link of links || []) {
      // MULTI-CUENTA: recorre TODAS las cuentas del banco (columna `accounts`); si no la hay
      // (enlaces antiguos), cae a la única `account_uid`. Cada cuenta va en su try/catch para
      // que el fallo de una (o el banco caído) no tumbe a las demás.
      // deno-lint-ignore no-explicit-any
      const acctList: any[] = (Array.isArray(link.accounts) && link.accounts.length)
        ? link.accounts
        : (link.account_uid ? [{ uid: link.account_uid, iban: link.iban, name: null, currency: null }] : []);
      if (!acctList.length) {
        await admin.from("bank_links")
          .update({ status: "expired", updated_at: new Date().toISOString() })
          .eq("id", link.id);
        out.push({ aspsp: link.aspsp_name, iban: link.iban, ok: false, expired: true, error: "cuenta sin uid · reconecta", balances: [], count: 0, transactions: [], accounts: [] });
        continue;
      }
      // deno-lint-ignore no-explicit-any
      const acctOut: any[] = [];
      let anyAcctOk = false, anyExpired = false, lastErr = "";
      for (const ac of acctList) {
        const uid = ac?.uid;
        if (!uid || typeof uid !== "string") continue;
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
          acctOut.push({ uid, iban: ac.iban || null, name: ac.name || null, currency: ac.currency || null, ok: true, balances, count: transactions.length, transactions });
          anyAcctOk = true;
        } catch (err) {
          const msg = String((err as Error)?.message || err);
          // CADUCIDAD REAL vs FALLO TRANSITORIO (feedback 2026-07-17: «se me caen cada dos por
          // tres»). Antes CUALQUIER 403/404 marcaba el enlace 'expired' → reconectar a mano una y
          // otra vez. Pero un 403 de PSD2 casi siempre es rate-limit/anti-abuso momentáneo y un 404
          // un hipo del banco, NO que el consentimiento haya muerto. Igual que el 403 anti-bot de
          // MyInvestor y el 401 momentáneo de TR: NO desconectar por un fallo pasajero.
          // Solo cuenta como caducado un 401 o un mensaje EXPLÍCITO de consentimiento/sesión muerta.
          if (/\b401\b/.test(msg) || /expired|revoked|consent|unauthor|invalid[_ ]?(?:token|session|grant)|session[_ ]?not[_ ]?found/i.test(msg)) {
            anyExpired = true;
          }
          lastErr = msg;
          acctOut.push({ uid, iban: ac.iban || null, name: ac.name || null, currency: ac.currency || null, ok: false, error: msg, balances: [], count: 0, transactions: [] });
        }
      }
      // 401/403/404/"expired" = el permiso del banco caducó → marca SOLO este enlace, sin afectar a los demás.
      if (anyAcctOk) {
        await admin.from("bank_links")
          .update({ last_sync: new Date().toISOString(), status: "active", updated_at: new Date().toISOString() })
          .eq("id", link.id);
      } else {
        await admin.from("bank_links")
          .update({ status: anyExpired ? "expired" : link.status, updated_at: new Date().toISOString() })
          .eq("id", link.id);
      }
      // top-level (balances/transactions/count) = primera cuenta OK: retrocompat con la Capa 2/3 antigua.
      const primary = acctOut.find((a) => a.ok) || acctOut[0] || { balances: [], transactions: [], count: 0 };
      out.push({
        aspsp: link.aspsp_name, iban: link.iban, ok: anyAcctOk, expired: !anyAcctOk && anyExpired,
        error: anyAcctOk ? undefined : lastErr,
        balances: primary.balances, count: primary.count, transactions: primary.transactions,
        accounts: acctOut,
      });
    }

    // Enlaces caducados/rotos: van en la respuesta SIN llamar a Enable Banking (fallaría igual).
    // La app así conserva sus saldos en el patrimonio (marcados rancios) y puede avisar «reconecta».
    for (const link of deadLinks) {
      out.push({
        aspsp: link.aspsp_name, iban: link.iban, ok: false, skipped: true,
        expired: link.status === "expired", noacct: link.status === "error",
        error: "enlace " + link.status + " · reconecta",
        balances: [], count: 0, transactions: [], accounts: [],
      });
    }

    const anyOk = out.some((l) => (l as { ok?: boolean }).ok);
    return jsonResp({ ok: true, dryRun: true, anyOk, links: out });
  } catch (e) {
    return jsonResp({ ok: false, error: String((e as Error)?.message || e) }, 500);
  }
});
