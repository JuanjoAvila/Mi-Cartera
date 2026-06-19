// ============================================================
// Edge Function: prices
// Cotizaciones server-side (key oculta, sin CORS). Reemplaza a doGetPrices del Apps Script.
// - Acciones US: Finnhub (FINNHUB_KEY).
// - ETF europeo (FTSE All-World / VWCE) y oro (XAU): Yahoo Finance (no necesita key;
//   Finnhub gratis no cubre Xetra ni materias). Devuelve un mapa { TICKER_APP: precio }.
// ============================================================

const FINNHUB = ["NVDA", "GOOG", "TSM", "AVGO", "MU", "AMD"];
// clave usada en la app -> símbolo en Yahoo Finance
const YAHOO: Record<string, string> = { VWCE: "VWCE.DE", GOLD: "GC=F" };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const prices: Record<string, number> = {};
  const errors: Array<Record<string, unknown>> = [];

  // --- Acciones US vía Finnhub ---
  const key = Deno.env.get("FINNHUB_KEY");
  if (key) {
    for (const sym of FINNHUB) {
      try {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${key}`);
        const body = await res.text();
        const data = JSON.parse(body);
        if (typeof data.c === "number" && data.c > 0) prices[sym] = data.c;
        else errors.push({ sym, status: res.status, body: body.slice(0, 150) });
      } catch (e) {
        errors.push({ sym, status: "exception", body: String(e).slice(0, 150) });
      }
      await new Promise((r) => setTimeout(r, 120));
    }
  } else {
    errors.push({ finnhub: "FINNHUB_KEY no configurada" });
  }

  // --- ETF europeo + oro vía Yahoo Finance ---
  for (const appKey of Object.keys(YAHOO)) {
    const ySym = YAHOO[appKey];
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=1d&range=1d`,
        { headers: { "User-Agent": "Mozilla/5.0" } },
      );
      const body = await res.text();
      const data = JSON.parse(body);
      const p = data && data.chart && data.chart.result && data.chart.result[0] &&
        data.chart.result[0].meta && data.chart.result[0].meta.regularMarketPrice;
      if (typeof p === "number" && p > 0) prices[appKey] = p;
      else errors.push({ sym: appKey, status: res.status, body: body.slice(0, 150) });
    } catch (e) {
      errors.push({ sym: appKey, status: "exception", body: String(e).slice(0, 150) });
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
