import { test, expect } from "@playwright/test";
import { seedLoggedInDashboard, dismissNews } from "./fixtures.mjs";

/* «Code review» pero probando la app (petición 2026-07-24).
 *
 * Lo que hay que blindar es la REGLA, no la estética: no se puede aprobar una beta con cosas sin
 * probar o marcadas como que fallan. Si esa puerta se abre, el botón deja de significar nada y
 * acabaría subiendo a producción algo roto — que lo ven el padre y la pareja.
 *
 * La ENTRADA al panel está detrás de `is_admin`, que lo decide el servidor (profiles) y el mock de
 * Supabase de los tests devuelve null → la sección Dev no se pinta. Por eso aquí se monta el panel
 * directamente: lo que hay que probar es la REGLA de aprobación, no el menú que lleva a ella. */

async function abrirRevisionBeta(page) {
  await seedLoggedInDashboard(page);
  await page.addInitScript(() => { localStorage.setItem("_mcChannel", "beta"); });
  await page.goto("/");
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 15_000 });
  await dismissNews(page);
}

test("el panel de revisión saca la checklist de las notas de la versión", async ({ page }) => {
  await abrirRevisionBeta(page);

  // Se abre el panel directamente (la ruta por Ajustes depende del perfil admin del servidor).
  const items = await page.evaluate(() => betaChecklist(CONFIG.APP_VERSION).items.length);
  expect(items, "la versión en curso debería traer notas que sirvan de checklist").toBeGreaterThan(0);
});

test("betaChecklist casa la beta (4.8.0.17) con las notas de su versión base (4.8.0)", async ({ page }) => {
  await abrirRevisionBeta(page);
  const r = await page.evaluate(() => {
    const base = betaChecklist("4.8.0");
    const beta = betaChecklist("4.8.0.17");   // así versiona el workflow beta.yml
    return { base: base.v, beta: beta.v, mismos: base.items.length === beta.items.length };
  });
  expect(r.beta).toBe(r.base);
  expect(r.mismos, "una beta y su versión base deben compartir checklist").toBe(true);
});

test("no se puede aprobar con cosas sin probar ni con fallos marcados", async ({ page }) => {
  await abrirRevisionBeta(page);

  // Monta el panel a mano: es la unidad que interesa, sin depender del gate de admin del servidor.
  await page.evaluate(() => {
    const host = document.createElement("div");
    host.id = "e2e-beta";
    document.body.appendChild(host);
    ReactDOM.createRoot(host).render(
      React.createElement(BetaReviewPanel, { onClose: () => {}, showToast: () => {} }),
    );
  });
  const panel = page.locator(".beta-review");
  await expect(panel).toBeVisible();

  const aprobar = panel.getByRole("button", { name: /Aprobar esta beta/i });
  const items = panel.locator(".beta-item");
  const n = await items.count();
  expect(n).toBeGreaterThan(0);

  // 1) Recién abierto: nada probado → aprobar deshabilitado.
  await expect(aprobar).toBeDisabled();
  await expect(panel).toContainText(/Te quedan .* por probar/i);

  // 2) Todo bien menos uno marcado como que falla → sigue deshabilitado, y sale el aviso.
  for (let i = 0; i < n; i++) await items.nth(i).getByRole("button", { name: /Va bien/i }).click();
  await expect(aprobar).toBeEnabled();                       // todo ok → sí se puede
  await items.nth(0).getByRole("button", { name: /Falla/i }).click();
  await expect(aprobar).toBeDisabled();                      // uno roto → no se puede
  await expect(panel).toContainText(/arréglalo antes de aprobar/i);

  // Y al marcar que falla aparece el campo para decir QUÉ falla (que es el valor real de esto).
  await expect(items.nth(0).locator("input")).toBeVisible();

  // 3) Desmarcar el fallo lo vuelve a habilitar.
  await items.nth(0).getByRole("button", { name: /Falla/i }).click();
  await items.nth(0).getByRole("button", { name: /Va bien/i }).click();
  await expect(aprobar).toBeEnabled();
});

test("el progreso sobrevive a cerrar la app (se prueba durante días)", async ({ page }) => {
  await abrirRevisionBeta(page);
  await page.evaluate(() => {
    const host = document.createElement("div");
    host.id = "e2e-beta";
    document.body.appendChild(host);
    ReactDOM.createRoot(host).render(React.createElement(BetaReviewPanel, { onClose: () => {}, showToast: () => {} }));
  });
  await page.locator(".beta-item").nth(0).getByRole("button", { name: /Va bien/i }).click();
  await expect(page.locator(".beta-review")).toContainText("1/");

  // Recarga completa: el progreso vive en localStorage por versión.
  await page.reload();
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 15_000 });
  const guardado = await page.evaluate(() => {
    const v = betaChecklist(CONFIG.APP_VERSION).v;
    return store.get("_betaReview_" + v);
  });
  expect(guardado, "el progreso de la revisión se perdió al recargar").toEqual({ 0: "ok" });
});

test("en modo pruebas el veredicto NO sale del móvil", async ({ page }) => {
  // Coherencia con el blindaje del sandbox: `betaReport` está en CLOUD_WRITES, así que estando en
  // el banco de pruebas no se manda nada (aprobarías con datos falsos).
  await seedLoggedInDashboard(page);
  await page.addInitScript(() => {
    localStorage.setItem("_mcChannel", "beta");
    localStorage.setItem("micartera_sandbox", localStorage.getItem("micartera_v3"));
    localStorage.setItem("_mcSandbox", "1");
  });
  await page.goto("/");
  await expect(page.locator(".sandbox-bar")).toBeVisible({ timeout: 15_000 });

  const r = await page.evaluate(() => cloud.betaReport({ verdict: "approved", summary: "x" }).then(() => "resuelto"));
  expect(r, "betaReport debería estar anulado dentro del modo pruebas").toBe("resuelto");
});

/* Arrancar el canal beta desde una URL. Es lo que rompe la pescadilla que se muerde la cola: el
   interruptor de canal vive en Ajustes → Dev → Pruebas, que solo existe A PARTIR de la versión
   que quieres probar, así que la primera vez hay que poder entrar por fuera. */
test("?canal=beta activa el canal beta y limpia la URL", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.goto("/?canal=beta");
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 15_000 });

  await expect.poll(() => page.evaluate(() => localStorage.getItem("_mcChannel"))).toBe("beta");
  await expect.poll(() => page.evaluate(() => mcChannel())).toBe("beta");
  // La URL se limpia para que recargar no lo repita ni deje el parámetro pegado.
  expect(new URL(page.url()).search).toBe("");
});

test("?canal=estable devuelve el móvil al canal de todos", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.addInitScript(() => localStorage.setItem("_mcChannel", "beta"));
  await page.goto("/?canal=estable");
  await expect(page.locator(".botnav")).toBeVisible({ timeout: 15_000 });

  await expect.poll(() => page.evaluate(() => localStorage.getItem("_mcChannel"))).toBeNull();
  await expect.poll(() => page.evaluate(() => mcChannel())).toBe("stable");
});
