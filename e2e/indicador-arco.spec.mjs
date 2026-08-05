/* LA RAYITA (indicador de pestaña activa) TIENE QUE ARQUEAR SOBRE EL + — y si le cortas el
 * salto a mitad, NO atravesarlo en diagonal (feedback 2026-08-05: «si lo hago muy rápido se
 * corta y atraviesa»).
 *
 * Historia: en 2026-08-03 el fallo a velocidad alta era `rodea` colgada (cleanup del efecto
 * cancelaba el timer sin quitar la clase). Eso se arregló. Luego, al reiniciar `rodea` en cada
 * cruce encadenado, el span seguía a medias (Y subida) mientras el X saltaba → diagonal por el +.
 * Ahora un cruce LIMPIO arquea; uno INTERRUMPIDO hace snap al destino (sin arco ni diagonal).
 *
 * Se comprueba MIDIENDO EL translateY REAL del span. Un arco de verdad baja de -14 px; un snap
 * limpio se queda ~0; lo que no queremos es un «ni fu ni fa» a medias atravesando el vano. */
import { test, expect } from "@playwright/test";
import { seedLoggedInDashboard, dismissNews } from "./fixtures.mjs";

/* Umbral del arco: el keyframe llega a -26 px; el muestreo por rAF a veces pilla -14,7.
   -14 sigue distinguiendo un arco real de una línea recta (~0). */
const ARCO_UMBRAL = -14;
/* Snap limpio: casi sin brinco vertical (tolerancia de redondeo / subpíxel). */
const SNAP_TECHO = -3;

async function appLista(page) {
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => !document.getElementById("mc-load"), null, { timeout: 30_000 });
  await dismissNews(page);
}

async function deslizar(page, cdp, sentido, { y = 200, pasos = 2 } = {}) {
  const W = page.viewportSize().width;
  const [a, b] = sentido === "siguiente" ? [W - 40, 40] : [80, W - 40];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: a, y }] });
  for (let i = 1; i <= pasos; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: a + ((b - a) * i) / pasos, y }] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function arrancarMuestreo(page) {
  await page.evaluate(() => {
    window.__samples = [];
    window.__t0 = performance.now();
    window.__sampling = true;
    (function tick() {
      const span = document.querySelector(".botnav-ind span");
      const cont = document.querySelector(".botnav-ind");
      const tf = getComputedStyle(span).transform;
      const m = tf.match(/matrix\(([^)]+)\)/);
      const ty = m ? Number(m[1].split(",")[5]) : 0;
      window.__samples.push({ t: Math.round(performance.now() - window.__t0), ty, objetivo: cont.style.transform });
      if (window.__sampling) requestAnimationFrame(tick);
    })();
  });
}

function posATab(objetivo) {
  const m = objetivo && objetivo.match(/translateX\((-?[\d.]+)%\)/);
  if (!m) return null;
  const pct = Number(m[1]);
  return pct <= 100 ? pct / 100 : pct / 100 - 1;
}

async function pararMuestreoYagrupar(page) {
  await page.evaluate(() => { window.__sampling = false; });
  const samples = await page.evaluate(() => window.__samples);
  const tramos = [];
  let cur = null;
  for (const s of samples) {
    if (!cur || cur.objetivo !== s.objetivo) {
      if (cur) tramos.push(cur);
      cur = { objetivo: s.objetivo, minTy: s.ty };
    }
    cur.minTy = Math.min(cur.minTy, s.ty);
  }
  if (cur) tramos.push(cur);
  return tramos;
}

function esArcoOSnap(minTy) {
  return minTy < ARCO_UMBRAL || minTy > SNAP_TECHO;
}

test("un cruce limpio (sin interrumpir) arquea por encima del +", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.goto("/");
  await appLista(page);
  const cdp = await page.context().newCDPSession(page);

  await deslizar(page, cdp, "siguiente"); // inicio->gastos
  await page.waitForTimeout(500);
  await arrancarMuestreo(page);
  await deslizar(page, cdp, "siguiente"); // gastos->plan (cruza)
  await page.waitForTimeout(500);
  const tramos = await pararMuestreoYagrupar(page);

  let visto = false;
  for (let i = 1; i < tramos.length; i++) {
    const antes = posATab(tramos[i - 1].objetivo), ahora = posATab(tramos[i].objetivo);
    if (antes == null || ahora == null || antes === ahora) continue;
    if ((antes <= 1) !== (ahora <= 1)) {
      visto = true;
      expect(tramos[i].minTy, `cruce limpio ${tramos[i - 1].objetivo}→${tramos[i].objetivo} no arqueó (${tramos[i].minTy})`).toBeLessThan(ARCO_UMBRAL);
    }
  }
  expect(visto, "tiene que haber un cruce gastos→plan").toBe(true);
});

