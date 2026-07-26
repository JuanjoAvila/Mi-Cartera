/* DESLIZAR ENTRE PESTAÑAS, LO FUNCIONAL — complemento de `rendimiento-tabs.spec.mjs`.
 *
 * Aquel mide que entrar en una pestaña no bloquee el hilo; éste mide que el gesto HAGA lo que
 * tiene que hacer. Son cosas distintas y se rompen por separado: el arreglo del tirón consistió
 * en mover el montaje de las pestañas fuera del gesto, y un montaje que llega tarde (o que no
 * llega) daría una pestaña en blanco sin que ninguna tarea larga se enterase.
 *
 * Aquí NO se miden tiempos (serían flaky en CI): eso es del otro fichero. Esto comprueba que
 * deslizar recorre las cuatro pestañas y que la que entra acaba con contenido REAL, que es
 * render puro y por tanto justo lo que `npm test` no ve (§8 de AGENTS.md). */
import { test, expect } from "@playwright/test";
import { seedLoggedInDashboard, dismissNews } from "./fixtures.mjs";

/** El splash (#mc-load) es hermano de #root y tapa la pantalla entera: `.botnav` puede estar ya
 *  en el DOM con el splash todavía encima, y entonces el toque no llega ni a `.viewport`. */
async function appLista(page) {
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => !document.getElementById("mc-load"), null, { timeout: 30_000 });
  await dismissNews(page);
}

const pestanaActiva = (page) =>
  page.evaluate(() => {
    const b = document.querySelector(".botnav-tab.active");
    return b ? b.getAttribute("data-tour") : null;
  });

/** Arrastre lateral real. Dos detalles que NO son arbitrarios:
 *  · `y=200`: más abajo hay zonas que se tragan el gesto queriendo (`stopSwipe` en los chips de
 *    Gastos y en el gráfico de Inicio).
 *  · el gesto hacia atrás empieza en `x=80`, fuera de la franja de borde (`EDGE_OPEN`=52 px):
 *    arrancando pegado al borde izquierdo lo que se abre es AJUSTES, no la pestaña anterior. */
async function deslizar(page, cdp, sentido, { y = 200, pasos = 16 } = {}) {
  const W = page.viewportSize().width;
  const [a, b] = sentido === "siguiente" ? [W - 40, 40] : [80, W - 40];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: a, y }] });
  for (let i = 1; i <= pasos; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: a + ((b - a) * i) / pasos, y }] });
    await new Promise((r) => setTimeout(r, 16));
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

test("deslizar recorre las cuatro pestañas, ida y vuelta", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.goto("/");
  await appLista(page);
  const cdp = await page.context().newCDPSession(page);

  expect(await pestanaActiva(page)).toBe("inicio");

  for (const esperada of ["gastos", "plan", "cartera"]) {
    await deslizar(page, cdp, "siguiente");
    await expect.poll(() => pestanaActiva(page), { timeout: 10_000 }).toBe(esperada);
  }

  // Y en la última, seguir tirando no descarrila: se queda donde está.
  await deslizar(page, cdp, "siguiente");
  await expect.poll(() => pestanaActiva(page), { timeout: 10_000 }).toBe("cartera");

  for (const esperada of ["plan", "gastos", "inicio"]) {
    await deslizar(page, cdp, "anterior");
    await expect.poll(() => pestanaActiva(page), { timeout: 10_000 }).toBe(esperada);
  }
});

test("la pestaña que entra se pinta de verdad, no llega en blanco", async ({ page }) => {
  // Con datos, para que lo que se pinta sea una lista derivada del estado y no un hueco vacío.
  await seedLoggedInDashboard(page, {
    expenses: [
      { id: "m1", date: new Date().toISOString(), amount: 12.5, merchant: "Mercadona", category: "super", source: "manual" },
      { id: "m2", date: new Date().toISOString(), amount: 3.2, merchant: "Bar Paco", category: "bares", source: "manual" },
    ],
  });
  await page.goto("/");
  await appLista(page);
  const cdp = await page.context().newCDPSession(page);

  await deslizar(page, cdp, "siguiente");
  await expect.poll(() => pestanaActiva(page), { timeout: 10_000 }).toBe("gastos");

  // El montaje de la pestaña es perezoso: lo que importa es que acabe con contenido REAL.
  const filas = page.locator("button.v4-mov");
  await expect(filas.first()).toBeVisible({ timeout: 15_000 });
  await expect(filas.first()).toContainText("Mercadona");

  // Y al volver, Inicio sigue estando pintado (no se desmonta al salir).
  await deslizar(page, cdp, "anterior");
  await expect.poll(() => pestanaActiva(page), { timeout: 10_000 }).toBe("inicio");
  await expect(page.locator(".v4-hero")).toBeVisible();
});
