/* Tutorial de gestos en Ajustes (petición 2026-08-03: «no son obvios para alguien nuevo»).
 * Mismo mecanismo que TabCoach (10-app-components.js): la PRIMERA vez que se abre Ajustes sale
 * una tarjeta desplegada (.coach-card) con los gestos; al cerrarla con «¡Entendido!» se pliega a
 * un botoncito reabrible (.coach-pill) y ese estado se recuerda en localStorage (_coach_gestos)
 * — la segunda vez que se abre Ajustes ya no vuelve a salir desplegada sola. */
import { test, expect } from "@playwright/test";
import { seedLoggedInDashboard, dismissNews } from "./fixtures.mjs";

async function abrirAjustes(page) {
  await page.locator(".v4-avatar").click();
  await expect(page.locator(".profile-pull.open")).toBeVisible({ timeout: 5_000 });
  await page.getByRole("button", { name: /Ir a Ajustes|Go to Settings|Ves a Ajustos/i }).click();
  await expect(page.locator(".settings-push.open")).toBeVisible({ timeout: 5_000 });
}

test("primera vez en Ajustes: la tarjeta de gestos sale desplegada y se puede plegar", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.goto("/");
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => !document.getElementById("mc-load"), null, { timeout: 30_000 });
  await dismissNews(page);

  await abrirAjustes(page);

  const tarjeta = page.locator(".settings-push.open .coach-card");
  await expect(tarjeta).toBeVisible();
  await expect(tarjeta).toContainText(/Cómo (moverte con gestos|van els gestos)|How to move around with gestures/i);
  // Sin pill mientras la tarjeta está desplegada.
  await expect(page.locator(".settings-push.open .coach-pill")).toHaveCount(0);

  await tarjeta.getByRole("button", { name: /¡Genial, gracias!|Nice, thanks!|Genial, gràcies!/i }).click();

  await expect(page.locator(".settings-push.open .coach-card")).toHaveCount(0);
  const pill = page.locator(".settings-push.open .coach-pill");
  await expect(pill).toBeVisible();
  await expect(pill).toContainText(/¿Cómo van los gestos\?|How do the gestures work\?|Com van els gestos\?/i);

  const marcado = await page.evaluate(() => localStorage.getItem("_coach_gestos"));
  expect(marcado).toBe("1");
});

test("segunda vez en Ajustes (ya visto): sale plegada, y el botoncito la vuelve a abrir", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.addInitScript(() => localStorage.setItem("_coach_gestos", "1"));
  await page.goto("/");
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => !document.getElementById("mc-load"), null, { timeout: 30_000 });
  await dismissNews(page);

  await abrirAjustes(page);

  // Ya marcada como vista: arranca plegada, no desplegada.
  await expect(page.locator(".settings-push.open .coach-card")).toHaveCount(0);
  const pill = page.locator(".settings-push.open .coach-pill");
  await expect(pill).toBeVisible();

  await pill.click();
  await expect(page.locator(".settings-push.open .coach-card")).toBeVisible();
});
