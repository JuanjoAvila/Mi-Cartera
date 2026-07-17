import { test, expect } from "@playwright/test";
import { seedLoggedInDashboard } from "./fixtures.mjs";

// Móvil + táctil: el gesto del perfil es touch-only (onTouchStart/Move/End).
// Alto 1800: el contenido del perfil (~1680px) debe CABER sin scroll — si hay scroll, al top
// tirar abajo cierra; con scrollTop>0 el gesto cede al scroll (comportamiento correcto).
test.use({ viewport: { width: 375, height: 1800 }, hasTouch: true });

// Perfil tipo Revolut (v4.0.11): el panel ENTERO escala desde el avatar (vídeo 2026-07-17).
// Se comprueba lo que NO se ve leyendo el código: que el origin queda anclado al avatar real,
// que el open llega a scale(1) y que al cerrar vuelve a la miniatura escondida.
test("Perfil: escala desde el avatar y vuelve a él al cerrar", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.goto("/");
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 15_000 });
  const dismissNews = page.getByRole("button", { name: /Entendido|Got it/i });
  if (await dismissNews.count()) await dismissNews.first().click();

  // Cerrado: miniatura invisible (scale s0, opacity 0) que no roba toques.
  const panel = page.locator(".profile-pull");
  await expect(panel).toHaveCSS("visibility", "hidden");

  await page.locator(".v4-avatar").click();
  await expect(panel).toHaveClass(/open/, { timeout: 5_000 });

  // El origin se midió sobre el avatar REAL: |origin.x − centro del avatar| < 2 px.
  const av = await page.locator(".v4-avatar").boundingBox();
  const origin = await panel.evaluate((el) => ({
    ox: parseFloat(el.style.getPropertyValue("--pp-ox")),
    oy: parseFloat(el.style.getPropertyValue("--pp-oy")),
    s0: parseFloat(el.style.getPropertyValue("--pp-s0")),
    left: el.offsetLeft, width: el.offsetWidth,
  }));
  expect(Math.abs(origin.ox + origin.left - (av.x + av.width / 2))).toBeLessThan(2);
  expect(Math.abs(origin.s0 - av.width / origin.width)).toBeLessThan(0.02);

  // Abierto del todo: la transición debe llegar a scale(1) y el blur del fondo a opacidad 1.
  await expect(panel).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)", { timeout: 3_000 });
  await expect(page.locator(".profile-dim-layer")).toHaveCSS("opacity", "1", { timeout: 3_000 });

  // Cerrar con ✕ → vuelve a la miniatura (scale s0) y desaparece.
  await page.locator(".profile-pull-h .back").click();
  await expect(panel).not.toHaveClass(/open/);
  await expect(panel).toHaveCSS("visibility", "hidden", { timeout: 3_000 });
});

// El gesto REAL con el dedo (CDP touch): pull-down en Inicio abre siguiendo el dedo
// (progress-driven, no un toggle) y tirar ABAJO dentro del perfil lo encoge y cierra (reversa).
test("Perfil: pull-down con el dedo abre; tirar abajo cierra", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.goto("/");
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 15_000 });
  const dismissNews = page.getByRole("button", { name: /Entendido|Got it/i });
  if (await dismissNews.count()) await dismissNews.first().click();

  const cdp = await page.context().newCDPSession(page);
  const panel = page.locator(".profile-pull");

  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 187, y: 260 }] });
  for (let i = 1; i <= 8; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 187, y: 260 + i * 48 }] });
  }
  // A mitad de gesto el panel está en modo arrastre (transición off, visible).
  await expect(panel).toHaveClass(/dragging/);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(panel).toHaveClass(/open/, { timeout: 3_000 });
  await expect(panel).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)", { timeout: 3_000 });

  // Cerrar: arriba → abajo (reversa al avatar), misma curva que la entrada.
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 187, y: 120 }] });
  for (let i = 1; i <= 8; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 187, y: 120 + i * 48 }] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(panel).not.toHaveClass(/open/, { timeout: 3_000 });
  await expect(panel).toHaveCSS("visibility", "hidden", { timeout: 3_000 });
});
