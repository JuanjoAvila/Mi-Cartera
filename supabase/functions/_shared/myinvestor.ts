// ============================================================
// Compartido MyInvestor — base URL, CORS, cabeceras y helpers de la API no oficial.
//
// Endpoints y cabeceras copiados LITERALMENTE del cliente en producción `finanze/finanze`
// (myinvestor_client.py, commit jul-2026). Host: api.myinvestor.es (NO app.myinvestor.es,
// que está muerto tras Incapsula). La API de posiciones NO exige el JS-challenge del WAF;
// solo el login puede pedir reCAPTCHA de forma condicional (SECURITY_001), que aquí no
// resolvemos (se avisa al usuario). Ver [[mi-cartera-escalado]].
// ============================================================

export const MI_BASE = "https://api.myinvestor.es";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function jsonResp(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Cabeceras obligatorias. x-device-id (UUID estable de la sesión) y x-myinvestor-app son
// las dos custom que la API valida. Si algún día empieza a rechazar, subir la versión de
// x-myinvestor-app es lo primero a probar (el server puede deprecar versiones viejas).
export function miHeaders(deviceId: string, token?: string): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Referer": MI_BASE,
    "Origin": MI_BASE,
    "User-Agent": "Mozilla/5.0 (Linux; Android 11; moto g(20)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.74 Mobile Safari/537.36",
    "x-device-id": deviceId,
    // 3.150.0 (2026-07-18): captcha también desde IP residencial — subir la versión declarada
    // es lo primero a probar (ver cabecera). Mantener SIEMPRE igual que miDeviceLogin (cliente).
    "x-myinvestor-app": "version=3.150.0,platform=web",
  };
  if (token) h["Authorization"] = "Bearer " + token;
  return h;
}

// deno-lint-ignore no-explicit-any
export function miPositionsFrom(detail: any): any[] {
  // detail = payload.data de GET /cperf-server/api/v2/securities-accounts/{id}
  const inv = (detail && detail.securitiesAccountInvestments) || {};
  const out: unknown[] = [];
  const num = (v: unknown) => { const n = Number(v); return isFinite(n) ? n : 0; };
  // Fondos indexados y fondos normales
  for (const cat of ["INDEXED_FUND", "FUND"]) {
    // deno-lint-ignore no-explicit-any
    const list: any[] = (inv[cat] && inv[cat].investmentList) || [];
    for (const f of list) {
      const shares = num(f.shares);
      if (!(shares > 0)) continue;
      const nav = num(f.originCurrencyLiquidationValue);
      out.push({
        isin: f.isin || null,
        name: f.investmentName || f.isin || "Fondo",
        shares,
        value: +(nav * shares).toFixed(2),                                  // valor de mercado (calculado)
        cost: +num(f.initialInvestmentCurrency).toFixed(2),                 // coste en divisa del fondo
        cur: f.liquidationValueCurrency || "EUR",
        kind: cat === "INDEXED_FUND" ? "indexed" : "fund",
      });
    }
  }
  // Acciones / ETF (bróker)
  // deno-lint-ignore no-explicit-any
  const broker: any[] = (inv.BROKER && inv.BROKER.investmentList) || [];
  for (const s of broker) {
    const shares = num(s.shares);
    if (!(shares > 0)) continue;
    const nav = num(s.originCurrencyLiquidationValue);
    out.push({
      isin: s.isin || null,
      name: s.investmentName || s.ticker || s.isin || "Valor",
      ticker: s.ticker || null,
      shares,
      value: +(nav * shares).toFixed(2),
      cost: +num(s.initialInvestmentCurrency).toFixed(2),
      cur: s.liquidationValueCurrency || "EUR",
      kind: s.brokerProductType === "RV" ? "stock" : "etf",
    });
  }
  return out;
}
