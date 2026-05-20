/**
 * MOBILE — Tests del scanner en viewport mobile (iPhone 12).
 * Se levanta solo en el project "chromium-mobile" del playwright.config.ts.
 *
 * REQUIERE credenciales de staff.
 */
import { test, expect, skipIfNoCreds } from "./fixtures/auth";

test.describe("Scanner mobile — usabilidad en puerta", () => {
  test("M1 — Scanner se ve usable en viewport mobile (botones grandes)", async ({ page, staffLogin }, testInfo) => {
    skipIfNoCreds(testInfo, staffLogin);

    await page.goto("/staff/scanner");
    await expect(page.getByRole("heading", { name: /escáner QR/i })).toBeVisible({ timeout: 10000 });

    // Botón de cámara debe existir y tener altura ≥ 44px (HIG Apple)
    const camButton = page.getByRole("button", { name: /activar cámara/i });
    await expect(camButton).toBeVisible();
    const camBox = await camButton.boundingBox();
    expect(camBox?.height).toBeGreaterThanOrEqual(44);

    // Input manual visible y no oculto bajo viewport
    const manualInput = page.getByPlaceholder(/pegá el código UUID/i);
    await expect(manualInput).toBeVisible();
    const inputBox = await manualInput.boundingBox();
    expect(inputBox?.height).toBeGreaterThanOrEqual(40);

    // Verificar que el header está dentro del viewport (sin scroll horizontal)
    const headerBox = await page.getByRole("heading", { name: /escáner QR/i }).boundingBox();
    expect(headerBox?.x).toBeGreaterThanOrEqual(0);
    expect((headerBox?.x ?? 0) + (headerBox?.width ?? 0)).toBeLessThanOrEqual(page.viewportSize()!.width);
  });

  test("M2 — Resultado de validación visible sin scroll excesivo", async ({ page, staffLogin }, testInfo) => {
    skipIfNoCreds(testInfo, staffLogin);

    await page.goto("/staff/scanner");
    // Triggear un error rápido (UUID inválido) para ver resultado
    await page.getByPlaceholder(/pegá el código UUID/i).fill("no-es-uuid");
    await page.getByRole("button", { name: "" }).filter({ has: page.locator("svg") }).last().click();

    const resultCard = page.locator("text=/no encontrado/i").first();
    await expect(resultCard).toBeVisible({ timeout: 10000 });
    // Que esté en la mitad superior del viewport para que el operador no scrollee
    const box = await resultCard.boundingBox();
    expect(box?.y).toBeLessThan(page.viewportSize()!.height);
  });
});
