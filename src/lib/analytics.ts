// =============================================================================
// Web Analytics — tracking propio privacy-first para Infinito Water Park
// =============================================================================
//
// Reglas inviolables:
//  - NO se persiste IP, email, nombre, teléfono ni user_id (la tabla
//    web_analytics_events tiene además un trigger que sanitiza metadata).
//  - session_id es anónimo, generado en cliente, expira por 30min de inactividad.
//  - Si tracking falla, NO debe romper la UX: todo va en try/catch silencioso.
//  - INSERT async sin await en el handler que lo dispara → no bloquea UI.
// =============================================================================

import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "infinito-analytics-session";
const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutos

export type AnalyticsEventType =
  | "page_view"
  | "button_click"
  | "banner_click"
  | "slide_click"
  | "oferta_click"
  | "evento_click"
  | "comprar_entrada_click"
  | "whatsapp_click"
  | "mapa_click"
  | "contacto_click";

interface SessionData {
  sessionId: string;
  lastActivityAt: number;
}

interface TrackOptions {
  element_id?: string | null;
  element_label?: string | null;
  page_path?: string | null;          // por defecto location.pathname
  metadata?: Record<string, unknown>; // datos extra libres (sin PII)
}

// =============================================================================
// Detección de device + browser
// =============================================================================
function detectDevice(): "mobile" | "tablet" | "desktop" | "unknown" {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return "tablet";
  if (/Mobile|iPhone|Android/i.test(ua)) return "mobile";
  return "desktop";
}

function detectBrowser(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  // Orden importa: Edge contiene "Chrome", Opera contiene "Chrome/Safari", etc.
  if (/Edg\//.test(ua))                return "Edge";
  if (/OPR\/|Opera/.test(ua))          return "Opera";
  if (/Firefox\//.test(ua))            return "Firefox";
  if (/Chrome\//.test(ua))             return "Chrome";
  if (/Safari\//.test(ua))             return "Safari";
  return "Other";
}

// =============================================================================
// Sesión anónima
// =============================================================================
function readSession(): SessionData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionData>;
    if (typeof parsed.sessionId !== "string" || typeof parsed.lastActivityAt !== "number") return null;
    return parsed as SessionData;
  } catch {
    return null;
  }
}

function writeSession(data: SessionData) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(SESSION_KEY, JSON.stringify(data)); }
  catch { /* ignore: localStorage lleno o bloqueado */ }
}

function newUuid(): string {
  // Preferimos crypto.randomUUID() si está disponible (navegadores modernos)
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try { return crypto.randomUUID(); } catch { /* fallthrough */ }
  }
  // Fallback simple
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function ensureSession(): string {
  const now = Date.now();
  const current = readSession();
  if (current && now - current.lastActivityAt < INACTIVITY_MS) {
    // Renovar timestamp de actividad
    writeSession({ sessionId: current.sessionId, lastActivityAt: now });
    return current.sessionId;
  }
  // Nueva sesión (no había, o expiró por inactividad)
  const sessionId = newUuid();
  writeSession({ sessionId, lastActivityAt: now });
  return sessionId;
}

// =============================================================================
// Referrer corto: hostname o "direct"
// =============================================================================
function shortReferrer(): string {
  if (typeof document === "undefined" || !document.referrer) return "direct";
  try {
    const url = new URL(document.referrer);
    if (typeof window !== "undefined" && url.hostname === window.location.hostname) return "internal";
    return url.hostname;
  } catch {
    return "unknown";
  }
}

// =============================================================================
// trackEvent — API pública
// =============================================================================
// Async pero NO se debe esperar. Patrón de uso recomendado:
//   trackEvent("comprar_entrada_click", { element_label: "CTA hero" });
//
// Si el caller hace `await`, la promesa siempre resuelve sin throw (silent fail).
export async function trackEvent(
  eventType: AnalyticsEventType,
  options: TrackOptions = {},
): Promise<void> {
  try {
    if (typeof window === "undefined") return;

    const sessionId = ensureSession();
    const payload = {
      event_type: eventType,
      page_path:     options.page_path ?? window.location.pathname ?? null,
      element_id:    options.element_id ?? null,
      element_label: options.element_label ?? null,
      referrer:      shortReferrer(),
      device_type:   detectDevice(),
      browser:       detectBrowser(),
      session_id:    sessionId,
      metadata:      options.metadata ?? {},
    };

    // Disparamos sin await en el caller: el INSERT se resuelve en background.
    // El trigger sanitize_web_analytics_metadata limpia PII server-side igual.
    const { error } = await supabase
      .from("web_analytics_events" as never)
      .insert(payload);

    if (error) {
      // Log a consola pero NUNCA bloquear el flujo de UX.
      console.warn("[analytics] insert failed:", error.message);
    }
  } catch (err) {
    console.warn("[analytics] tracking error:", err);
  }
}

// =============================================================================
// Helper: instrumentar un <a> que abre un link externo
// =============================================================================
// Útil para mantener handlers existentes simples. Llama a trackEvent y luego
// ejecuta la acción original (sin esperar).
export function fireAndForget(eventType: AnalyticsEventType, options?: TrackOptions): void {
  void trackEvent(eventType, options);
}
