/* TOUR DE BIENVENIDA (coach-marks) — `Tour` en 02-ui-shared.js.
 *
 * Rechazo suyo del 3/8: la tarjeta ESTÁTICA de gestos («GestureCoach», fija arriba de Ajustes)
 * no era lo pedido — «yo me refería un tutorial dinámico no fijo arriba de ajustes... como el
 * tutorial del principio de la app que por cierto está bugueado, no marca las cosas en su sitio
 * sale descuadrado». Dos cosas que probar aquí:
 *   1) El tutorial de gestos vive DENTRO de este tour (GestureCoach se ha quitado entero).
 *   2) El tour YA NO sale descuadrado: el bug real no eran los selectores (apuntaban bien) sino
 *      que, al tocar «Siguiente», el TEXTO cambiaba al instante pero el RECORTE (`.tour-spot`) se
 *      quedaba plantado en el elemento del paso anterior durante los ~520 ms que tarda en re-medir
 *      — texto de un paso con el foco de otro. Ahora los dos viven en un único estado (`shown`)
 *      que se pisa junto, así que nunca se pinta un texto con el foco de otro paso.
 */
import { test, expect } from "@playwright/test";
import { seedLoggedInDashboard, dismissNews } from "./fixtures.mjs";

async function appLista(page) {
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => !document.getElementById("mc-load"), null, { timeout: 30_000 });
  await dismissNews(page);
}

/** Abre Ajustes con el MISMO gesto que un usuario real (deslizar a la derecha en Resumen),
 *  en vez de pasar por avatar → perfil → «Ir a Ajustes»: esa ruta encadena DOS transiciones de
 *  overlay (perfil que se cierra + Ajustes que se abre) en el mismo evento, y el mecanismo de
 *  «botón atrás» del navegador (`useBackClose`/`_mcBackStack`, 02-ui-shared.js) no lleva bien
 *  esa combinación — de un `history.back()` de más, la pestaña puede acabar en `about:blank`.
 *  Es un bug PREEXISTENTE ajeno al tour (reproduce igual en el código sin tocar); aquí se evita
 *  sin más para no acoplar la prueba del tour a él. */
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

// Selector real de cada paso, en el MISMO orden que el array `steps` de 02-ui-shared.js.
// Los tres nuevos (gestos) van pegados al paso del elemento con el que se relacionan.
const PASOS = [
  ".page .v4-hero, [data-tour='hero']", // tour_1: patrimonio
  '.botnav-tab[data-tour="inicio"]', // tour_settings: edge-swipe → Ajustes
  '.botnav-tab[data-tour="gastos"]', // tour_2
  ".botnav-fab", // tour_3
  '.botnav-tab[data-tour="plan"]', // tour_4
  ".v4-seg", // tour_planswipe: deslizar arriba/abajo en Plan
  '.botnav-tab[data-tour="cartera"]', // tour_5
  ".v4-avatar, [data-tour='avatar']", // tour_6: toca el avatar
  ".v4-avatar, [data-tour='avatar']", // tour_pulldown: tirón hacia abajo (mismo foco)
  ".botnav-row", // tour_7: deslizar entre pestañas
];

/** El recorte lleva un margen fijo alrededor del elemento real (`pad`: 8px normal, 6px en los
 *  pasos redondos del avatar) — por eso se compara con tolerancia, no con igualdad exacta. */
async function comprobarPasos(page) {
  for (let i = 0; i < PASOS.length; i++) {
    const spot = page.locator(".tour-spot");
    await expect(spot).toBeVisible({ timeout: 5_000 });
    // El recorte espera hasta 520 ms (si el paso cambia de pestaña) más hasta 320 ms de
    // transición CSS antes de asentarse del todo en el elemento nuevo — sin este margen se
    // compara la posición a medio camino.
    await page.waitForTimeout(1_100);
    const spotBox = await spot.boundingBox();
    const targetBox = await page.locator(PASOS[i]).first().boundingBox();
    expect(spotBox, `paso ${i}: no hay .tour-spot`).toBeTruthy();
    expect(targetBox, `paso ${i}: el selector "${PASOS[i]}" no encontró nada`).toBeTruthy();
    // Tolerancia generosa (14px): el pad real es de 6-8px, esto solo pilla descuadres de verdad.
    expect(Math.abs(spotBox.x - targetBox.x), `paso ${i}: x descuadrada`).toBeLessThan(14);
    expect(Math.abs(spotBox.y - targetBox.y), `paso ${i}: y descuadrada`).toBeLessThan(14);
    const btn = page.locator(".tour-btns button.btn-primary");
    const texto = (await btn.textContent()) || "";
    if (/listo|done|fet/i.test(texto)) break;
    await btn.click();
  }
}

