import { test, expect } from "@playwright/test";
import { seedLoggedInDashboard, dismissNews } from "./fixtures.mjs";

/* RENDIMIENTO con histórico grande (feedback 2026-07-24: «cuanto más tiempo la uso, más se
   ralentiza, hasta ir lagueadísima»).
 *
 * La causa no era una sola cosa, sino que TODO el trabajo era proporcional al histórico y se
 * repetía en cada cambio de estado: `totals` dependía del objeto de estado entero (que cambia
 * SIEMPRE, porque `set()` sella `_savedAt`), el filtrado de Gastos recorría la lista cuatro veces
 * creando miles de `Date`, y las filas se repintaban todas aunque no cambiara ninguna.
 *
 * Estos tests no miden milisegundos absolutos (dependen de la máquina y serían flaky): miden que
 * el trabajo NO se dispare con el tamaño del histórico y que no se repita sin motivo. */

/** Histórico sintético de N movimientos repartidos por los últimos meses. */
function historico(n) {
  const out = [];
  const ahora = Date.now();
  for (let i = 0; i < n; i++) {
    const d = new Date(ahora - i * 3600_000 * 5);   // ~5 h entre movimientos → varios meses
    out.push({
      id: "x" + i,
      date: d.toISOString(),
      amount: (i % 7) + 1.5,
      merchant: ["Mercadona", "Bar Paco", "Repsol", "Amazon", "Bizum a Ana"][i % 5],
      category: ["super", "bares", "transporte", "compras", "otros"][i % 5],
      source: "manual",
      note: i % 5 === 4 ? "Concepto " + i : undefined,
    });
  }
  return out;
}

test("Gastos aguanta 3.000 movimientos y sigue respondiendo al escribir", async ({ page }) => {
  await seedLoggedInDashboard(page, { expenses: historico(3000) });
  await page.goto("/");
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 20_000 });
  await dismissNews(page);

  await page.locator('.botnav-tab[data-tour="gastos"]').click();
  await expect(page.locator("button.v4-mov").first()).toBeVisible({ timeout: 15_000 });

  // Escribir en el buscador es el peor caso: refiltra y reordena el histórico en cada tecla.
  const t0 = Date.now();
  await page.locator(".searchbar-in").fill("Repsol");
  await expect(page.locator("button.v4-mov").first()).toContainText("Repsol", { timeout: 10_000 });
  const ms = Date.now() - t0;

  // Umbral generoso a propósito (el CI es lento y no queremos un test flaky): lo que se persigue
  // es cazar una regresión GORDA — que alguien vuelva a meter trabajo cuadrático en el filtrado.
  expect(ms, `refiltrar 3.000 movimientos tardó ${ms} ms`).toBeLessThan(5000);
});

test("la lista pagina: 3.000 movimientos NO son 3.000 nodos en el DOM", async ({ page }) => {
  await seedLoggedInDashboard(page, { expenses: historico(3000) });
  await page.goto("/");
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 20_000 });
  await dismissNews(page);
  await page.locator('.botnav-tab[data-tour="gastos"]').click();
  await expect(page.locator("button.v4-mov").first()).toBeVisible({ timeout: 15_000 });

  // Si alguien quita el paginado (CONFIG.PAGE_SIZE + IntersectionObserver), el móvil se muere:
  // son miles de nodos repintándose en cada cambio de estado.
  const filas = await page.locator("button.v4-mov").count();
  expect(filas, `hay ${filas} filas pintadas de golpe`).toBeLessThan(60);
});

test("cambiar de pestaña con histórico grande no bloquea la app", async ({ page }) => {
  await seedLoggedInDashboard(page, { expenses: historico(3000) });
  await page.goto("/");
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 20_000 });
  await dismissNews(page);

  const t0 = Date.now();
  for (const tab of ["gastos", "plan", "cartera", "inicio"]) {
    await page.locator(`.botnav-tab[data-tour="${tab}"]`).click();
    await page.waitForTimeout(120);
  }
  const ms = Date.now() - t0;
  expect(ms, `recorrer las cuatro pestañas tardó ${ms} ms`).toBeLessThan(12_000);
});

test("parseDate cachea: repetir el trabajo del histórico no cuesta lo mismo la 2ª vez", async ({ page }) => {
  await seedLoggedInDashboard(page, { expenses: historico(2000) });
  await page.goto("/");
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 20_000 });
  await dismissNews(page);

  // Mide dentro de la página: primera pasada (caché fría) vs segunda (caché caliente). Es la
  // comprobación directa de que la caché de fechas existe y funciona; si alguien la quita, las
  // dos pasadas cuestan lo mismo y esto lo canta.
  const { fria, caliente } = await page.evaluate(() => {
    // Los gastos viven en su propia clave desde 4.8.0 (guardado partido).
    const fechas = JSON.parse(localStorage.getItem("micartera_v3_exp") || "[]").map((e) => e.date);
    const pasada = () => { const t = performance.now(); for (const f of fechas) dateMs(f); return performance.now() - t; };
    const fria = pasada();
    let caliente = Infinity;
    for (let i = 0; i < 3; i++) caliente = Math.min(caliente, pasada());
    return { fria, caliente };
  });
  expect(caliente, `fría ${fria.toFixed(1)} ms · caliente ${caliente.toFixed(1)} ms`).toBeLessThan(fria);
});
