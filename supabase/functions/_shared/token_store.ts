// Helpers para leer/escribir tokens cifrados en myinvestor_links y bank_links.
import { decryptSecret, encryptSecret } from "./crypto.ts";

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

export async function encryptSessionId(sessionId: string | null): Promise<string | null> {
  return encryptSecret(sessionId);
}

export async function decryptSessionId(stored: string | null): Promise<string | null> {
  return decryptSecret(stored);
}
