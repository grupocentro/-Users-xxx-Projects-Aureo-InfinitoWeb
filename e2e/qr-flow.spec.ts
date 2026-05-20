/**
 * QR-FLOW — Tests del flujo completo de validación QR.
 *
 * REQUIERE:
 *   - /tmp/qa-creds.env con credenciales de admin/staff/buyer.
 *   - SQL seed previo (ver instrucciones en el chat).
 *   - UUIDs en /tmp/qa-creds.env: COMPRA_APROBADA_ID, QR_VALIDO_SIN_USAR, etc.
 *
 * Cada test que requiere algo faltante se SKIPEA con motivo claro
 * (no falla silencioso).
 *
 * Estos tests NO simulan pago MP (eso requiere interacción humana con
 * Checkout Sandbox). Los datos los precarga el SQL seed.
 */
import { test, expect, qaEnv, skipIfNoCreds, skipIfNoSeed } from "./fixtures/auth";

test.describe("QR Flow — auditoría integral del sistema de tickets", () => {

  // ─── TEST 1 — Comprador ve sus QR ────────────────────────────────────────
  test("T1 — Comprador logueado ve compras y QR en /mi-cuenta", async ({ page, buyerLogin }, testInfo) => {
    skipIfNoCreds(testInfo, buyerLogin);

    await page.goto("/mi-cuenta");
    await expect(page.getByRole("heading", { name: /mi cuenta/i })).toBeVisible({ timeout: 10000 });

    // Tab QR debe estar activo por default y mostrar al menos uno
    const qrTab = page.getByRole("tab", { name: /QR/i });
    await expect(qrTab).toBeVisible();
    await qrTab.click();

    // Si hay QR: aparece al menos un SVG. Si no, aparece el empty state.
    const hasQr = await page.locator("svg").first().isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasQr) {
      testInfo.skip(true, "BLOQUEADO: el comprador no tiene QR. Correr SQL seed.");
    }

    // Tab Compras debe mostrar al menos la compra aprobada
    await page.getByRole("tab", { name: /Compras/i }).click();
    await expect(page.getByText(/aprobado/i).first()).toBeVisible();
  });

  // ─── TEST 2 — Usuario común NO accede al scanner ─────────────────────────
  test("T2 — Buyer (sin rol staff) intenta /staff/scanner → redirect", async ({ page, buyerLogin }, testInfo) => {
    skipIfNoCreds(testInfo, buyerLogin);

    await page.goto("/staff/scanner");
    // Componente redirige a "/" cuando role !== admin && !== staff
    await page.waitForURL((url) => !url.pathname.startsWith("/staff"), { timeout: 5000 });
    expect(page.url()).not.toContain("/staff/scanner");
  });

  // ─── TEST 3 — Staff accede al scanner ────────────────────────────────────
  test("T3 — Staff (control_entradas) accede a /staff/scanner", async ({ page, staffLogin }, testInfo) => {
    skipIfNoCreds(testInfo, staffLogin);

    await page.goto("/staff/scanner");
    await expect(page.getByRole("heading", { name: /escáner QR/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /activar cámara/i })).toBeVisible();
    await expect(page.getByPlaceholder(/pegá el código UUID/i)).toBeVisible();
  });

  // ─── TEST 4 — Validación manual de QR válido ─────────────────────────────
  test("T4 — Staff valida QR válido y marca usado", async ({ page, staffLogin }, testInfo) => {
    skipIfNoCreds(testInfo, staffLogin);
    skipIfNoSeed(testInfo, "QR_VALIDO_SIN_USAR");

    await page.goto("/staff/scanner");
    await page.getByPlaceholder(/pegá el código UUID/i).fill(qaEnv.QR_VALIDO_SIN_USAR!);
    await page.getByRole("button", { name: "" }).filter({ has: page.locator("svg") }).last().click();

    // Esperar resultado verde
    await expect(page.getByText(/entrada válida/i)).toBeVisible({ timeout: 10000 });
    // Datos del comprador deberían aparecer si la RPC los devolvió
    // (no fallamos si no aparecen — depende de los datos)
  });

  // ─── TEST 5 — Reutilización del mismo QR → "ya usado" ────────────────────
  test("T5 — Segunda validación del MISMO QR devuelve ya_usado", async ({ page, staffLogin }, testInfo) => {
    skipIfNoCreds(testInfo, staffLogin);
    skipIfNoSeed(testInfo, "QR_VALIDO_SIN_USAR");

    // Asume que T4 ya corrió. Si T4 se skipeó, este también skipea.
    await page.goto("/staff/scanner");
    await page.getByPlaceholder(/pegá el código UUID/i).fill(qaEnv.QR_VALIDO_SIN_USAR!);
    await page.getByRole("button", { name: "" }).filter({ has: page.locator("svg") }).last().click();

    await expect(page.getByText(/ya utilizado|ya usado/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/entrada válida/i)).not.toBeVisible();
  });

  // ─── TEST 6 — QR inexistente ─────────────────────────────────────────────
  test("T6 — UUID inexistente devuelve no_encontrado", async ({ page, staffLogin }, testInfo) => {
    skipIfNoCreds(testInfo, staffLogin);

    await page.goto("/staff/scanner");
    await page.getByPlaceholder(/pegá el código UUID/i).fill("00000000-0000-0000-0000-000000000000");
    await page.getByRole("button", { name: "" }).filter({ has: page.locator("svg") }).last().click();

    await expect(page.getByText(/no encontrado/i)).toBeVisible({ timeout: 10000 });
  });

  // ─── TEST 7 — QR de compra payment_mismatch ──────────────────────────────
  test("T7 — QR de compra payment_mismatch devuelve compra_no_aprobada", async ({ page, staffLogin }, testInfo) => {
    skipIfNoCreds(testInfo, staffLogin);
    skipIfNoSeed(testInfo, "COMPRA_MISMATCH_ID");

    // Necesitamos el uuid_code del QR de la compra mismatch. Lo extrae el SQL seed.
    // Por ahora skipeamos si no está documentado en /tmp/qa-creds.env.
    const mismatchQr = (qaEnv as Record<string, string | undefined>)["QR_MISMATCH"];
    if (!mismatchQr) {
      testInfo.skip(true, "BLOQUEADO: falta QR_MISMATCH en /tmp/qa-creds.env (agregar al SQL seed)");
    }

    await page.goto("/staff/scanner");
    await page.getByPlaceholder(/pegá el código UUID/i).fill(mismatchQr!);
    await page.getByRole("button", { name: "" }).filter({ has: page.locator("svg") }).last().click();

    await expect(page.getByText(/compra no aprobada/i)).toBeVisible({ timeout: 10000 });
  });

  // ─── TEST 8 — Atomicidad: doble validación concurrente ───────────────────
  test("T8 — Dos validaciones paralelas del mismo QR → sólo una válida", async ({ request }, testInfo) => {
    skipIfNoCreds(testInfo, { ok: !!(qaEnv.QA_STAFF_EMAIL && qaEnv.QA_STAFF_PASSWORD), reason: "Falta staff creds" });
    skipIfNoSeed(testInfo, "QR_VALIDO_SIN_USAR");

    // Test concurrencia vía HTTP directo a la RPC (más confiable que 2 browsers).
    // Necesita: VITE_SUPABASE_URL + token de staff. Lo construimos con supabase-js.
    const { createClient } = await import("@supabase/supabase-js");
    const { readFileSync } = await import("node:fs");
    const env = readFileSync(".env", "utf-8");
    const url = env.match(/VITE_SUPABASE_URL=["']?([^"\n]+)["']?/)?.[1] ?? "";
    const anon = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY=["']?([^"\n]+)["']?/)?.[1] ?? "";

    const sb = createClient(url, anon);
    const { data: session } = await sb.auth.signInWithPassword({
      email: qaEnv.QA_STAFF_EMAIL!,
      password: qaEnv.QA_STAFF_PASSWORD!,
    });
    if (!session?.session) {
      testInfo.skip(true, "BLOQUEADO: no se pudo loguear staff para HTTP test");
    }

    const uuid = qaEnv.QR_VALIDO_SIN_USAR!;

    // 2 invocaciones EN PARALELO
    const [r1, r2] = await Promise.all([
      sb.rpc("validar_qr" as never, { _uuid_code: uuid } as never),
      sb.rpc("validar_qr" as never, { _uuid_code: uuid } as never),
    ]);

    const d1 = r1.data as { ok: boolean; resultado: string } | null;
    const d2 = r2.data as { ok: boolean; resultado: string } | null;

    const validos = [d1, d2].filter((d) => d?.resultado === "valido").length;
    const yaUsados = [d1, d2].filter((d) => d?.resultado === "ya_usado").length;

    // Si el QR ya estaba usado de un test previo, ambos vuelven ya_usado: válido también
    expect(validos).toBeLessThanOrEqual(1);
    if (validos === 1) {
      expect(yaUsados).toBe(1);
    } else {
      expect(yaUsados).toBe(2);
    }
  });

  // ─── TEST 9 — Admin ve auditoría qr_validaciones ─────────────────────────
  test("T9 — Admin ve tab Validaciones en /admin/tickets con registros", async ({ page, adminLogin }, testInfo) => {
    skipIfNoCreds(testInfo, adminLogin);

    await page.goto("/admin/tickets");
    await expect(page.getByRole("heading", { name: /tickets/i })).toBeVisible({ timeout: 10000 });

    const validacionesTab = page.getByRole("tab", { name: /validaciones/i });
    await expect(validacionesTab).toBeVisible();
    await validacionesTab.click();

    // Header del tab
    await expect(page.getByText(/auditoría append-only/i)).toBeVisible();
    // Botón actualizar
    await expect(page.getByRole("button", { name: /actualizar/i })).toBeVisible();
  });

  // ─── TEST 10 — Mobile scanner usable ─────────────────────────────────────
  // Este test corre en chromium-mobile project (configurado en playwright.config.ts).
  // Está en archivo .mobile.spec.ts separado para que el matcher de project lo levante.
});
