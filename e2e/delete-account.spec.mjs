import { test, expect } from "@playwright/test";
import { seedLoggedInDashboard } from "./fixtures.mjs";

test("Ajustes: borrar cuenta pide confirmación", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.goto("/");
  await expect(page.locator(".tabbar")).toBeVisible({ timeout: 15_000 });

  const dismissNews = page.getByRole("button", { name: /Entendido|Got it/i });
  if (await dismissNews.count()) await dismissNews.first().click();

  await page.locator('button[title="Ajustes"]').click();
  await expect(page.locator(".drawer-panel.open, .drawer-panel")).toBeVisible({ timeout: 5_000 });

  await page.getByRole("button", { name: /Tu cuenta|Your account|El teu compte/i }).click();

  const del = page.getByText(/Borrar mi cuenta|Delete my account|Esborrar el meu compte/i);
  await del.scrollIntoViewIfNeeded();
  await del.click();

  const confirm = page.getByText(/Sí, borrar todo|Yes, delete everything|Sí, esborrar tot/i);
  await expect(confirm).toBeVisible({ timeout: 5_000 });
});
