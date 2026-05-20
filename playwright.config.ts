import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config para QA del flujo QR de Infinito Water Park.
 *
 * Para correr:
 *   1. Tener el dev server arriba: `npm run dev` (puerto 8080)
 *      O configurar QA_BASE_URL en /tmp/qa-creds.env para apuntar a otro host.
 *   2. Crear /tmp/qa-creds.env con credenciales (ver e2e/fixtures/auth.ts).
 *   3. Aplicar el SQL seed previo en Supabase para tener datos controlados.
 *   4. Correr:
 *        npx playwright test                  -- todos
 *        npx playwright test smoke            -- sólo smoke (sin credenciales)
 *        npx playwright test qr-flow          -- flujo QR completo (requiere creds)
 *        npx playwright test --ui             -- modo UI interactivo
 */

// Cargamos credenciales QA desde un archivo fuera del repo (nunca commiteado).
// El archivo puede no existir → los specs que dependen de creds se skipean en runtime.
import { readFileSync } from "node:fs";
function loadQaEnv(): Record<string, string> {
  try {
    const content = readFileSync("/tmp/qa-creds.env", "utf-8");
    const env: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      env[key] = val;
    }
    return env;
  } catch {
    return {};
  }
}
const qaEnv = loadQaEnv();
const baseURL = qaEnv.QA_BASE_URL || "http://localhost:8080";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // los tests de QR comparten estado de DB; mejor secuencial
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],

  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  // Hace disponible el env QA dentro de los tests
  metadata: { qaEnv },

  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["iPhone 12"] },
      testMatch: /.*\.mobile\.spec\.ts/,
    },
  ],

  // Levanta automáticamente el dev server si no está corriendo, sólo cuando
  // baseURL es localhost. Si apuntás a producción, no lo arranca.
  webServer: baseURL.startsWith("http://localhost") ? {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 60_000,
  } : undefined,
});
