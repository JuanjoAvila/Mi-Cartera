import { test, expect } from "@playwright/test";
import { seedLoggedInDashboard, dismissNews } from "./fixtures.mjs";

/* ENTRAR EN UNA PESTAÑA NO DEBE CONGELAR LA APP (feedback del móvil, 2026-07-26):
   «en deudas y metas cuando se accede la app se relentiza de manera muy bestia» y «las primeras
   veces que deslizas entre pestañas va a tirones, luego se suaviza».

   Las dos frases eran el mismo problema: la pestaña se montaba EN EL MOMENTO en que la tocabas
   —dentro del gesto— y encima el efecto que resetea los chips de Gastos escribía `scrollLeft`
   con el layout recién ensuciado, forzando un recálculo síncrono de la página entera.

   En un portátil esto NO SE VE (cero tareas largas): hay que estrangular la CPU con CDP para
   parecerse a la WebView de un Android de gama media. Medido así, antes del arreglo entrar en
   Deudas y Metas bloqueaba el hilo 171 ms y Gastos 77 ms; después, 0 ms los dos.

   El umbral es generoso a propósito (el CI es más lento y variable): esto no persigue milisegundos,
   persigue que nadie vuelva a mover el montaje de las pestañas dentro del gesto. */

const RATE = 6;
const TOPE_MS = 80;

function historico(n) {
  const out = [];
  const ahora = Date.now();
  for (let i = 0; i < n; i++) {
    out.push({
      id: "x" + i,
      date: new Date(ahora - i * 3600_000 * 5).toISOString(),
      amount: (i % 7) + 1.5,
      merchant: ["Mercadona", "Bar Paco", "Repsol", "Amazon", "Bizum a Ana"][i % 5],
      category: ["super", "bares", "transporte", "compras", "otros"][i % 5],
      source: "manual",
    });
  }
  return out;
}
const deudas = Array.from({ length: 6 }, (_, i) => ({
  id: "d" + i, name: "Préstamo " + i, value: 6000 + i * 900, monthly: 180 + i * 12,
  apr: 5.5, account: "e2e", start: "2024-01-15", anchor: 8000 + i * 900,
}));
const metas = Array.from({ length: 6 }, (_, i) => ({
  id: "g" + i, name: "Meta " + i, target: 3000 + i * 500, saved: 400 + i * 220, emoji: "🎯", account: "e2e",
}));

test("entrar por primera vez en cada pestaña no bloquea el hilo principal", async ({ page }) => {
  await page.addInitScript(() => {
    window.__lt = [];
    try {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__lt.push(Math.round(e.duration));
      }).observe({ entryTypes: ["longtask"] });
    } catch (e) {}
  });
  await seedLoggedInDashboard(page, { expenses: historico(1200), debts: deudas, goals: metas });

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: RATE });

  await page.goto("/");
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 60_000 });
  await dismissNews(page);

  // La espera es el meollo: la app tiene huecos libres de sobra para adelantar el montaje de las
  // pestañas ANTES de que nadie toque nada. Si alguien vuelve a montarlas al tocar, aquí se ve.
  await page.waitForTimeout(6000);

  // Prueba directa de que el montaje se ha adelantado: las cuatro páginas del carrusel ya tienen
  // contenido sin que nadie haya tocado nada.
  const vivas = await page.locator(".track > .page-live").count();
  expect(vivas, `solo ${vivas} pestañas montadas tras 6 s de reposo`).toBeGreaterThanOrEqual(4);

  // Y montada no basta: lo CARO de cada pestaña también tiene que estar hecho ya. Gastos deja
  // para el final la detección de suscripciones (`heavyOk`), y eso esperaba a que la pestaña
  // estuviera ACTIVA — o sea que se pagaba al llegar, en la cola del gesto. Trazado con la CPU
  // x6: 67 ms de tarea, 59,7 de ellos un Layout completo por las ~50 etiquetas que aparecían de
  // golpe (2026-07-26). Las filas de suscripción SOLO viven en Gastos, así que verlas estando en
  // Inicio es la prueba de que el trabajo se adelantó. Es una comprobación estructural, no de
  // tiempos: no puede quedarse en flaky cuando el CI vaya lento.
  expect(await page.locator('.botnav-tab.active').getAttribute("data-tour")).toBe("inicio");
  const subs = await page.locator(".sub-row").count();
  expect(subs, "la tarjeta cara de Gastos no se ha adelantado: sigue esperando a que entres").toBeGreaterThan(0);

  // Y la comprobación cara, solo en la pestaña que motivó el feedback (Deudas y Metas). Se mide
  // una sola para no acaparar la máquina: con la CPU estrangulada, esta prueba compite con el
  // resto del suite y hace flaquear a las que van con clics encadenados.
  await page.evaluate(() => { window.__lt = []; });
  await page.locator('.botnav-tab[data-tour="plan"]').click();
  await page.locator(".v4-debt, .v4-goal").first().waitFor({ timeout: 30_000 });
  const lt = await page.evaluate(() => window.__lt.slice());
  const bloqueo = lt.reduce((a, b) => a + b, 0);
  expect(bloqueo, `entrar en Deudas y Metas bloqueó el hilo ${bloqueo} ms (tareas: ${lt.join(",") || "ninguna"})`).toBeLessThan(TOPE_MS);

  // ⚠ LO QUE ESTA PRUEBA NO MIRABA, Y COSTÓ DOS VERSIONES (2026-07-26 noche). Entrar en la
  // pestaña Plan aterriza en RECIBOS. El segmento de Deudas se montaba aparte, al tocarlo
  // (`seg==="deudas" && <Debts/>`), y eso costaba 203 ms de hilo bloqueado con la CPU x6 — el
  // «en deudas y metas se relentiza de manera muy bestia» que él seguía marcando como fallo
  // mientras esta prueba pasaba en verde. La lección es la de siempre: medir LO QUE TOCA EL
  // USUARIO, no lo que es cómodo de medir. Estructural, como el de Gastos: los tres segmentos
  // tienen que estar montados ya, con Recibos siendo el único visible.
  for (const seg of ["recibos", "deudas", "metas"]) {
    await expect(page.locator(`[data-seg="${seg}"]`), `el segmento «${seg}» de Plan no se ha montado por adelantado`).toHaveCount(1);
  }
  expect(await page.locator('[data-seg="deudas"]').isVisible(), "Deudas debería estar montado pero NO visible").toBe(false);
});
