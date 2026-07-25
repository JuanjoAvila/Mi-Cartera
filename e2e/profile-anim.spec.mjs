import { test, expect } from "@playwright/test";
import { seedLoggedInDashboard } from "./fixtures.mjs";

// Móvil + táctil: el gesto del perfil es touch-only (onTouchStart/Move/End).
// Alto 1800: el contenido del perfil (~1680px) debe CABER sin scroll — si hay scroll, al top
// tirar abajo cierra; con scrollTop>0 el gesto cede al scroll (comportamiento correcto).
test.use({ viewport: { width: 375, height: 1800 }, hasTouch: true });

// Perfil tipo Revolut (v4.0.11): el panel ENTERO escala desde el avatar (vídeo 2026-07-17).
// Se comprueba lo que NO se ve leyendo el código: que el origin queda anclado al avatar real,
// que el open llega a scale(1) y que al cerrar vuelve a la miniatura escondida.
test("Perfil: escala desde el avatar y vuelve a él al cerrar", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.goto("/");
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 15_000 });
  // El splash tapa la pantalla hasta ~1,8 s (y sí, se come los toques: es un overlay opaco).
  // Los toques por CDP van a lo que esté ARRIBA, así que hay que esperar a que se retire.
  await page.locator("#mc-load").waitFor({ state: "detached", timeout: 15_000 });
  const dismissNews = page.getByRole("button", { name: /Entendido|Got it/i });
  if (await dismissNews.count()) await dismissNews.first().click();

  // Cerrado: miniatura invisible (scale s0, opacity 0) que no roba toques.
  const panel = page.locator(".profile-pull");
  await expect(panel).toHaveCSS("visibility", "hidden");

  await page.locator(".v4-avatar").click();
  await expect(panel).toHaveClass(/open/, { timeout: 5_000 });

  // El origin se midió sobre el avatar REAL: |origin.x − centro del avatar| < 2 px.
  const av = await page.locator(".v4-avatar").boundingBox();
  const origin = await panel.evaluate((el) => ({
    ox: parseFloat(el.style.getPropertyValue("--pp-ox")),
    oy: parseFloat(el.style.getPropertyValue("--pp-oy")),
    s0: parseFloat(el.style.getPropertyValue("--pp-s0")),
    left: el.offsetLeft, width: el.offsetWidth,
  }));
  expect(Math.abs(origin.ox + origin.left - (av.x + av.width / 2))).toBeLessThan(2);
  expect(Math.abs(origin.s0 - av.width / origin.width)).toBeLessThan(0.02);

  // Abierto del todo: la transición debe llegar a scale(1) y el blur del fondo a opacidad 1.
  await expect(panel).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)", { timeout: 3_000 });
  await expect(page.locator(".profile-dim-layer")).toHaveCSS("opacity", "1", { timeout: 3_000 });

  // Cerrar con ✕ → vuelve a la miniatura (scale s0) y desaparece.
  await page.locator(".profile-pull-h .back").click();
  await expect(panel).not.toHaveClass(/open/);
  await expect(panel).toHaveCSS("visibility", "hidden", { timeout: 3_000 });
});

// El gesto REAL con el dedo (CDP touch): pull-down en Inicio abre siguiendo el dedo
// (progress-driven, no un toggle) y tirar ABAJO dentro del perfil lo encoge y cierra (reversa).
test("Perfil: pull-down con el dedo abre; tirar abajo cierra", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.goto("/");
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 15_000 });
  // El splash tapa la pantalla hasta ~1,8 s (y sí, se come los toques: es un overlay opaco).
  // Los toques por CDP van a lo que esté ARRIBA, así que hay que esperar a que se retire.
  await page.locator("#mc-load").waitFor({ state: "detached", timeout: 15_000 });
  const dismissNews = page.getByRole("button", { name: /Entendido|Got it/i });
  if (await dismissNews.count()) await dismissNews.first().click();

  const cdp = await page.context().newCDPSession(page);
  const panel = page.locator(".profile-pull");

  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 187, y: 260 }] });
  for (let i = 1; i <= 8; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 187, y: 260 + i * 48 }] });
  }
  // A mitad de gesto el panel está en modo arrastre (transición off, visible).
  await expect(panel).toHaveClass(/dragging/);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(panel).toHaveClass(/open/, { timeout: 3_000 });
  await expect(panel).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)", { timeout: 3_000 });

  // Cerrar: arriba → abajo (reversa al avatar), misma curva que la entrada.
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 187, y: 120 }] });
  for (let i = 1; i <= 8; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 187, y: 120 + i * 48 }] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(panel).not.toHaveClass(/open/, { timeout: 3_000 });
  await expect(panel).toHaveCSS("visibility", "hidden", { timeout: 3_000 });
});

