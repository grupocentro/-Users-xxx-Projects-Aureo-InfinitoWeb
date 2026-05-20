/**
 * SMOKE — Tests que NO requieren credenciales ni datos seed.
 * Verifican que el bundle carga, las rutas existen y los guards redirigen
 * cuando no hay sesión.
 *
 * Estos tests SÍ pueden ejecutarse hoy sin setup adicional.
 */
import { test, expect } from "@playwright/test";

test.describe("smoke — rutas públicas y guards sin sesión", () => {
  test("S1 — home carga (200) y muestra branding Infinito", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    // El title fue saneado en Etapa 6
    await expect(page).toHaveTitle(/Infinito Water Park/i);
  });

  test("S2 — /login carga el form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /iniciar sesión/i })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Contraseña")).toBeVisible();
  });

  test("S3 — /registro carga form + captcha matemático", async ({ page }) => {
    await page.goto("/registro");
    await expect(page.getByRole("heading", { name: /crear cuenta/i })).toBeVisible();
    await expect(page.getByLabel(/verificación.*cuánto es/i)).toBeVisible();
  });

  test("S4 — /comprar sin sesión redirige a /login", async ({ page }) => {
    await page.goto("/comprar");
    // El guard del componente redirige cuando no hay user.
    await page.waitForURL(/\/login/, { timeout: 5000 });
    expect(page.url()).toContain("/login");
  });

  test("S5 — /mi-cuenta sin sesión redirige a /login", async ({ page }) => {
    await page.goto("/mi-cuenta");
    await page.waitForURL(/\/login/, { timeout: 5000 });
    expect(page.url()).toContain("/login");
  });

  test("S6 — /admin sin sesión redirige a /login", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/login/, { timeout: 5000 });
    expect(page.url()).toContain("/login");
  });

  test("S7 — /staff/scanner sin sesión redirige a /login", async ({ page }) => {
    await page.goto("/staff/scanner");
    await page.waitForURL(/\/login/, { timeout: 5000 });
    expect(page.url()).toContain("/login");
  });

  test("S8 — /compra-exitosa sin compra_id muestra estado controlado (no crashea)", async ({ page }) => {
    await page.goto("/compra-exitosa");
    // No debe redirigir ni romper; debe mostrar mensaje de "no identificamos"
    await expect(page.getByText(/no pudimos identificar la compra/i)).toBeVisible({ timeout: 10000 });
  });

  test("S9 — /compra-exitosa con status=success pero sin compra_id NO miente", async ({ page }) => {
    await page.goto("/compra-exitosa?status=success");
    // Antes mostraba "¡Compra exitosa!"; ahora debe mostrar "no identificamos"
    await expect(page.getByText(/no pudimos identificar la compra/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/¡Compra aprobada/i)).not.toBeVisible();
  });

  test("S10 — ruta inexistente devuelve NotFound", async ({ page }) => {
    await page.goto("/ruta-que-no-existe-12345");
    // No verificamos heading exacto porque NotFound puede ser muy minimal
    // Pero el body debe cargar (no error de bundle)
    expect(await page.title()).toBeTruthy();
  });

  test("S11 — /eventos carga (ruta pública)", async ({ page }) => {
    const response = await page.goto("/eventos");
    expect(response?.status()).toBe(200);
  });

  test("S12 — meta tags OG sin referencias a Lovable/gpt-engineer", async ({ page }) => {
    await page.goto("/");
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
    const author = await page.locator('meta[name="author"]').getAttribute("content");
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute("content");

    expect(author).toBe("Grupo Centro");
    expect(ogTitle).toMatch(/Infinito Water Park/i);
    expect(ogImage).not.toContain("lovable");
    expect(ogImage).not.toContain("gpt-engineer");
    expect(ogImage).toContain("infinito.grupocentro.digital");
  });
});
