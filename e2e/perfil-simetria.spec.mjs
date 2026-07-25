import { test, expect } from "@playwright/test";
import { seedLoggedInDashboard } from "./fixtures.mjs";

/* CERRAR ES ABRIR AL REVÉS, y la animación no se toca mientras va (petición 2026-07-25:
 * «es hacer exactamente lo mismo que cuando se abre pero al cerrarse… que si alguien le da por
 * mantener el dedo mientras se va con la animación, que no se vuelva loco»).
 *
 * Lo que había: abrir y cerrar usaban curvas distintas (÷0,55^0,85 vs ÷0,48^0,88) y umbrales que
 * se diferenciaban casi al doble, así que el mismo dedo daba dos sensaciones. Y un gesto nuevo
 * durante la transición ponía `.dragging` (= `transition:none`), cortando la animación en vuelo:
 * el panel saltaba de donde iba a donde dijera el dedo.
 */
test.use({ viewport: { width: 393, height: 851 }, hasTouch: true });

async function app(page) {
  await seedLoggedInDashboard(page);
  await page.goto("/");
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 15_000 });
  await page.locator("#mc-load").waitFor({ state: "detached", timeout: 15_000 });
  const dn = page.getByRole("button", { name: /Entendido|Got it/i });
  if (await dn.count()) await dn.first().click();
  return await page.context().newCDPSession(page);
}

const escala = (page) =>
  page.locator(".profile-pull").evaluate((el) => +getComputedStyle(el).transform.split("(")[1].split(",")[0]);

async function arrastrar(cdp, page, y0, pasos, dy) {
  const out = [];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 190, y: y0 }] });
  for (let i = 1; i <= pasos; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 190, y: y0 + i * dy }] });
    out.push(await escala(page));
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  return out;
}

test("la curva de cerrar es la misma que la de abrir, en espejo", async ({ page }) => {
  const cdp = await app(page);
  const panel = page.locator(".profile-pull");

  // Abrir: la escala sube desde la miniatura del avatar.
  const abriendo = await arrastrar(cdp, page, 200, 8, 40);
  await expect(panel).toHaveClass(/open/, { timeout: 3_000 });
  await expect(panel).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)", { timeout: 3_000 });
  await page.waitForTimeout(700);

  // Cerrar: el mismo recorrido de dedo tiene que dar el mismo camino, al revés.
  const cerrando = await arrastrar(cdp, page, 200, 8, 40);

  /* Abrir hace `s0 + (1−s0)·r` y cerrar `1 − (1−s0)·r`. Si la `r` (la curva) es la misma en los
     dos, la suma de cada par de pasos vale siempre `1 + s0`, sea cual sea el recorrido del dedo.
     Es la forma de comprobar que comparten curva sin tener que copiar aquí sus constantes. */
  const s0 = await panel.evaluate((el) => parseFloat(el.style.getPropertyValue("--pp-s0")));
  expect(s0).toBeGreaterThan(0);
  for (let i = 0; i < abriendo.length; i++) {
    const subida = abriendo[i];        // va de s0 → 1
    const bajada = cerrando[i];        // va de 1 → s0
    expect(Math.abs((subida + bajada) - (1 + s0)), `paso ${i}: abrir ${subida.toFixed(3)} · cerrar ${bajada.toFixed(3)} · s0 ${s0.toFixed(3)}`).toBeLessThan(0.02);
  }
  await expect(panel).not.toHaveClass(/open/, { timeout: 3_000 });
});

test("tocar mientras la animación se va NO la corta a medias", async ({ page }) => {
  const cdp = await app(page);
  const panel = page.locator(".profile-pull");

  await page.locator(".v4-avatar").click();
  await expect(panel).toHaveClass(/open/, { timeout: 3_000 });
  await page.waitForTimeout(700);

  // Cerrar de un tirón y, SIN esperar, volver a poner el dedo encima y arrastrar.
  await arrastrar(cdp, page, 200, 6, 45);
  const durante = await arrastrar(cdp, page, 200, 4, 40);

  // Ese segundo gesto tiene que ser ignorado: nada de `.dragging` ni de estilos inline.
  await expect(panel).not.toHaveClass(/dragging/);
  const inline = await panel.evaluate((el) => el.style.transform);
  expect(inline, `el gesto intruso escribió transform="${inline}"`).toBe("");
  // Y el panel acaba donde tenía que acabar: cerrado, sin quedarse a medio camino.
  await expect(panel).toHaveCSS("visibility", "hidden", { timeout: 3_000 });
  expect(durante.length).toBeGreaterThan(0);
});
