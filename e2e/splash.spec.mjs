import { test, expect } from "@playwright/test";
import { seedLoggedInDashboard } from "./fixtures.mjs";

/* SPLASH DE ENTRADA — que exista NO es que se vea.
 *
 * En la 4.10.0 el splash estaba dentro de `#root`, y `ReactDOM.createRoot()` VACÍA su contenedor
 * en el primer render: React se lo llevaba por delante en cuanto montaba. Encima, React, ReactDOM
 * y supabase-js iban en el `<head>`, así que el navegador ni siquiera llegaba al `<body>` —no
 * tenía nada que pintar— hasta haberlos ejecutado enteros. Resultado en el móvil del usuario:
 * pantalla negra y ningún splash (vídeo 2026-07-25). Y nada fallaba: el elemento existía en el
 * HTML, así que un grep lo habría dado por bueno.
 *
 * Esto comprueba las tres cosas que tienen que cumplirse para que se VEA.
 */
test("el splash es hermano de #root (React no puede llevárselo)", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.goto("/");
  const dentro = await page.evaluate(() => {
    const l = document.getElementById("mc-load");
    return { existe: !!l, dentroDeRoot: !!(l && l.closest("#root")) };
  });
  expect(dentro.existe).toBe(true);
  expect(dentro.dentroDeRoot).toBe(false);
});

test("los scripts pesados van DESPUÉS del splash, no en el <head>", async ({ page }) => {
  const html = await (await page.request.get("/index.html")).text();
  const splash = html.indexOf('id="mc-load"');
  const cabeza = html.indexOf("</head>");
  expect(splash, "el splash tiene que existir").toBeGreaterThan(0);
  // Si React vuelve a la cabecera, el navegador no pinta nada hasta ejecutarlo entero.
  for (const marca of ["/* React */", "/* ReactDOM */", "vendor/supabase.min.js"]) {
    const pos = html.indexOf(marca);
    expect(pos, `${marca} tiene que ir después del splash`).toBeGreaterThan(splash);
    expect(pos, `${marca} no puede estar en el <head>`).toBeGreaterThan(cabeza);
  }
});

test("se ve de verdad: sigue en pantalla después de que React monte, y luego se va", async ({ page }) => {
  await seedLoggedInDashboard(page);
  await page.goto("/", { waitUntil: "commit" });

  const splash = page.locator("#mc-load");
  // Montado React (#root con contenido) y el splash TODAVÍA encima: eso es lo que fallaba.
  await expect(page.locator("#root > *").first()).toBeAttached({ timeout: 15_000 });
  await expect(splash).toBeVisible();
  await expect(splash.locator(".mcl-mark svg")).toBeVisible();

  // Y no se queda para siempre.
  await expect(splash).toHaveCount(0, { timeout: 10_000 });
});
