/* TOUR DE BIENVENIDA (coach-marks) — `Tour` en 02-ui-shared.js.
 *
 * Rechazos 3/8 y 4/8 (con foto): (1) el tip TAPA el foco (patrimonio); (2) el paso de Ajustes
 * iluminaba el icono de Inicio mientras el texto hablaba del borde izquierdo; (3) al tocar
 * «Siguiente» el recorte llegaba tarde o se quedaba a medio carrusel.
 *
 * Aquí se comprueba lo que él ve: el recorte cae sobre el sitio del que habla el texto, la
 * tarjeta no lo invade, y el salto entre pasos no deja el foco colgado del paso anterior.
 */
import { test, expect } from "@playwright/test";
import { seedLoggedInDashboard, dismissNews } from "./fixtures.mjs";

async function appLista(page) {
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => !document.getElementById("mc-load"), null, { timeout: 30_000 });
  await dismissNews(page);
}

async function abrirAjustesConGesto(page) {
  const cdp = await page.context().newCDPSession(page);
  const y = 200,
    x0 = 30,
    x1 = page.viewportSize().width - 20,
    pasos = 16;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y }] });
  for (let i = 1; i <= pasos; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + ((x1 - x0) * i) / pasos, y }] });
    await new Promise((r) => setTimeout(r, 16));
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.locator(".settings-push.open")).toBeVisible({ timeout: 5_000 });
}

/* Mismo orden que `steps` en 02-ui-shared.js. Las franjas de gesto no tienen nodo: se
 * comprueban por geometría (borde izquierdo / franja superior). */
const PASOS = [
  { sel: ".page .v4-hero, [data-tour='hero']" },
  { zone: "left" },
  { sel: '.botnav-tab[data-tour="gastos"]' },
  { sel: ".botnav-fab" },
  { sel: '.botnav-tab[data-tour="plan"]' },
  { sel: ".v4-seg" },
  { sel: '.botnav-tab[data-tour="cartera"]' },
  { sel: ".v4-avatar, [data-tour='avatar']" },
  { zone: "top" },
  { sel: ".botnav-row" },
];

function zonaEsperada(page, tipo) {
  return page.evaluate((z) => {
    const H = window.innerHeight || 700,
      W = window.innerWidth || 400;
    if (z === "left") return { x: 0, y: Math.round(H * 0.14), w: 40, h: Math.round(H * 0.52) };
    return { x: Math.round(W * 0.12), y: 0, w: Math.round(W * 0.76), h: 52 };
  }, tipo);
}

async function targetBoxDe(page, paso) {
  if (paso.zone) return zonaEsperada(page, paso.zone);
  return page.locator(paso.sel).first().boundingBox();
}

/** El recorte lleva pad 6–8 px; se compara con tolerancia, no con igualdad exacta. */
async function assertSpotSobreTarget(page, paso, i, tol) {
  const spotBox = await page.locator(".tour-spot").boundingBox();
  const targetBox = await targetBoxDe(page, paso);
  expect(spotBox, `paso ${i}: no hay .tour-spot`).toBeTruthy();
  expect(targetBox, `paso ${i}: sin target`).toBeTruthy();
  expect(Math.abs(spotBox.x - targetBox.x), `paso ${i}: x descuadrada`).toBeLessThan(tol);
  expect(Math.abs(spotBox.y - targetBox.y), `paso ${i}: y descuadrada`).toBeLessThan(tol);
}

/** La tarjeta de texto no puede invadir el foco (fotos 4/8: tip encima del patrimonio). */
async function assertTipNoTapaSpot(page, i) {
  const spot = await page.locator(".tour-spot").boundingBox();
  const tip = await page.locator(".tour-tip").boundingBox();
  expect(spot, `paso ${i}: spot`).toBeTruthy();
  expect(tip, `paso ${i}: tip`).toBeTruthy();
  const solapa = !(tip.x + tip.width < spot.x || tip.x > spot.x + spot.width || tip.y + tip.height < spot.y || tip.y > spot.y + spot.height);
  expect(solapa, `paso ${i}: la tarjeta tapa el foco (tip y=${tip.y} h=${tip.height}, spot y=${spot.y} h=${spot.height})`).toBe(false);
}

async function comprobarPasos(page) {
  for (let i = 0; i < PASOS.length; i++) {
    await expect(page.locator(".tour-spot")).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(1_100);
    await assertSpotSobreTarget(page, PASOS[i], i, 14);
    await assertTipNoTapaSpot(page, i);
    const btn = page.locator(".tour-btns button.btn-primary");
    const texto = (await btn.textContent()) || "";
    if (/listo|done|fet/i.test(texto)) break;
    await btn.click();
  }
}

test("tour de bienvenida: los 10 pasos caen sobre su sitio y el tip no los tapa", async ({ page }) => {
  await seedLoggedInDashboard(page, { tourSeen: false });
  await page.goto("/");
  await appLista(page);
  await expect(page.locator(".tour-wrap")).toBeVisible({ timeout: 5_000 });
  await comprobarPasos(page);
  await page.locator(".tour-btns button.btn-primary").click();
  await expect(page.locator(".tour-wrap")).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("micartera_v3") || "{}").tourSeen), { timeout: 5_000 })
    .toBe(true);
});

const TOLERANCIA_RAPIDA = 16;
test("al tocar «Siguiente» el recorte llega al sitio nuevo sin hacerte esperar", async ({ page }) => {
  await seedLoggedInDashboard(page, { tourSeen: false });
  await page.goto("/");
  await appLista(page);
  await expect(page.locator(".tour-wrap")).toBeVisible({ timeout: 5_000 });

  for (let i = 1; i < PASOS.length; i++) {
    await page.waitForTimeout(1_100);
    await page.locator(".tour-btns button.btn-primary").click();
    await page.waitForTimeout(400);
    await assertSpotSobreTarget(page, PASOS[i], i, TOLERANCIA_RAPIDA);
  }
});

test("Ajustes → Ver el tutorial reabre el mismo tour, ya con los pasos de gestos", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.goto("/");
  await appLista(page);
  await expect(page.locator(".tour-wrap")).toHaveCount(0);

  await abrirAjustesConGesto(page);

  await page.locator(".settings-push.open input").first().fill("tutorial");
  await page
    .locator(".settings-push.open")
    .getByText(/Ver el tutorial|See the tour|Veure el tutorial/i)
    .first()
    .click();

  await expect(page.locator(".tour-wrap")).toBeVisible({ timeout: 5_000 });
  await expect(page.locator(".settings-push.open")).toHaveCount(0);
  await page.waitForTimeout(1_100);
  await assertSpotSobreTarget(page, PASOS[0], 0, 14);
  await assertTipNoTapaSpot(page, 0);
});

test("la tarjeta fija de gestos ya no existe en Ajustes", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.goto("/");
  await appLista(page);
  await abrirAjustesConGesto(page);
  await expect(page.locator(".settings-push.open .coach-card, .settings-push.open .coach-pill")).toHaveCount(0);
});
