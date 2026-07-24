import { test, expect } from "@playwright/test";
import { seedLoggedInDashboard, dismissNews } from "./fixtures.mjs";

/* La CSP (shell.html) es una red de seguridad, pero si se pasa de estricta rompe la app EN
   SILENCIO: el navegador bloquea el recurso, no salta ninguna excepción y simplemente deja de
   funcionar algo (los precios, el login, las actualizaciones…). Y como la app va a los móviles de
   la familia por OTA, eso se descubriría tarde y mal.

   Este test abre la app de verdad y falla si el navegador bloquea CUALQUIER cosa. Si añades una
   llamada a un dominio nuevo y se te olvida ponerlo en la CSP, este test te lo dice aquí. */
function collectCspViolations(page) {
  const violations = [];
  page.on("console", (msg) => {
    const txt = msg.text();
    if (/Content Security Policy|Refused to (load|connect|execute|apply)/i.test(txt)) violations.push(txt);
  });
  // securitypolicyviolation es la señal fiable (console puede filtrarse según el navegador).
  page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      window.__cspViolations.push(`${e.violatedDirective} → ${e.blockedURI}`);
    });
  });
  return violations;
}

test("arranque: la CSP no bloquea nada de la propia app", async ({ page }) => {
  const consoleViolations = collectCspViolations(page);
  await seedLoggedInDashboard(page);
  await page.goto("/");
  await dismissNews(page);
  await page.waitForTimeout(2500);   // deja correr el trabajo diferido (FX, Sentry, OTA)

  const fromEvent = await page.evaluate(() => window.__cspViolations || []);
  expect(
    [...consoleViolations, ...fromEvent],
    "La CSP de src/shell.html está bloqueando algo que la app necesita",
  ).toEqual([]);
});

test("la CSP está puesta y cierra lo que tiene que cerrar", async ({ page }) => {
  await page.goto("/");
  const csp = await page.evaluate(() => {
    const m = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    return m ? m.getAttribute("content").replace(/\s+/g, " ") : null;
  });
  expect(csp, "falta la <meta> de CSP en shell.html").toBeTruthy();
  // Lo que de verdad frena una exfiltración: nada de plugins, nada de <base> inyectado y una
  // lista cerrada de destinos de red (nunca un comodín).
  expect(csp).toContain("object-src 'none'");
  expect(csp).toContain("base-uri 'none'");
  expect(csp).toContain("form-action 'self'");
  expect(csp).toMatch(/connect-src [^;]*sfyfjagbnhbplrljpbvh\.supabase\.co/);
  expect(csp, "connect-src con comodín = la CSP no sirve de nada").not.toMatch(/connect-src [^;]*\*/);
});
