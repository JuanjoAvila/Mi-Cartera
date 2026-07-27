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

/* EL DESENFOQUE DE LA BARRA SE APAGA MIENTRAS EL CARRUSEL SE MUEVE (2026-07-27).
 *
 * Su repro fue el que lo destapó: «en Gastos ARRIBA DEL TODO vas a Deudas, te mueves y vuelves:
 * hay lag; si en Gastos estabas abajo, va ultra fluido». Lo que cambia entre los dos casos es que
 * al bajar en una lista la barra inferior SE ESCONDE — y una barra escondida no desenfoca nada.
 * `.botnav` lleva `backdrop-filter`, que el navegador recalcula en cada frame en que cambia lo que
 * hay detrás; deslizando, detrás se mueve la app entera (medido: 47 repintados de la barra en un
 * solo gesto). Acotado: 181 ms con desenfoque, 145 sin él, 141 con la barra fuera del pintado —
 * o sea que el coste de la barra es CASI TODO el desenfoque.
 *
 * Se comprueba estructuralmente, no por tiempo: que la clase esté puesta MIENTRAS se arrastra y
 * que se quite sola después (si se quedara puesta, el diseño cambiaría de verdad, que es justo lo
 * que él pidió no tocar). */
test("al deslizar, la barra deja de desenfocar; al parar, vuelve", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.goto("/");
  await appLista(page);
  const cdp = await page.context().newCDPSession(page);
  const shell = page.locator(".app-shell");

  await expect(shell, "en reposo la barra tiene que desenfocar (el diseño no se toca)").not.toHaveClass(/nav-sin-blur/);

  // Arrastre a medias: se dispara el gesto y se comprueba SIN soltar.
  const W = page.viewportSize().width;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: W - 40, y: 200 }] });
  for (let i = 1; i <= 8; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: W - 40 - i * 30, y: 200 }] });
    await new Promise((r) => setTimeout(r, 16));
  }
  await expect(shell, "con el dedo puesto, el desenfoque tiene que estar apagado").toHaveClass(/nav-sin-blur/);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

  // Y vuelve solo cuando el carrusel ha parado (la transición dura 0,42 s).
  await expect(shell, "el desenfoque tiene que volver al terminar la transición").not.toHaveClass(/nav-sin-blur/, { timeout: 5_000 });
});

/* EL GESTO QUE EL NAVEGADOR SE LLEVA — el «tirón» de verdad (2026-07-27, medido en su móvil).
 *
 * Cuando el navegador decide que un arrastre es suyo (lo normal en cuanto acaba scrolleando la
 * lista) manda `touchcancel` y NO manda `touchend`. `.viewport` no escuchaba `touchcancel`, así
 * que en ese camino no se soltaba nada: la página se quedaba con el candado de scroll puesto y el
 * carrusel plantado a medio camino. Traducido a lo que él veía: deslizas y no se mueve nada, y
 * cuando por fin un gesto termina bien, se suelta todo de golpe y la pantalla pega el salto.
 *
 * En su móvil, 174 de 185 gestos reales terminaron cancelados. En un banco de pruebas no salía
 * NUNCA, porque un gesto sintético siempre acaba con un `touchend` limpio — por eso hay que
 * mandar el `touchCancel` a mano, que es justo lo que hace esta prueba.
 *
 * Se comprueba lo que le dolía: que después de un gesto cancelado la lista SIGUE moviéndose. */
test("un gesto que el navegador cancela no deja la app bloqueada", async ({ page }) => {
  await seedLoggedInDashboard(page, {
    expenses: Array.from({ length: 40 }, (_, i) => ({
      id: "m" + i, date: new Date(Date.now() - i * 36e5).toISOString(),
      amount: 5 + i, merchant: "Comercio " + i, category: "super", source: "manual",
    })),
  });
  await page.goto("/");
  await appLista(page);
  const cdp = await page.context().newCDPSession(page);

  await deslizar(page, cdp, "siguiente");
  await expect.poll(() => pestanaActiva(page), { timeout: 10_000 }).toBe("gastos");

  // Mirando TODAS las páginas, no solo la que se ve: con el carrusel a medio arrastrar, la
  // congelada y la que asoma no son la misma, y el candado se quedaba en la de detrás.
  // La página de Gastos por ÍNDICE, no por posición en pantalla: con el carrusel a mitad de
  // transición el rect engaña y se acababa midiendo la página de al lado.
  const pagina = () => page.evaluate(() => {
    const ps = [...document.querySelectorAll(".page")];
    const p = ps[1];
    return {
      top: Math.round(p.scrollTop), alto: p.scrollHeight,
      bloqueo: ps.map((el) => el.style.touchAction || "").filter(Boolean).join(","),
      overflow: ps.map((el) => el.style.overflow || "").filter(Boolean).join(","),
    };
  });

  // Su repro: entrar, MOVERSE dentro (el candado caro solo se pone si hubo scroll hace nada).
  // Se espera a que la lista sea de verdad más alta que la pantalla: en el CI las filas tardan
  // más en pintarse y scrollear antes de tiempo no movía nada (fallo del 27/7).
  await expect(page.locator("button.v4-mov").first()).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => page.evaluate(() => {
    const p = document.querySelectorAll(".page")[1];
    return p.scrollHeight > p.clientHeight + 100;
  }), { timeout: 15_000 }).toBe(true);
  await page.evaluate(() => { document.querySelectorAll(".page")[1].scrollTop = 300; });
  await page.waitForTimeout(60);
  expect((await pagina()).top, "la lista tiene que poder scrollear para que la prueba valga").toBeGreaterThan(0);

  // …y deslizar. Pero el navegador se lleva el gesto a mitad: llega `touchcancel`, no `touchend`.
  const W = page.viewportSize().width;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: W - 40, y: 200 }] });
  for (let i = 1; i <= 6; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: W - 40 - i * 24, y: 200 }] });
    await new Promise((r) => setTimeout(r, 16));
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  await page.waitForTimeout(200);

  const tras = await pagina();
  expect(tras.bloqueo, "la página se quedó con touch-action puesto: el dedo ya no la mueve").toBe("");
  expect(tras.overflow, "la página se quedó con overflow:hidden: el scroll está muerto").toBe("");
  await expect(page.locator(".track"), "el carrusel se quedó en modo arrastre").not.toHaveClass(/dragging/);
  await expect(page.locator(".app-shell"), "el desenfoque de la barra no volvió").not.toHaveClass(/nav-sin-blur/, { timeout: 5_000 });

  // Y lo que de verdad importa: la lista se sigue moviendo con el dedo.
  const antes = (await pagina()).top;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 180, y: 500 }] });
  for (let i = 1; i <= 10; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 180, y: 500 - i * 30 }] });
    await new Promise((r) => setTimeout(r, 16));
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => pagina().then((p) => p.top), { timeout: 5_000 })
    .not.toBe(antes);
});
