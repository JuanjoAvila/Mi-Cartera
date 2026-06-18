// ============================================================
// Edge Function: prices
// Proxy de cotizaciones Finnhub. La API key vive como secreto del proyecto
// (FINNHUB_KEY), nunca en el cliente. Reemplaza a doGetPrices del Apps Script.
// La llama la app con el JWT del usuario (verify_jwt = true en config.toml).
// ============================================================

const TICKERS = ["NVDA", "GOOG", "TSM", "AVGO", "MU", "AMD"];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const key = Deno.env.get("FINNHUB_KEY");
  if (!key) return json({ ok: false, error: "FINNHUB_KEY no configurada en el proyecto" }, 500);

  const prices: Record<string, number> = {};
  const errors: Array<Record<string, unknown>> = [];

  for (const sym of TICKERS) {
    try {
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${key}`);
      const body = await res.text();
      const data = JSON.parse(body);
      if (typeof data.c === "number" && data.c > 0) prices[sym] = data.c; // c = precio actual
      else errors.push({ sym, status: res.status, body: body.slice(0, 200) });
    } catch (e) {
      errors.push({ sym, status: "exception", body: String(e).slice(0, 200) });
    }
    await new Promise((r) => setTimeout(r, 120)); // respeta el rate limit de Finnhub
  }

  const out: Record<string, unknown> = { ok: true, prices, ts: Date.now() };
  if (errors.length) out.errors = errors; // diagnóstico: aparece solo si algún ticker no cotizó
  return json(out, 200);
});

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
