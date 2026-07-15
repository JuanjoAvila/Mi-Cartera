// ============================================================
// Cifrado simétrico de secretos en reposo (tokens bancarios / MyInvestor).
// AES-256-GCM con clave en TOKEN_ENCRYPTION_KEY (32 bytes, base64).
// Formato almacenado: enc:v1:<base64(iv(12) + ciphertext+tag)>
// Retrocompat: valores sin prefijo se tratan como plaintext (migración gradual).
// ============================================================

const PREFIX = "enc:v1:";

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

async function loadKey(): Promise<CryptoKey | null> {
  const keyB64 = Deno.env.get("TOKEN_ENCRYPTION_KEY");
  if (!keyB64) return null;
  const raw = b64ToBytes(keyB64);
  if (raw.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY debe ser 32 bytes en base64");
  const keyBytes = new Uint8Array(raw);
  return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(plaintext: string | null | undefined): Promise<string | null> {
  if (plaintext == null || plaintext === "") return plaintext ?? null;
  if (plaintext.startsWith(PREFIX)) return plaintext;
  const key = await loadKey();
  if (!key) return plaintext;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  const combined = new Uint8Array(iv.length + enc.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(enc), iv.length);
  return PREFIX + bytesToB64(combined);
}

export async function decryptSecret(stored: string | null | undefined): Promise<string | null> {
  if (stored == null || stored === "") return stored ?? null;
  if (!stored.startsWith(PREFIX)) return stored;
  const key = await loadKey();
  if (!key) throw new Error("TOKEN_ENCRYPTION_KEY requerida para descifrar secretos");
  const combined = b64ToBytes(stored.slice(PREFIX.length));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(dec);
}