/* A TAMAÑO DE MÓVIL DE VERDAD (Pixel 5, 393x851) el contenido del perfil (~1.680 px) NO cabe:
   el panel scrollea. Y ahí es donde el gesto se rompía, que es lo que el usuario grabó el
   2026-07-25 («las settings de perfil al volver aún no funciona bien»): el perfil y el Resumen
   turnándose a toda velocidad, sin llegar a cerrar. Los dos tests de arriba nunca lo vieron
   porque usan un viewport de 1.800 px de alto justo para que quepa sin scroll. */
test.describe("Perfil en un móvil de verdad (el panel scrollea)", () => {
  test.use({ viewport: { width: 393, height: 851 }, hasTouch: true });

  async function abrirPerfil(page) {
    await seedLoggedInDashboard(page);
    await page.goto("/");
    await expect(page.locator(".botnav")).toBeVisible({ timeout: 15_000 });
  // El splash tapa la pantalla hasta ~1,8 s (y sí, se come los toques: es un overlay opaco).
  // Los toques por CDP van a lo que esté ARRIBA, así que hay que esperar a que se retire.
  await page.locator("#mc-load").waitFor({ state: "detached", timeout: 15_000 });
    const dn = page.getByRole("button", { name: /Entendido|Got it/i });
    if (await dn.count()) await dn.first().click();
    await page.locator(".v4-avatar").click();
    const panel = page.locator(".profile-pull");
    await expect(panel).toHaveClass(/open/, { timeout: 5_000 });
    await expect(panel).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)", { timeout: 3_000 });
    return panel;
  }

  test("cerrar con el perfil scrolleado: el scroll primero, y luego encoge SIN saltar", async ({ page }) => {
    const panel = await abrirPerfil(page);
    await expect(panel).toHaveJSProperty("scrollTop", 0);
    await panel.evaluate((el) => { el.scrollTop = 420; });

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 190, y: 300 }] });
    const escalas = [];
    for (let i = 1; i <= 20; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 190, y: 300 + i * 30 }] });
      escalas.push(await panel.evaluate((el) => ({
        sc: +getComputedStyle(el).transform.split("(")[1].split(",")[0],
        st: el.scrollTop,
      })));
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    // Mientras quede scroll, el dedo es del scroll: el panel no se encoge ni un poco.
    for (const p of escalas) if (p.st > 0) expect(p.sc).toBeGreaterThan(0.999);

    /* Y al llegar arriba el cierre arranca DESDE el tamaño real, no de un salto. Antes, `ddy`
       seguía contando desde donde empezaste a scrollear, así que el primer frame con
       scrollTop=0 clavaba el panel en la miniatura (medido: 1,000 → 0,122 de golpe); con el
       rebote del scroll volvía a pantalla completa, y así una y otra vez. */
    const trasScroll = escalas.filter((p) => p.st === 0 && p.sc < 0.999);
    expect(trasScroll.length).toBeGreaterThan(0);
    expect(trasScroll[0].sc).toBeGreaterThan(0.6);
    await expect(panel).not.toHaveClass(/open/, { timeout: 3_000 });
  });

  test("abrir tirando: el panel va OPACO, sin mezclar las dos pantallas", async ({ page }) => {
    await seedLoggedInDashboard(page);
    await page.goto("/");
    await expect(page.locator(".botnav")).toBeVisible({ timeout: 15_000 });
  // El splash tapa la pantalla hasta ~1,8 s (y sí, se come los toques: es un overlay opaco).
  // Los toques por CDP van a lo que esté ARRIBA, así que hay que esperar a que se retire.
  await page.locator("#mc-load").waitFor({ state: "detached", timeout: 15_000 });
    const dn = page.getByRole("button", { name: /Entendido|Got it/i });
    if (await dn.count()) await dn.first().click();

    const panel = page.locator(".profile-pull");
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 190, y: 200 }] });
    const frames = [];
    for (let i = 1; i <= 10; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 190, y: 200 + i * 30 }] });
      frames.push(await panel.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { op: +cs.opacity, br: cs.borderRadius, sc: +cs.transform.split("(")[1].split(",")[0] };
      }));
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    /* La 4.9.1 quitó el fundido AL CERRAR y dio por hecho que abrir no lo tenía. Sí lo tenía
       (`opacity: resist*3`): el primer tercio del tirón enseñaba el perfil y el Resumen a la
       vez, los dos legibles. Y el radio se interpolaba por frame, que obliga a repintar la
       pantalla entera en cada touchmove — el «va a tirones» del vídeo. */
    for (const f of frames) {
      expect(f.op).toBe(1);
      expect(f.br).toBe("24px");
    }
    // Y lo que sí se mueve, la escala, crece con el dedo.
    expect(frames[frames.length - 1].sc).toBeGreaterThan(frames[0].sc);
    await expect(panel).toHaveClass(/open/, { timeout: 3_000 });
  });
});
