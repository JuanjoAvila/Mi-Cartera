import { test, expect } from "@playwright/test";
import { seedLoggedInDashboard } from "./fixtures.mjs";

// Táctil real (CDP): el sheet del «+» debe poder cerrarse tirando hacia abajo, igual que la
// ficha de editar gasto (petición 2026-07-18). Y desde 4.2.0 lleva chips de banco.
test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

test("Apuntar (+): chips de banco y cierre tirando hacia abajo", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.goto("/");
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 15_000 });
  const dismissNews = page.getByRole("button", { name: /Entendido|Got it/i });
  if (await dismissNews.count()) await dismissNews.first().click();

  await page.locator(".botnav-fab").click();
  const sheet = page.locator(".v4-sheet");
  await expect(sheet).toBeVisible();

  // Banco del apunte: sale el banco de la cuenta sembrada (Sabadell) + «Sin banco».
  await expect(sheet.getByRole("button", { name: /Sabadell/ })).toBeVisible();
  await expect(sheet.getByRole("button", { name: /Sin banco|No bank|Sense banc/ })).toBeVisible();

  // Tirar hacia abajo desde la zona del importe → el sheet se va (mismo gesto que editar gasto).
  const bb = await sheet.boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const x = Math.round(bb.x + bb.width / 2);
  const y0 = Math.round(bb.y + 24);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: y0 }] });
  for (let i = 1; i <= 6; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y0 + i * 40 }] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(sheet).toHaveCount(0, { timeout: 3_000 });

  // También debe cerrar arrastrando desde el TECLADO numérico (la zona que más se toca).
  await page.locator(".botnav-fab").click();
  await expect(sheet).toBeVisible();
  // Esperar el fin de la animación de entrada (300 ms): medir el teclado a mitad de sheetup
  // da coordenadas fuera del viewport y los toques no llegan (falso negativo del test).
  await page.waitForTimeout(450);
  const keys = await page.locator(".v4-keys").boundingBox();
  const kx = Math.round(keys.x + keys.width / 2);
  const ky = Math.round(keys.y + 10);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: kx, y: ky }] });
  for (let i = 1; i <= 6; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: kx, y: ky + i * 40 }] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(sheet).toHaveCount(0, { timeout: 3_000 });
});

// El sheet «Más…» de períodos en Gastos era el ÚNICO sin swipe-para-cerrar (feedback 2026-07-18,
// «el más de la foto»): ahora usa el mismo patrón que el resto.
test("Gastos › Más… (períodos): cierra tirando hacia abajo", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.goto("/");
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 15_000 });
  const dismissNews = page.getByRole("button", { name: /Entendido|Got it/i });
  if (await dismissNews.count()) await dismissNews.first().click();

  await page.locator('.botnav-tab[data-tour="gastos"]').click();
  await page.getByRole("button", { name: /Más…|More…|Més…/ }).first().click();
  const sheet = page.locator(".v4-sheet");
  await expect(sheet).toBeVisible();
  await page.waitForTimeout(450); // fin de la animación de entrada antes de medir

  const bb = await sheet.boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const x = Math.round(bb.x + bb.width / 2);
  const y0 = Math.round(bb.y + 30);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: y0 }] });
  for (let i = 1; i <= 6; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y0 + i * 40 }] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(sheet).toHaveCount(0, { timeout: 3_000 });
});
