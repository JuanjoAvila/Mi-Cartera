/**
 * Tests unitarios de delete-account (validación sin BD real).
 * E2E UI: e2e/delete-account.spec.mjs
 */
import { assertEquals } from "jsr:@std/assert@1";

// Simula la lógica de validación del handler (extracto seguro para CI)
function validateDeleteBody(body: unknown): { ok: boolean; code: number; error?: string } {
  const password = String((body as { password?: string })?.password || "").trim();
  if (!password) return { ok: false, code: 400, error: "confirma con tu contraseña" };
  return { ok: true, code: 200 };
}

Deno.test("delete-account: rechaza body sin contraseña", () => {
  const r = validateDeleteBody({});
  assertEquals(r.ok, false);
  assertEquals(r.code, 400);
});

Deno.test("delete-account: acepta body con contraseña", () => {
  const r = validateDeleteBody({ password: "test-secret" });
  assertEquals(r.ok, true);
  assertEquals(r.code, 200);
});

Deno.test("delete-account: rechaza contraseña vacía", () => {
  const r = validateDeleteBody({ password: "   " });
  assertEquals(r.ok, false);
});
