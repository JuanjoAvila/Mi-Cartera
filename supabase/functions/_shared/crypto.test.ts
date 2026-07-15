import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { decryptSecret, encryptSecret } from "./crypto.ts";

Deno.test("crypto: round-trip con clave de prueba", async () => {
  const key = crypto.getRandomValues(new Uint8Array(32));
  let s = "";
  for (let i = 0; i < key.length; i++) s += String.fromCharCode(key[i]);
  Deno.env.set("TOKEN_ENCRYPTION_KEY", btoa(s));

  const plain = "refresh-token-demo-12345";
  const enc = await encryptSecret(plain);
  assertEquals(typeof enc, "string");
  assertEquals(enc!.startsWith("enc:v1:"), true);
  const dec = await decryptSecret(enc);
  assertEquals(dec, plain);
});

Deno.test("crypto: plaintext legacy sin prefijo", async () => {
  Deno.env.delete("TOKEN_ENCRYPTION_KEY");
  const legacy = "access-plaintext-legacy";
  assertEquals(await decryptSecret(legacy), legacy);
});
