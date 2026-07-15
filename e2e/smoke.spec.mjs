import { test, expect } from "@playwright/test";

test("arranca y muestra la marca", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/Mi cartera/i).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#root")).not.toBeEmpty();
});

test("onboarding o dashboard visible", async ({ page }) => {
  await page.goto("/");
  const onboarding = page.getByText(/Primeros pasos|Bienvenido|Welcome/i);
  const dash = page.locator(".tabbar");
  await expect(onboarding.or(dash)).toBeVisible({ timeout: 15_000 });
});
