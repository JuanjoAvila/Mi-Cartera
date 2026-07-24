import { defineConfig, devices } from "@playwright/test";

// Algunos entornos (contenedores de CI, Claude Code en la web) traen Chromium ya instalado en
// una ruta fija y sin el `headless shell` que espera la versión de Playwright del package.json.
// Con PLAYWRIGHT_CHROMIUM_PATH apuntamos al binario existente en vez de fallar con
// «Executable doesn't exist» (pasó al montar el entorno de pruebas — 2026-07-24).
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
const launchOptions = chromiumPath ? { executablePath: chromiumPath } : {};

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  // La app es móvil-first: si los e2e corren en escritorio se cuelan bugs que solo se ven a
  // 390px (barras que tapan botones, sheets que no caben). Todo se prueba en viewport de móvil.
  use: {
    ...devices["Pixel 5"],
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
    launchOptions,
  },
  webServer: {
    command: "npx --yes serve public -l 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
