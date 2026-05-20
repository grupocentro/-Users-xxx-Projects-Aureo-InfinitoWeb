/**
 * Auth fixtures — login programático sin pasar por la UI cada vez.
 *
 * Las credenciales viven en /tmp/qa-creds.env (NUNCA en el repo).
 * Cada fixture levanta una sesión Supabase válida y la inyecta como cookie/storage
 * del browser antes del test.
 *
 * Si las credenciales faltan, los tests que dependen del fixture se skipean
 * automáticamente con un mensaje claro.
 */
import { test as base, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

type Role = "admin" | "staff" | "buyer";

interface QaEnv {
  QA_ADMIN_EMAIL?: string;
  QA_ADMIN_PASSWORD?: string;
  QA_STAFF_EMAIL?: string;
  QA_STAFF_PASSWORD?: string;
  QA_BUYER_EMAIL?: string;
  QA_BUYER_PASSWORD?: string;
  QA_BASE_URL?: string;
  COMPRA_APROBADA_ID?: string;
  COMPRA_PENDIENTE_ID?: string;
  COMPRA_MISMATCH_ID?: string;
  QR_VALIDO_SIN_USAR?: string;
  QR_YA_USADO?: string;
}

function loadQaEnv(): QaEnv {
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
    return env as QaEnv;
  } catch {
    return {};
  }
}
export const qaEnv: QaEnv = loadQaEnv();

// Leemos las VITE_ del proyecto local (frontend env).
function loadFrontendEnv(): { url: string; anonKey: string } {
  try {
    const content = readFileSync(".env", "utf-8");
    let url = "";
    let key = "";
    for (const line of content.split("\n")) {
      if (line.startsWith("VITE_SUPABASE_URL=")) {
        url = line.split("=")[1].replace(/^["']|["']$/g, "").trim();
      }
      if (line.startsWith("VITE_SUPABASE_PUBLISHABLE_KEY=")) {
        key = line.split("=")[1].replace(/^["']|["']$/g, "").trim();
      }
    }
    return { url, anonKey: key };
  } catch {
    return { url: "", anonKey: "" };
  }
}
const supaCfg = loadFrontendEnv();

function getCreds(role: Role): { email: string; password: string } | null {
  switch (role) {
    case "admin":
      return qaEnv.QA_ADMIN_EMAIL && qaEnv.QA_ADMIN_PASSWORD
        ? { email: qaEnv.QA_ADMIN_EMAIL, password: qaEnv.QA_ADMIN_PASSWORD }
        : null;
    case "staff":
      return qaEnv.QA_STAFF_EMAIL && qaEnv.QA_STAFF_PASSWORD
        ? { email: qaEnv.QA_STAFF_EMAIL, password: qaEnv.QA_STAFF_PASSWORD }
        : null;
    case "buyer":
      return qaEnv.QA_BUYER_EMAIL && qaEnv.QA_BUYER_PASSWORD
        ? { email: qaEnv.QA_BUYER_EMAIL, password: qaEnv.QA_BUYER_PASSWORD }
        : null;
  }
}

/**
 * Loguea programáticamente vía Supabase (sin UI), obtiene la sesión y la
 * inyecta en el localStorage del browser bajo la clave que Supabase usa.
 */
async function loginAsRole(page: import("@playwright/test").Page, role: Role) {
  const creds = getCreds(role);
  if (!creds) {
    return { ok: false as const, reason: `Falta QA_${role.toUpperCase()}_EMAIL/PASSWORD en /tmp/qa-creds.env` };
  }
  if (!supaCfg.url || !supaCfg.anonKey) {
    return { ok: false as const, reason: "Falta VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en .env" };
  }

  const sb: SupabaseClient = createClient(supaCfg.url, supaCfg.anonKey);
  const { data, error } = await sb.auth.signInWithPassword(creds);
  if (error || !data.session) {
    return { ok: false as const, reason: `Login Supabase falló: ${error?.message ?? "sin session"}` };
  }

  // Supabase JS v2 usa la clave: sb-<project-ref>-auth-token
  const projectRef = supaCfg.url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!projectRef) {
    return { ok: false as const, reason: "No se pudo extraer project_ref de VITE_SUPABASE_URL" };
  }
  const storageKey = `sb-${projectRef}-auth-token`;
  const storageValue = JSON.stringify(data.session);

  // Inyectar en el browser antes de navegar
  await page.addInitScript(({ k, v }) => {
    localStorage.setItem(k, v);
  }, { k: storageKey, v: storageValue });

  return { ok: true as const, userId: data.user!.id, email: creds.email };
}

type Fixtures = {
  adminLogin: { ok: true; userId: string; email: string } | { ok: false; reason: string };
  staffLogin: { ok: true; userId: string; email: string } | { ok: false; reason: string };
  buyerLogin: { ok: true; userId: string; email: string } | { ok: false; reason: string };
};

export const test = base.extend<Fixtures>({
  adminLogin: async ({ page }, use) => {
    const result = await loginAsRole(page, "admin");
    await use(result);
  },
  staffLogin: async ({ page }, use) => {
    const result = await loginAsRole(page, "staff");
    await use(result);
  },
  buyerLogin: async ({ page }, use) => {
    const result = await loginAsRole(page, "buyer");
    await use(result);
  },
});

export { expect };

/** Helper para skipear test si la credencial necesaria falta. */
export function skipIfNoCreds(
  test: import("@playwright/test").TestInfo,
  loginResult: { ok: boolean; reason?: string }
) {
  if (!loginResult.ok) {
    test.skip(true, `BLOQUEADO: ${"reason" in loginResult ? loginResult.reason : "credenciales faltantes"}`);
  }
}

/** Helper para skipear si falta un UUID de datos seed. */
export function skipIfNoSeed(
  test: import("@playwright/test").TestInfo,
  key: keyof QaEnv
) {
  if (!qaEnv[key]) {
    test.skip(true, `BLOQUEADO: falta ${key} en /tmp/qa-creds.env (correr SQL seed primero)`);
  }
}
