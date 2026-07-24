import { test, expect } from "@playwright/test";
import { seedLoggedInDashboard, dismissNews } from "./fixtures.mjs";

/* GUARDADO PARTIDO del estado (2026-07-24) — la causa gorda del «cuanto más la uso, más lenta va».
 *
 * Los gastos viven en su propia clave y solo se reescriben cuando cambian. La parte delicada es la
 * MIGRACIÓN: los móviles que ya están en marcha traen los gastos dentro de la clave principal y sin
 * clave de gastos. Si el primer guardado «ligero» reescribiera la principal sin gastos y no creara
 * la otra, el histórico desaparecería del móvil. Estos tests cubren justo eso. */

const KEY = "micartera_v3";
const KEY_EXP = "micartera_v3_exp";

function gastos(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ id: "g" + i, date: new Date(Date.now() - i * 3600_000).toISOString(), amount: 10 + i, merchant: "Comercio " + i, category: "super", source: "manual" });
  }
  return out;
}

/** Cuenta cuántas veces se escribe REALMENTE cada clave, envolviendo localStorage.setItem.
 *  (Marcar el array con una propiedad no vale: JSON.stringify de un Array tira todo lo que no
 *   sea índice, así que el centinela nunca llegaba al disco — falso positivo del primer intento.) */
async function contarEscrituras(page) {
  await page.evaluate(() => {
    window.__w = { exp: 0, base: 0 };
    const orig = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function (k, v) {
      if (k === "micartera_v3_exp") window.__w.exp++;
      else if (k === "micartera_v3") window.__w.base++;
      return orig(k, v);
    };
  });
}

test("estado ya partido: un cambio que no toca gastos NO reescribe el histórico", async ({ page }) => {
  await seedLoggedInDashboard(page, { expenses: gastos(50) });
  await page.goto("/");
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 15_000 });
  await dismissNews(page);
  await page.waitForTimeout(800);   // deja que se asiente el primer guardado (y la partición)

  await contarEscrituras(page);

  // Un montón de interacción que NO toca gastos: cambiar de pestaña una y otra vez.
  for (let i = 0; i < 3; i++) {
    for (const tab of ["plan", "cartera", "inicio", "gastos"]) {
      await page.locator(`.botnav-tab[data-tour="${tab}"]`).click();
      await page.waitForTimeout(80);
    }
  }
  await page.waitForTimeout(900);

  const w = await page.evaluate(() => window.__w);
  // Cero reescrituras del histórico: eso es justo lo que quita el lag que crecía con los meses.
  expect(w.exp, `el histórico se reescribió ${w.exp} vez/veces sin que cambiara ningún gasto`).toBe(0);
});

test("apuntar un gasto SÍ reescribe el histórico", async ({ page }) => {
  await seedLoggedInDashboard(page, { expenses: gastos(50) });
  await page.goto("/");
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 15_000 });
  await dismissNews(page);
  await page.waitForTimeout(800);

  const antes = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).length, KEY_EXP);

  await page.locator(".botnav-fab").click();
  await expect(page.locator(".v4-sheet")).toBeVisible();
  await page.waitForTimeout(450);
  for (const k of ["4", "2"]) await page.locator(".v4-keys button", { hasText: new RegExp(`^${k}$`) }).first().click();
  await page.getByRole("button", { name: /Guardar gasto|Save expense|Desar despesa/i }).click();
  await page.waitForTimeout(900);

  const despues = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY_EXP);
  expect(despues.length).toBe(antes + 1);
  expect(despues.some((e) => Math.abs(e.amount) === 42)).toBe(true);
});

test("MIGRACIÓN: un estado viejo (todo junto) no pierde el histórico al partirse", async ({ page }) => {
  // Estado en formato ANTIGUO: gastos dentro de la clave principal y sin clave `_exp`.
  await seedLoggedInDashboard(page, { expenses: gastos(30) });
  await page.addInitScript((kExp) => { localStorage.removeItem(kExp); }, KEY_EXP);

  await page.goto("/");
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 15_000 });
  await dismissNews(page);

  // Interacción que NO toca gastos: es justo el caso que podía tirar el histórico.
  for (const tab of ["plan", "cartera", "inicio"]) {
    await page.locator(`.botnav-tab[data-tour="${tab}"]`).click();
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(900);

  // Los 30 gastos siguen ahí, ahora en la clave partida.
  const exp = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "null"), KEY_EXP);
  expect(Array.isArray(exp), "no se creó la clave de gastos al migrar").toBe(true);
  expect(exp.length).toBe(30);

  // Y al recargar se ven igual (que es lo que de verdad importa).
  await page.reload();
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 15_000 });
  await dismissNews(page);
  await page.locator('.botnav-tab[data-tour="gastos"]').click();
  await expect(page.locator("button.v4-mov").first()).toBeVisible({ timeout: 10_000 });
  const filas = await page.locator("button.v4-mov").count();
  expect(filas).toBeGreaterThan(0);
});

test("recargar conserva los gastos apuntados (ida y vuelta completa)", async ({ page }) => {
  await seedLoggedInDashboard(page, { expenses: gastos(10) });
  await page.goto("/");
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 15_000 });
  await dismissNews(page);
  await page.waitForTimeout(600);

  await page.locator(".botnav-fab").click();
  await page.waitForTimeout(450);
  for (const k of ["9", "9"]) await page.locator(".v4-keys button", { hasText: new RegExp(`^${k}$`) }).first().click();
  await page.getByRole("button", { name: /Guardar gasto|Save expense|Desar despesa/i }).click();
  await page.waitForTimeout(900);

  await page.reload();
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 15_000 });
  await dismissNews(page);
  await page.locator('.botnav-tab[data-tour="gastos"]').click();
  await expect(page.locator("button.v4-mov").filter({ hasText: "99" }).first()).toBeVisible({ timeout: 10_000 });
});

/* EL caso que causaba el lag: volver a primer plano. Pasa decenas de veces al día (abrir la app,
   cambiar de app y volver) y dispara syncCloudExpenses. Antes, cada vuelta reescribía el estado
   ENTERO — medido aquí: 477 KB con 2.000 gastos y 1.912 KB con 8.000, o sea que el coste crecía
   con el histórico. Eso es literalmente «cuanto más tiempo la uso, más se ralentiza». Ahora se
   escribe ~1 KB, y esa cifra ya NO depende de cuántos gastos tengas. */
test("volver a primer plano no reescribe el histórico (el lag que crecía con los meses)", async ({ page }) => {
  await seedLoggedInDashboard(page, { expenses: gastos(400) });
  await page.goto("/");
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 15_000 });
  await dismissNews(page);
  await page.waitForTimeout(1200);

  await contarEscrituras(page);

  // Tres ciclos de segundo plano → primer plano.
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(80);
    await page.evaluate(() => {
      Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(700);
  }

  const w = await page.evaluate(() => window.__w);
  expect(w.exp, `cada vuelta a primer plano reescribió el histórico (${w.exp} veces)`).toBe(0);
});
