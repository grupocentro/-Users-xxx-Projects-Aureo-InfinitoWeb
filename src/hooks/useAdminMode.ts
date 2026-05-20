import { useCallback, useEffect, useState } from "react";

// Modos del panel admin. "sistema" (singular, legacy) se normaliza a "ticketera"
// para que sesiones previas no rompan tras el rename.
export type AdminMode = "web" | "ticketera" | "sistemas";

const STORAGE_KEY = "infinito-admin-mode";

function normalize(raw: string | null): AdminMode | null {
  if (raw === "web" || raw === "ticketera" || raw === "sistemas") return raw;
  if (raw === "sistema") return "ticketera"; // backwards-compat con Fase 1/2
  return null;
}

function readStoredMode(): AdminMode | null {
  if (typeof window === "undefined") return null;
  try { return normalize(window.localStorage.getItem(STORAGE_KEY)); }
  catch { return null; }
}

export function useAdminMode() {
  const [mode, setModeState] = useState<AdminMode | null>(() => readStoredMode());

  const setMode = useCallback((next: AdminMode) => {
    setModeState(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); }
    catch { /* localStorage no disponible: operamos sólo en memoria */ }
  }, []);

  const clearMode = useCallback(() => {
    setModeState(null);
    try { window.localStorage.removeItem(STORAGE_KEY); }
    catch { /* ignore */ }
  }, []);

  // Sync entre tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = normalize(e.newValue);
      setModeState(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { mode, setMode, clearMode };
}
