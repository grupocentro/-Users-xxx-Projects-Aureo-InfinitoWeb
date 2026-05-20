// =============================================================================
// access-control.ts — utilidades del PIN gate y autorización por rol
// =============================================================================
// El PIN es una barrera visual previa al login (no reemplaza Supabase Auth).
// Se compara por hash SHA-256 — el PIN nunca aparece en texto plano en el código.
//
// Para rotar el PIN sin recompilar el frontend, exportar `VITE_LOGIN_PIN_HASH`
// como variable de entorno con el hash hex (64 chars). Se prioriza sobre el
// fallback hardcodeado. Generar el hash con:
//   echo -n "TU_PIN" | shasum -a 256 | awk '{print $1}'
//
// Expiración del PIN: 60 segundos desde el unlock. Si en ese plazo el usuario
// no inicia sesión, el PIN vence y se vuelve a pedir. Si el usuario logra
// loguearse, el PIN deja de ser relevante hasta el próximo logout (en el cual
// se limpia automáticamente via supabase.auth.onAuthStateChange → SIGNED_OUT).
// =============================================================================

import { supabase } from "@/integrations/supabase/client";

export const PIN_OK_KEY    = "infinito-pin-ok";
export const PIN_AT_KEY    = "infinito-pin-unlocked-at";
export const PIN_TTL_MS    = 60_000; // 60 segundos

// Fallback: hash del PIN temporal actual ("369369").
// Cuando se decida rotarlo, recalcular el hash y, idealmente, mover el valor
// a una env var pública (VITE_LOGIN_PIN_HASH). Reemplazar este literal NO es
// menos seguro que tenerlo en .env porque ambos viajan al cliente.
const FALLBACK_PIN_HASH =
  "0ac40d976122b3fee3d9319ca58d77586ef4252394a443426f815b73ae5ec9bd";

function expectedPinHash(): string {
  const fromEnv = (import.meta.env.VITE_LOGIN_PIN_HASH ?? "").trim().toLowerCase();
  if (/^[0-9a-f]{64}$/.test(fromEnv)) return fromEnv;
  return FALLBACK_PIN_HASH;
}

// Devuelve el hash hexadecimal SHA-256 del texto dado, usando WebCrypto.
async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(hashBuffer));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Compara el PIN ingresado contra el hash esperado. Solo retorna true si el
// hash calculado coincide exactamente (case-insensitive). Nunca compara el PIN
// en texto plano contra una constante.
export async function validatePin(pin: string): Promise<boolean> {
  const trimmed = pin.trim();
  if (!/^\d{4,8}$/.test(trimmed)) return false;
  const hash = await sha256Hex(trimmed);
  return hash === expectedPinHash();
}

// =============================================================================
// Estado del PIN en sessionStorage (no localStorage: expira al cerrar tab)
// =============================================================================

// Indica si el PIN se ingresó correctamente y todavía está dentro del TTL.
// Una vez vencido, limpia el sessionStorage de forma defensiva.
export function isPinUnlockValid(): boolean {
  try {
    const ok = window.sessionStorage.getItem(PIN_OK_KEY) === "true";
    if (!ok) return false;
    const atStr = window.sessionStorage.getItem(PIN_AT_KEY);
    const at = atStr ? Number(atStr) : 0;
    if (!Number.isFinite(at) || at <= 0) {
      clearPinSession();
      return false;
    }
    const elapsed = Date.now() - at;
    if (elapsed >= PIN_TTL_MS) {
      clearPinSession();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Milisegundos restantes antes de que expire el PIN unlock.
// Devuelve 0 si no hay PIN válido. Útil para programar un setTimeout exacto.
export function pinUnlockRemainingMs(): number {
  try {
    if (window.sessionStorage.getItem(PIN_OK_KEY) !== "true") return 0;
    const atStr = window.sessionStorage.getItem(PIN_AT_KEY);
    const at = atStr ? Number(atStr) : 0;
    if (!Number.isFinite(at) || at <= 0) return 0;
    return Math.max(0, PIN_TTL_MS - (Date.now() - at));
  } catch {
    return 0;
  }
}

// Marca el PIN como ingresado correctamente, con timestamp.
export function markPinUnlocked(): void {
  try {
    window.sessionStorage.setItem(PIN_OK_KEY, "true");
    window.sessionStorage.setItem(PIN_AT_KEY, String(Date.now()));
  } catch {
    /* sessionStorage bloqueado: operamos solo en memoria */
  }
}

// Limpia el PIN — usado en expiración, logout o reset manual.
export function clearPinSession(): void {
  try {
    window.sessionStorage.removeItem(PIN_OK_KEY);
    window.sessionStorage.removeItem(PIN_AT_KEY);
  } catch {
    /* ignore */
  }
}

// Idempotente: registra un único listener de Supabase Auth que limpia el PIN
// cuando ocurre un SIGNED_OUT. Debe llamarse una sola vez en el bootstrap
// (main.tsx). Llamadas extra son no-op.
let _listenerInstalled = false;
export function installPinSessionListener(): void {
  if (_listenerInstalled || typeof window === "undefined") return;
  _listenerInstalled = true;
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") clearPinSession();
  });
}


// =============================================================================
// Autorización por rol → panel
// =============================================================================
export type AppRole = "admin" | "editor" | "control_entradas";
export type LoginPanel = "web" | "ticketera" | "sistemas";

export function canAccessWeb(role: AppRole | null): boolean {
  return role === "admin" || role === "editor";
}

export function canAccessTicketera(role: AppRole | null): boolean {
  // Vía Panel Ticketera: admin → /admin/ticketera · control_entradas → /staff/scanner.
  return role === "admin" || role === "control_entradas";
}

export function canAccessSistemas(role: AppRole | null): boolean {
  // Panel Sistemas (administración interna) es estrictamente admin-only.
  return role === "admin";
}

// Resuelve la URL destino post-login según panel elegido + rol.
// Devuelve null si el rol no tiene permiso para el panel elegido.
export function resolveDestination(
  panel: LoginPanel,
  role: AppRole | null,
): string | null {
  if (panel === "web") {
    if (!canAccessWeb(role)) return null;
    return "/admin/web";
  }
  if (panel === "ticketera") {
    if (role === "admin") return "/admin/ticketera";
    if (role === "control_entradas") return "/staff/scanner";
    return null;
  }
  if (panel === "sistemas") {
    if (!canAccessSistemas(role)) return null;
    return "/admin/sistemas";
  }
  return null;
}
