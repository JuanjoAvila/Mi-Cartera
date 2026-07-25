import { test, expect } from "@playwright/test";
import { seedLoggedInDashboard, dismissNews } from "./fixtures.mjs";

/* Brókers: los eliges tú, y sus tarjetas se pliegan (feedback 2026-07-25).
 *
 * Dos quejas distintas del usuario, las dos aquí:
 *   1. «Que te salgan directamente para loguear sin tenerlo es muy raro — ni mi pareja ni mi
 *      padre tienen MyInvestor y les sale». Las tres tarjetas se pintaban SIEMPRE.
 *   2. «El colapsable de los brókers tampoco está»: el acordeón solo se hizo para los bancos de
 *      Open Banking, y los brókers seguían con todo desplegado.
 *
 * Va con e2e por la lección de la 4.7.1 (AGENTS §7): esto es render derivado del estado, que es
 * exactamente lo que `npm test` no ve. Y lo crítico que hay que blindar es que el filtrado NO
 * deje a alguien sin poder conectar un bróker que sí usa.
 */

async function abrirBancos(page, overrides) {
  await seedLoggedInDashboard(page, overrides);
  await page.goto("/");
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 15_000 });
  await dismissNews(page);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("mc-open-banks", { detail: { focus: null } })));
  await expect(page.locator(".bk-sec")).toBeVisible({ timeout: 10_000 });
}

test("sin brókers en cartera no sale NINGUNA tarjeta de login (el caso del padre)", async ({ page }) => {
  await abrirBancos(page, { investments: [] });
  // Los chips para elegir sí están: sin ellos no habría forma de conectar nada.
  await expect(page.getByText(/Qué brókers usas/i)).toBeVisible();
  await expect(page.locator(".bk-card.bk-tr")).toHaveCount(0);
  await expect(page.locator(".bk-card.bk-mi")).toHaveCount(0);
  await expect(page.locator(".bk-card.bk-csv")).toHaveCount(0);
});

test("un bróker que YA usas aparece solo, sin tener que marcarlo", async ({ page }) => {
  // Quien venía usando Trade Republic no puede perderlo de vista por un cambio de UI.
  await abrirBancos(page, {
    investments: [{ id: "i1", ent: "trade_republic", name: "VWCE", ticker: "VWCE", shares: 10, cost: 1000 }],
  });
  await expect(page.locator(".bk-card.bk-tr")).toHaveCount(1);
  await expect(page.locator(".bk-card.bk-mi")).toHaveCount(0);   // MyInvestor no, que no lo usa
});

test("marcar un chip trae su tarjeta; desmarcarlo se la lleva", async ({ page }) => {
  await abrirBancos(page, { investments: [] });
  const chip = page.locator(".v4-chip").filter({ hasText: "MyInvestor" });

  await chip.click();
  await expect(page.locator(".bk-card.bk-mi")).toHaveCount(1);

  await chip.click();
  await expect(page.locator(".bk-card.bk-mi")).toHaveCount(0);
});

test("las tarjetas de bróker nacen plegadas y se abren al tocarlas, de una en una", async ({ page }) => {
  await abrirBancos(page, {
    investments: [
      { id: "i1", ent: "trade_republic", name: "VWCE", ticker: "VWCE", shares: 10, cost: 1000 },
      { id: "i2", ent: "myinvestor", name: "Fondo", ticker: "F1", shares: 5, cost: 500 },
    ],
  });
  const tr = page.locator(".bk-card.bk-tr");
  const mi = page.locator(".bk-card.bk-mi");
  await expect(tr).toHaveCount(1);
  await expect(mi).toHaveCount(1);

  // Plegadas: solo cabecera, sin el cuerpo con formularios y botones.
  await expect(tr.locator(".bk-brand")).toHaveAttribute("aria-expanded", "false");
  await expect(tr.locator(".hint")).toHaveCount(0);

  await tr.locator(".bk-brand").click();
  await expect(tr.locator(".bk-brand")).toHaveAttribute("aria-expanded", "true");
  await expect(tr.locator(".hint").first()).toBeVisible();

  // Acordeón: abrir MyInvestor cierra Trade Republic.
  await mi.locator(".bk-brand").click();
  await expect(mi.locator(".bk-brand")).toHaveAttribute("aria-expanded", "true");
  await expect(tr.locator(".bk-brand")).toHaveAttribute("aria-expanded", "false");
});
