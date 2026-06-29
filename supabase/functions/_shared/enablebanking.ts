// ============================================================
// Shared: cliente de Enable Banking (Open Banking PSD2).
// Firma JWT RS256 con la clave privada de la app (secreto del servidor) y
// llama a la API. Portado del spike validado con Sabadell real.
//
// Secretos del proyecto (Dashboard → Edge Functions → Secrets):
//   EB_APP_ID       — Application ID de Enable Banking
//   EB_PRIVATE_KEY  — clave privada (PEM o su base64 en una sola línea)
//   EB_REDIRECT_URL — (opcional) URL del callback; por defecto la función bank-callback
//   APP_URL         — (opcional) URL pública de la app para volver tras el login
// ============================================================

const BASE = "https://api.enablebanking.com";
const enc = new TextEncoder();

function b64urlBytes(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
const b64urlStr = (s: string) => b64urlBytes(enc.encode(s));

// Acepta PEM (multi o una línea) o base64 pelado del PKCS#8 → ArrayBuffer DER.
function keyToDer(raw: string): ArrayBuffer {
  const b64 = raw
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

export function ebConfig() {
  const appId = Deno.env.get("EB_APP_ID");
  const pem = Deno.env.get("EB_PRIVATE_KEY");
  if (!appId || !pem) throw new Error("Faltan secretos EB_APP_ID / EB_PRIVATE_KEY");
  return { appId, pem };
}

export async function makeJWT(appId: string, pem: string): Promise<string> {
  const header = { typ: "JWT", alg: "RS256", kid: appId };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: "enablebanking.com", aud: "api.enablebanking.com", iat: now, exp: now + 3600 };
  const data = `${b64urlStr(JSON.stringify(header))}.${b64urlStr(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyToDer(pem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(data));
  return `${data}.${b64urlBytes(new Uint8Array(sig))}`;
}

// deno-lint-ignore no-explicit-any
export async function ebApi(jwt: string, path: string, init: { method?: string; body?: unknown } = {}): Promise<any> {
  const res = await fetch(BASE + path, {
    method: init.method || "GET",
    headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  // deno-lint-ignore no-explicit-any
  let data: any;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`EB ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  return data;
}

// Mapea un movimiento de Enable Banking al formato de la app.
// Convención del cliente: amount POSITIVO = gasto, NEGATIVO = ingreso.
// deno-lint-ignore no-explicit-any
export function mapTransaction(t: any) {
  const amt = Number(t?.transaction_amount?.amount || 0);
  const isCredit = t?.credit_debit_indicator === "CRDT";
  const remit = Array.isArray(t?.remittance_information)
    ? t.remittance_information.join(" ")
    : (t?.remittance_information || "");
  const merchant = (isCredit ? t?.debtor?.name : t?.creditor?.name) || remit || "Movimiento";
  const haystack = `${remit} ${t?.creditor?.name || ""} ${t?.debtor?.name || ""} ${t?.bank_transaction_code?.description || ""}`;
  return {
    ext_id: t?.entry_reference || null,            // id único del banco (dedup robusto en Capa 3)
    date: String(t?.booking_date || t?.value_date || "").slice(0, 10),
    amount: isCredit ? -amt : amt,
    merchant: String(merchant).trim().slice(0, 80),
    card: /TARJ|TARJETA|COMPRA TARJ/i.test(haystack),  // best-effort: compra con tarjeta
    status: t?.status || "",
  };
}

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function jsonResp(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
