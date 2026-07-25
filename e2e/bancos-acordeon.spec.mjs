import { test, expect } from "@playwright/test";
import { seedLoggedInDashboard, dismissNews } from "./fixtures.mjs";

/* «Mis bancos» en acordeón (feedback 2026-07-25: «todo apilotonado con 198349123 funciones»).
 *
 * Va con e2e por la lección de la 4.7.1 (AGENTS §7): esconder o mover elementos de una lista es
 * exactamente el tipo de cambio que `npm test` no ve —la sintaxis y la lógica siguen perfectas—
 * y que hace desaparecer botones sin que se entere nadie. Aquí lo que hay que blindar es que
 * plegar NO deja al usuario sin forma de reconectar un banco caído, que sería cambiar un coñazo
 * por un callejón sin salida.
 */

const links = [
  { aspsp_name: "Sabadell", aspsp_country: "ES", iban: "ES11", status: "active",
    valid_until: "2026-10-01T00:00:00Z", last_sync: "2026-07-25T09:00:00Z", accounts: [{ uid: "a1" }] },
  { aspsp_name: "CaixaBank", aspsp_country: "ES", iban: "ES22", status: "expired",
    valid_until: "2026-07-01T00:00:00Z", last_sync: "2026-07-01T09:00:00Z", accounts: [{ uid: "a2" }] },
  { aspsp_name: "Revolut", aspsp_country: "ES", iban: "ES33", status: "active",
    valid_until: "2026-11-01T00:00:00Z", last_sync: "2026-07-24T09:00:00Z", accounts: [{ uid: "a3" }] },
];

async function abrirMisBancos(page) {
  await seedLoggedInDashboard(page, { __cloudRows: { bank_links: links }, hasBankLink: true });
  await page.goto("/");
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 15_000 });
  await dismissNews(page);
  // Misma puerta que usa la app de verdad para llevarte a «Mis bancos» (el banner de Cartera y
  // la noti de banco caído disparan este evento). Con focus:null, que es el caso normal — con un
  // banco enfocado el acordeón lo abre a propósito, y eso se prueba aparte.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("mc-open-banks", { detail: { focus: null } })));
  await expect(page.locator("[data-aspsp]")).toHaveCount(links.length, { timeout: 10_000 });
}

test("Mis bancos: los tres bancos salen, pero SIN el muro de botones", async ({ page }) => {
  await abrirMisBancos(page);

  // Los tres bancos siguen ahí: plegar no puede hacer desaparecer una lista (bug 4.7.1).
  await expect(page.locator("[data-aspsp]")).toHaveCount(3);
  await expect(page.getByText("Sabadell", { exact: false }).first()).toBeVisible();
  await expect(page.getByText("CaixaBank", { exact: false }).first()).toBeVisible();

  // Antes se pintaban 3 botones por banco (9 en total) de salida. Ahora, ninguno.
  await expect(page.locator("[data-aspsp] .bk-actions")).toHaveCount(0);

  // El ESTADO sigue visible con todo plegado: es lo que avisa de que un banco está caído,
  // y esconderlo sería cambiar ruido por ceguera.
  const caixa = page.locator('[data-aspsp="CaixaBank"]');
  await expect(caixa).toContainText(/caduc|renov|permiso/i);
});

test("Mis bancos: tocar un banco abre SUS acciones, y abrir otro cierra el primero", async ({ page }) => {
  await abrirMisBancos(page);

  const sabadell = page.locator('[data-aspsp="Sabadell"]');
  const caixa = page.locator('[data-aspsp="CaixaBank"]');

  await sabadell.locator(".v4-mov").click();
  await expect(sabadell.locator(".bk-actions")).toHaveCount(1);
  await expect(sabadell.locator(".v4-mov")).toHaveAttribute("aria-expanded", "true");
  // Solo el suyo: el sentido del acordeón es que no vuelvan los 9 botones a la vez.
  await expect(page.locator("[data-aspsp] .bk-actions")).toHaveCount(1);

  await caixa.locator(".v4-mov").click();
  await expect(caixa.locator(".bk-actions")).toHaveCount(1);
  await expect(sabadell.locator(".bk-actions")).toHaveCount(0);
  await expect(page.locator("[data-aspsp] .bk-actions")).toHaveCount(1);

  // Volver a tocarlo lo pliega.
  await caixa.locator(".v4-mov").click();
  await expect(page.locator("[data-aspsp] .bk-actions")).toHaveCount(0);
});

test("Mis bancos: el banco caído sigue teniendo su botón de reconectar a un toque", async ({ page }) => {
  await abrirMisBancos(page);
  const caixa = page.locator('[data-aspsp="CaixaBank"]');
  await caixa.locator(".v4-mov").click();
  // Lo que NO se puede perder al plegar: la salida para arreglar el banco.
  await expect(caixa.locator(".bk-actions button").filter({ hasText: /reconectar|volver a conectar|reintentar/i }))
    .toHaveCount(1);
});
