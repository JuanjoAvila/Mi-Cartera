// Helpers para leer/escribir tokens cifrados en myinvestor_links y bank_links.
import { decryptSecret, encryptSecret } from "./crypto.ts";

const ENC_PREFIX = "enc:v1:";

export function isEncrypted(stored: string | null | undefined): boolean {
  return !!stored && stored.startsWith(ENC_PREFIX);
}

export async function miTokensFromRow(link: {
  access_token?: string | null;
  refresh_token?: string | null;
  device_id?: string | null;
}): Promise<{ access: string | null; refresh: string | null; deviceId: string | null }> {
  return {
    access: await decryptSecret(link.access_token ?? null),
    refresh: await decryptSecret(link.refresh_token ?? null),
    deviceId: link.device_id ?? null,
  };
}

export async function miTokensToRow(access: string, refresh: string | null): Promise<{
  access_token: string | null;
  refresh_token: string | null;
}> {
  return {
    access_token: await encryptSecret(access),
    refresh_token: refresh ? await encryptSecret(refresh) : null,
  };
}

/** Tras activar TOKEN_ENCRYPTION_KEY: re-cifra filas legacy en plaintext (best-effort). */
export async function ensureMiLinkEncrypted(
  // deno-lint-ignore no-explicit-any
  admin: any,
  userId: string,
  link: { access_token?: string | null; refresh_token?: string | null },
): Promise<void> {
  if (!Deno.env.get("TOKEN_ENCRYPTION_KEY")) return;
  const patch: Record<string, string | null> = {};
  if (link.access_token && !isEncrypted(link.access_token)) {
    patch.access_token = await encryptSecret(link.access_token);
  }
  if (link.refresh_token && !isEncrypted(link.refresh_token)) {
    patch.refresh_token = await encryptSecret(link.refresh_token);
  }
  if (Object.keys(patch).length) {
    await admin.from("myinvestor_links").update(patch).eq("user_id", userId);
  }
}

export async function encryptSessionId(sessionId: string | null): Promise<string | null> {
  return encryptSecret(sessionId);
}

export async function decryptSessionId(stored: string | null): Promise<string | null> {
  return decryptSecret(stored);
}
