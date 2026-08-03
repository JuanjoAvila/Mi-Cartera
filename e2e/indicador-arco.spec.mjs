/* LA RAYITA (indicador de pestaña activa) TIENE QUE ARQUEAR SOBRE EL + SIEMPRE, A CUALQUIER
 * VELOCIDAD — bug 1 de la sesión del 2026-08-03. Su descripción textual: «la rayita que se mueve
 * al moverse de tab en tab va de puta madre y salta el arco del + de puta madre PERO cuando
 * aumentas la velocidad en moverte entre tabs, sigue atravesando el +, luego si scrolleas más
 * lentamente otra vez, se "arregla" solo y vuelve otra vez a saltar la rayita el logo + de puta
 * madre».
 *
 * Causa real encontrada (11-app-main.js, el `useLayoutEffect` de `indRef`, dep `[tab]`): el salto
 * añade la clase `rodea` (el arco) SOLO cuando el cambio de pestaña cruza el vano del FAB (de
 * Inicio/Gastos a Plan/Cartera o viceversa). Cuando NO cruza, el código hacía `return` sin más —
 * y como React llama al cleanup del efecto ANTERIOR justo antes de correr el siguiente, el
 * `setTimeout` de 460 ms que debía quitar `rodea` tras un cruce real se cancelaba sin que nadie la
 * quitase en su lugar. A velocidad alta (varios cambios de pestaña seguidos, sin dejar los 460 ms
 * de margen) la clase se quedaba PEGADA para siempre, colándose en saltos que no cruzan el + y
 * desordenando cuándo se ve el arco del cruce de verdad — que es justo lo que él describía.
 *
 * Se comprueba MIDIENDO EL translateY REAL del span (el que dibuja el arco) en continuo durante
 * una ráfaga de swipes reales sin ninguna pausa entre ellos — el caso "velocidad alta" llevado al
 * límite de lo que CDP permite simular. No se mira la clase `rodea` por sí sola (podría estar
 * puesta sin que el navegador llegue a pintar el arco): se mira el efecto visual de verdad.
 *
 * La verdad de qué es "cruce" se DERIVA de la secuencia REAL de posiciones observadas (no de un
 * guion fijo de swipes): a velocidad muy alta React puede fusionar varios cambios de pestaña en un
 * solo commit (p.ej. gastos→plan→cartera puede llegar de una sola vez como gastos→cartera), y ESO
 * también es un cruce de verdad. Asumir a priori qué swipe cae en qué commit sería frágil; mirar
 * la posición ANTES y DESPUÉS de cada tramo observado no lo es. */
import { test, expect } from "@playwright/test";
import { seedLoggedInDashboard, dismissNews } from "./fixtures.mjs";

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

/** Arranca un muestreo continuo (rAF) del translateY computado del span del indicador, agrupado
 *  por tramos (cada vez que cambia la posición objetivo = un salto de pestaña distinto). */
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

// translateX(N%) -> índice de pestaña, invirtiendo la fórmula del render (tab<=1 → tab*100,
// tab>1 → (tab+1)*100). 200% no se usa nunca (es el hueco del FAB).
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

test("a velocidad alta, cada cruce real del + arquea y ninguno lo atraviesa recto", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.goto("/");
  await appLista(page);
  const cdp = await page.context().newCDPSession(page);

  await deslizar(page, cdp, "siguiente"); // inicio->gastos, punto de partida
  await page.waitForTimeout(400);
  await arrancarMuestreo(page);

  // Ráfaga de cruces reales gastos<->plan, uno tras otro, SIN esperar a que asiente el anterior.
  for (let i = 0; i < 6; i++) {
    await deslizar(page, cdp, "siguiente"); // gastos->plan (cruza)
    await deslizar(page, cdp, "anterior");  // plan->gastos (cruza)
  }
  await page.waitForTimeout(500);
  const tramos = await pararMuestreoYagrupar(page);

  let comprobados = 0;
  for (let i = 1; i < tramos.length; i++) {
    const antes = posATab(tramos[i - 1].objetivo), ahora = posATab(tramos[i].objetivo);
    if (antes == null || ahora == null || antes === ahora) continue;
    const cruza = (antes <= 1) !== (ahora <= 1);
    if (!cruza) continue; // esta prueba solo tiene cruces reales en su guion
    comprobados++;
    expect(tramos[i].minTy, `salto ${tramos[i - 1].objetivo}→${tramos[i].objetivo} (CRUZA el +) no arqueó (translateY mínimo ${tramos[i].minTy}) — la rayita lo atravesó en línea recta`).toBeLessThan(-15);
  }
  expect(comprobados, "la ráfaga tiene que haber generado varios cruces reales que comprobar").toBeGreaterThan(5);
});

test("un salto que NO cruza el + no hereda el arco de un cruce reciente (bleed-through)", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.goto("/");
  await appLista(page);
  const cdp = await page.context().newCDPSession(page);

  await deslizar(page, cdp, "siguiente"); // inicio->gastos
  await page.waitForTimeout(400);
  await arrancarMuestreo(page);

  // Recorrido de ida y vuelta por las 4 pestañas, mezclando cruces y no-cruces, sin pausas.
  for (let i = 0; i < 4; i++) {
    await deslizar(page, cdp, "siguiente"); // gastos->plan (cruza)
    await deslizar(page, cdp, "siguiente"); // plan->cartera (no cruza)
    await deslizar(page, cdp, "anterior");  // cartera->plan (no cruza)
    await deslizar(page, cdp, "anterior");  // plan->gastos (cruza)
    await deslizar(page, cdp, "anterior");  // gastos->inicio (no cruza)
    await deslizar(page, cdp, "siguiente"); // inicio->gastos (no cruza), vuelve al punto de partida
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
      expect(tramos[i].minTy, `salto ${tramos[i - 1].objetivo}→${tramos[i].objetivo} (CRUZA) no arqueó (${tramos[i].minTy})`).toBeLessThan(-15);
    } else {
      noCruces++;
      expect(tramos[i].minTy, `salto ${tramos[i - 1].objetivo}→${tramos[i].objetivo} (NO cruza) mostró un arco fantasma (${tramos[i].minTy}) heredado de un cruce anterior`).toBeGreaterThan(-15);
    }
  }
  expect(cruces, "la ráfaga tiene que haber generado cruces reales que comprobar").toBeGreaterThan(2);
  expect(noCruces, "la ráfaga tiene que haber generado saltos SIN cruce que comprobar").toBeGreaterThan(2);
});