test("tour de bienvenida: los 10 pasos caen exactamente sobre su elemento", async ({ page }) => {
  await seedLoggedInDashboard(page, { tourSeen: false });
  await page.goto("/");
  await appLista(page);
  // Sale solo ~700ms después de arrancar (state.tourSeen===false).
  await expect(page.locator(".tour-wrap")).toBeVisible({ timeout: 5_000 });
  await comprobarPasos(page);
  // Al llegar al final, «¡Listo!» cierra el tour y lo marca como visto.
  await page.locator(".tour-btns button.btn-primary").click();
  await expect(page.locator(".tour-wrap")).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("micartera_v3") || "{}").tourSeen), { timeout: 5_000 })
    .toBe(true);
});

/* EL CASO QUE SE ESCAPÓ DOS VECES (rechazos 3/8 y 4/8). La prueba de arriba espera 1,1 s antes de
 * comparar, y ese colchón tapaba justo lo que él veía: el tour medía el elemento UNA sola vez,
 * tras una espera fija de 520 ms. Hasta que esa medición llegaba, el recorte seguía plantado en el
 * elemento del paso ANTERIOR mientras la pestaña ya se había ido — «no se marca correctamente en
 * el sitio, sale movido, los recortes no están bien posicionados». Y si la medición caía con el
 * carrusel aún en marcha (aparato lento, arranque cargado), se quedaba clavada a medio camino para
 * siempre, porque no se volvía a medir nunca más.
 *
 * Aquí se mide lo que él nota de verdad: CUÁNTO TARDA el recorte en llegar. Medido el 4/8 en el
 * paso de «Cartera», a 400 ms de tocar «Siguiente»: código viejo 298 px de desvío horizontal y 601
 * vertical (seguía rodeando la pestaña de Plan); con el seguimiento, 8 px — el margen del recorte. */
const TOLERANCIA_RAPIDA = 16;
test("al tocar «Siguiente» el recorte llega al elemento nuevo sin hacerte esperar", async ({ page }) => {
  await seedLoggedInDashboard(page, { tourSeen: false });
  await page.goto("/");
  await appLista(page);
  await expect(page.locator(".tour-wrap")).toBeVisible({ timeout: 5_000 });

  for (let i = 1; i < PASOS.length; i++) {
    // Dejar asentado el paso anterior para que lo que se mide sea solo el salto al siguiente.
    await page.waitForTimeout(1_100);
    await page.locator(".tour-btns button.btn-primary").click();
    await page.waitForTimeout(400);
    const spotBox = await page.locator(".tour-spot").boundingBox();
    const targetBox = await page.locator(PASOS[i]).first().boundingBox();
    expect(spotBox, `paso ${i}: no hay .tour-spot`).toBeTruthy();
    expect(Math.abs(spotBox.x - targetBox.x), `paso ${i}: a 400 ms el recorte sigue lejos en x`).toBeLessThan(TOLERANCIA_RAPIDA);
    expect(Math.abs(spotBox.y - targetBox.y), `paso ${i}: a 400 ms el recorte sigue lejos en y`).toBeLessThan(TOLERANCIA_RAPIDA);
  }
});

test("Ajustes → Ver el tutorial reabre el mismo tour, ya con los pasos de gestos", async ({ page }) => {
  await seedLoggedInDashboard(page); // tourSeen:true por defecto → no se abre solo
  await page.goto("/");
  await appLista(page);
  await expect(page.locator(".tour-wrap")).toHaveCount(0);

  await abrirAjustesConGesto(page);

  // La fila «🎓 Ver el tutorial» vive en «Para empezar», que arranca plegada: el buscador la
  // expande sola al filtrar por palabra clave.
  await page.locator(".settings-push.open input").first().fill("tutorial");
  await page
    .locator(".settings-push.open")
    .getByText(/Ver el tutorial|See the tour|Veure el tutorial/i)
    .first()
    .click();

  await expect(page.locator(".tour-wrap")).toBeVisible({ timeout: 5_000 });
  await expect(page.locator(".settings-push.open")).toHaveCount(0);
  // Cobertura completa de los 10 pasos ya la da el test anterior; aquí solo se confirma que
  // reabrir a mano deja el primer recorte tan bien puesto como el arranque automático.
  await page.waitForTimeout(1_100);
  const spot = await page.locator(".tour-spot").boundingBox();
  const hero = await page.locator(".v4-hero").first().boundingBox();
  expect(Math.abs(spot.x - hero.x)).toBeLessThan(14);
  expect(Math.abs(spot.y - hero.y)).toBeLessThan(14);
});

test("la tarjeta fija de gestos ya no existe en Ajustes", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.goto("/");
  await appLista(page);
  await abrirAjustesConGesto(page);
  await expect(page.locator(".settings-push.open .coach-card, .settings-push.open .coach-pill")).toHaveCount(0);
});
