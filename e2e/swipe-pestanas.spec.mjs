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
async function deslizar(page, cdp, sentido, { y = 200, pasos = 16, x0 = null } = {}) {
  const W = page.viewportSize().width;
  const [a, b] = sentido === "siguiente" ? [W - 40, 40] : [x0 != null ? x0 : 80, W - 40];
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

/* EL «STOPPER» (rechazos 4.12.0.19 y .23: «hay un stopper o algo que no permite deslizar de
 * manera seguida y rápida»). No era un freno: encadenando deslizadas hacia atrás llegas a Inicio,
 * y ALLÍ un desliz a la derecha abre Ajustes desde toda la pantalla (atajo puesto el 17/7). O sea
 * que la deslizada de más te sacaba de la app en vez de no hacer nada.
 *
 * Se ve en que `.botnav-tab.active` desaparece: el `active` se pinta con
 * `tab===0 && !drawerOpen && !profileOpen`, así que si no hay ninguna activa es que se abrió el
 * cajón. Esa es la comprobación, y es estructural: nada de milisegundos, nada de flaky. */
test("encadenar deslizadas hasta el principio NO abre Ajustes", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.goto("/");
  await appLista(page);
  const cdp = await page.context().newCDPSession(page);

  await deslizar(page, cdp, "siguiente");
  await expect.poll(() => pestanaActiva(page), { timeout: 10_000 }).toBe("gastos");

  // Dos hacia atrás SIN pausa: la primera lleva a Inicio, la segunda es la que sobra.
  await deslizar(page, cdp, "anterior");
  await deslizar(page, cdp, "anterior");

  await expect.poll(() => pestanaActiva(page), { timeout: 10_000 }).toBe("inicio");
  expect(await page.locator(".drawer.open, .app-shell.gesture-freeze").count(),
    "la deslizada de más abrió Ajustes: eso es el «stopper»").toBe(0);

  // Y el atajo deliberado SIGUE funcionando: parado en Inicio, tirar desde el borde abre Ajustes.
  await page.waitForTimeout(700);   // ya no se está encadenando nada
  await deslizar(page, cdp, "anterior", { x0: 10 });
  await expect.poll(() => pestanaActiva(page), { timeout: 10_000 }).toBe(null);
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
  // No fijamos el orden de la lista (misma marca de tiempo → el sort no es estable entre runs).
  const filas = page.locator("button.v4-mov");
  await expect(filas.first()).toBeVisible({ timeout: 15_000 });
  await expect(filas).toHaveCount(2);
  await expect(page.locator("button.v4-mov", { hasText: "Mercadona" })).toBeVisible();
  await expect(page.locator("button.v4-mov", { hasText: "Bar Paco" })).toBeVisible();

  // Y al volver, Inicio sigue estando pintado (no se desmonta al salir).
  await deslizar(page, cdp, "anterior");
  await expect.poll(() => pestanaActiva(page), { timeout: 10_000 }).toBe("inicio");
  await expect(page.locator(".v4-hero")).toBeVisible();
});
