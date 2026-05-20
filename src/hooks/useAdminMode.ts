import { useCallback, useEffect, useState } from "react";

export type AdminMode = "web" | "sistema";

const STORAGE_KEY = "infinito-admin-mode";

function readStoredMode(): AdminMode | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "web" || v === "sistema" ? v : null;
  } catch {
    return null;
  }
}

export function useAdminMode() {
  const [mode, setModeState] = useState<AdminMode | null>(() => readStoredMode());

  const setMode = useCallback((next: AdminMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage no disponible (modo privado, quota llena): operamos sólo en memoria.
    }
  }, []);

  const clearMode = useCallback(() => {
    setModeState(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  // Sync entre tabs: si el usuario cambia el modo en otra pestaña, lo reflejamos.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      if (e.newValue === "web" || e.newValue === "sistema") setModeState(e.newValue);
      else if (e.newValue === null) setModeState(null);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { mode, setMode, clearMode };
}
