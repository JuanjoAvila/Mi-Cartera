// ============================================================
// Edge Function: prices
// Cotizaciones server-side (key oculta, sin CORS). Reemplaza a doGetPrices del Apps Script.
// - Recibe {symbols:[...]} (POST) o ?symbols=A,B — los tickers reales de la cartera del
//   usuario. Antes estaba CLAVADA a 6 símbolos fijos: cualquier valor nuevo se quedaba sin
//   precio para siempre (feedback 2026-07-13, import de Revolut).
// - Acciones US: Finnhub (FINNHUB_KEY). Lo que Finnhub gratis no cubre (ETF Xetra, oro):
//   Yahoo Finance sin key, también como fallback genérico.
// Devuelve un mapa { TICKER_APP: precio }.
// ============================================================

// compat: clientes viejos que llaman sin body reciben lo de siempre
const DEFAULT_SYMS = ["NVDA", "GOOG", "TSM", "AVGO", "MU", "AMD", "VWCE", "GOLD"];
// clave usada en la app -> símbolo en Yahoo Finance (GC=F ≈ oro spot USD/onza; Revolut
// llama XAU al oro y la app histórica GOLD — las dos apuntan al mismo sitio)
const YAHOO: Record<string, string> = { VWCE: "VWCE.DE", GOLD: "GC=F", XAU: "GC=F" };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fromFinnhub(sym: string, key: string): Promise<number | null> {
  const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${key}`);
  const data = JSON.parse(await res.text());
  return (typeof data.c === "number" && data.c > 0) ? data.c : null;
}

async function fromYahoo(ySym: string): Promise<number | null> {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=1d&range=1d`,
    { headers: { "User-Agent": "Mozilla/5.0" } },
  );
  const data = JSON.parse(await res.text());
  const p = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
  return (typeof p === "number" && p > 0) ? p : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  let syms: string[] = [];
  try {
    if (req.method === "POST") {
      const b = await req.json();
      if (b && Array.isArray(b.symbols)) syms = b.symbols;
    }
  } catch (_e) { /* sin body o no-JSON → defaults */ }
  if (!syms.length) {
    const q = new URL(req.url).searchParams.get("symbols");
    if (q) syms = q.split(",");
  }
  syms = [...new Set(
    syms.map((s) => String(s).trim().toUpperCase()).filter((s) => /^[A-Z0-9.=\-]{1,12}$/.test(s)),
  )].slice(0, 25);
  if (!syms.length) syms = DEFAULT_SYMS;

  const key = Deno.env.get("FINNHUB_KEY");
  const prices: Record<string, number> = {};
  const errors: Array<Record<string, unknown>> = [];

  for (const sym of syms) {
    try {
      if (YAHOO[sym]) {
        const p = await fromYahoo(YAHOO[sym]);
        if (p) prices[sym] = p;
        else errors.push({ sym, via: "yahoo:" + YAHOO[sym] });
        continue;
      }
      let p = key ? await fromFinnhub(sym, key) : null;
      if (p == null) p = await fromYahoo(sym); // fallback: lo que Finnhub gratis no cubra
      if (p) prices[sym] = p;
      else errors.push({ sym, via: key ? "finnhub+yahoo" : "yahoo (sin FINNHUB_KEY)" });
      if (key) await new Promise((r) => setTimeout(r, 120)); // rate limit del tier gratis
    } catch (e) {
      errors.push({ sym, status: "exception", body: String(e).slice(0, 150) });
    }
  }

  const out: Record<string, unknown> = { ok: true, prices: prices, ts: Date.now() };
  if (errors.length) out.errors = errors;
  return json(out, 200);
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
