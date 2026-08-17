import { test, expect } from "@playwright/test";
import { seedLoggedInDashboard, dismissNews } from "./fixtures.mjs";

/* Filtro por defecto = TODOS los bancos marcados como gasto diario, no solo el principal
   (2026-08-17). Él tiene Revolut + Trade Republic y solo veía TR. El presupuesto ya sumaba
   los dos (`expenseBankEnts`); la lista de Gastos arrancaba con `accDaily` a solas. */

const d = (n) => new Date(Date.now() - n * 86400000).toISOString();

const accounts = [
  { id: "tr", ent: "trade_republic", name: "Efectivo", value: 6300, role: "diario", spendFrom: true },
  { id: "rv", ent: "revolut", name: "Revolut", value: 800, role: "fijos" },
  { id: "sb", ent: "sabadell", name: "Cuenta", value: 2000, role: "fijos" },
];
const settings = { autoPrices: false, theme: "green", expenseBanks: ["trade_republic", "revolut"] };
const expenses = [
  { id: "e1", date: d(1), amount: 12, merchant: "Mercadona TR", category: "super", source: "ob", ent: "trade_republic" },
  { id: "e2", date: d(1), amount: 8, merchant: "Cafe Revolut", category: "bares", source: "ob", ent: "revolut" },
  { id: "e3", date: d(1), amount: 50, merchant: "Aporte TR", category: "inversion", source: "ob", ent: "trade_republic" },
  { id: "e4", date: d(1), amount: 80, merchant: "RECIBO LUZ", category: "energia", source: "ob", ent: "sabadell" },
];

const lista = (page) => page.locator(".v4-gastos-list-body button.v4-mov");
const fila = (page, nombre) => lista(page).filter({ hasText: nombre });

test.use({ viewport: { width: 375, height: 812 } });

test("por defecto salen todos los de gasto diario; Sabadell no, y una inversión no cuenta", async ({ page }) => {
  await seedLoggedInDashboard(page, { accounts, settings, expenses, budget: 1000 });
  await page.goto("/");
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 15_000 });
  await dismissNews(page);
  await page.locator('.botnav-tab[data-tour="gastos"]').click();

  // SIN pulsar «Todos los bancos»: si el filtro siguiera anclado solo a TR, Cafe Revolut no saldría.
  await expect(fila(page, "Mercadona TR")).toHaveCount(1);
  await expect(fila(page, "Cafe Revolut")).toHaveCount(1);
  await expect(fila(page, "Aporte TR")).toHaveCount(1);
  await expect(fila(page, "RECIBO LUZ")).toHaveCount(0);

  await expect(fila(page, "Cafe Revolut")).not.toHaveClass(/v4-mov-skip/);
  await expect(fila(page, "Aporte TR")).toHaveClass(/v4-mov-skip/);
  await expect(fila(page, "Aporte TR")).toContainText("no es un gasto");
});