test("a velocidad alta, cada cruce o arquea o snapea limpio (nunca atraviesa a medias)", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.goto("/");
  await appLista(page);
  const cdp = await page.context().newCDPSession(page);

  await deslizar(page, cdp, "siguiente"); // inicio->gastos
  await page.waitForTimeout(400);
  await arrancarMuestreo(page);

  for (let i = 0; i < 6; i++) {
    await deslizar(page, cdp, "siguiente"); // gastos->plan (cruza)
    await deslizar(page, cdp, "anterior");  // plan->gastos (cruza)
  }
  await page.waitForTimeout(500);
  const tramos = await pararMuestreoYagrupar(page);

  let comprobados = 0;
  let algunArco = 0;
  for (let i = 1; i < tramos.length; i++) {
    const antes = posATab(tramos[i - 1].objetivo), ahora = posATab(tramos[i].objetivo);
    if (antes == null || ahora == null || antes === ahora) continue;
    const cruza = (antes <= 1) !== (ahora <= 1);
    if (!cruza) continue;
    comprobados++;
    const ty = tramos[i].minTy;
    if (ty < ARCO_UMBRAL) algunArco++;
    expect(
      esArcoOSnap(ty),
      `salto ${tramos[i - 1].objetivo}→${tramos[i].objetivo}: ty=${ty} ni arco ni snap (atravesó a medias)`
    ).toBe(true);
  }
  expect(comprobados, "la ráfaga tiene que haber generado varios cruces reales").toBeGreaterThan(5);
  expect(algunArco, "al menos un cruce de la ráfaga tiene que haber arqueado").toBeGreaterThan(0);
});

test("un salto que NO cruza el + no hereda el arco de un cruce reciente (bleed-through)", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.goto("/");
  await appLista(page);
  const cdp = await page.context().newCDPSession(page);

  await deslizar(page, cdp, "siguiente"); // inicio->gastos
  await page.waitForTimeout(400);
  await arrancarMuestreo(page);

  for (let i = 0; i < 4; i++) {
    await deslizar(page, cdp, "siguiente"); // gastos->plan (cruza)
    await deslizar(page, cdp, "siguiente"); // plan->cartera (no cruza)
    await deslizar(page, cdp, "anterior");  // cartera->plan (no cruza)
    await deslizar(page, cdp, "anterior");  // plan->gastos (cruza)
    await deslizar(page, cdp, "anterior");  // gastos->inicio (no cruza)
    await deslizar(page, cdp, "siguiente"); // inicio->gastos (no cruza)
  }
  await page.waitForTimeout(500);
  const tramos = await pararMuestreoYagrupar(page);

  let cruces = 0, noCruces = 0;
  for (let i = 1; i < tramos.length; i++) {
    const antes = posATab(tramos[i - 1].objetivo), ahora = posATab(tramos[i].objetivo);
    if (antes == null || ahora == null || antes === ahora) continue;
    const cruza = (antes <= 1) !== (ahora <= 1);
    if (cruza) {
      cruces++;
      // Cruce limpio o interrumpido: arco o snap, nunca a medias.
      expect(
        esArcoOSnap(tramos[i].minTy),
        `cruce ${tramos[i - 1].objetivo}→${tramos[i].objetivo}: ty=${tramos[i].minTy} a medias`
      ).toBe(true);
    } else {
      noCruces++;
      expect(tramos[i].minTy, `salto ${tramos[i - 1].objetivo}→${tramos[i].objetivo} (NO cruza) mostró un arco fantasma (${tramos[i].minTy})`).toBeGreaterThan(ARCO_UMBRAL);
    }
  }
  expect(cruces, "la ráfaga tiene que haber generado cruces reales").toBeGreaterThan(2);
  expect(noCruces, "la ráfaga tiene que haber generado saltos SIN cruce").toBeGreaterThan(2);
});
