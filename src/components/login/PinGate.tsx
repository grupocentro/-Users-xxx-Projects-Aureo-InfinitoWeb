import { useCallback, useEffect, useState } from "react";
import { Lock, ShieldCheck, Loader2 } from "lucide-react";
import { PinInput } from "./PinInput";
import { NumericKeypad } from "./NumericKeypad";
import { validatePin } from "@/lib/access-control";

interface PinGateProps {
  onUnlock: () => void;
  pinLength?: number;
}

// Modal centrado de verificación PIN.
// Acepta input por teclado físico (números + Enter + Backspace) y por keypad visual.
// No persiste el PIN ingresado; sólo persiste el estado de desbloqueo (caller).
export function PinGate({ onUnlock, pinLength = 6 }: PinGateProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const tryUnlock = useCallback(async (candidate: string) => {
    if (candidate.length !== pinLength) return;
    setVerifying(true);
    const ok = await validatePin(candidate);
    setVerifying(false);
    if (ok) {
      onUnlock();
    } else {
      setError(true);
      // Limpiamos tras un instante para que el usuario vea el feedback rojo
      setTimeout(() => setPin(""), 400);
    }
  }, [onUnlock, pinLength]);

  // Autosubmit al completar 6 dígitos
  useEffect(() => {
    if (pin.length === pinLength) {
      void tryUnlock(pin);
    }
  }, [pin, pinLength, tryUnlock]);

  // Limpiar error al escribir de nuevo
  useEffect(() => {
    if (pin.length > 0 && error) setError(false);
  }, [pin, error]);

  // Teclado físico: solo números + Enter + Backspace
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (verifying) return;
      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        setPin((p) => (p.length < pinLength ? p + e.key : p));
      } else if (e.key === "Backspace") {
        e.preventDefault();
        setPin((p) => p.slice(0, -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        void tryUnlock(pin);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setPin("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pin, pinLength, verifying, tryUnlock]);

  // Permitir pegar PIN si es numérico
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text") ?? "";
      const digits = text.replace(/\D/g, "").slice(0, pinLength);
      if (digits.length > 0) {
        e.preventDefault();
        setPin(digits);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [pinLength]);

  const handleDigit = (d: string) => setPin((p) => (p.length < pinLength ? p + d : p));
  const handleBackspace = () => setPin((p) => p.slice(0, -1));
  const handleClear = () => setPin("");

  return (
    <div
      className="relative w-[min(92vw,420px)] rounded-3xl border border-white/15 bg-slate-900/55 p-6 sm:p-8
                 shadow-2xl shadow-water-900/40 backdrop-blur-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-title"
    >
      {/* Glow superior */}
      <div className="pointer-events-none absolute -top-16 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-water-400/30 blur-3xl" />

      {/* Icono lock */}
      <div className="relative flex justify-center mb-5">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-water-400 to-water-700 shadow-lg shadow-water-500/40">
          <Lock className="h-6 w-6 text-white" />
        </div>
      </div>

      <h2 id="pin-title" className="text-center text-xl font-bold text-white sm:text-2xl">
        Verificación de seguridad
      </h2>
      <p className="mt-1 text-center text-sm text-water-200/80">
        Ingresá el PIN de acceso para continuar
      </p>

      <div className="mt-6">
        <PinInput value={pin} length={pinLength} hasError={error} />
      </div>

      {error && (
        <p className="mt-3 text-center text-xs font-medium text-rose-300">
          PIN incorrecto. Intentá nuevamente.
        </p>
      )}

      <div className="mt-6">
        <NumericKeypad
          onDigit={handleDigit}
          onBackspace={handleBackspace}
          onClear={handleClear}
          disabled={verifying}
        />
      </div>

      <button
        type="button"
        onClick={() => void tryUnlock(pin)}
        disabled={pin.length !== pinLength || verifying}
        className="mt-5 h-12 w-full rounded-2xl bg-gradient-to-r from-water-500 to-water-700
                   text-base font-semibold text-white shadow-lg shadow-water-600/40
                   transition-all hover:from-water-600 hover:to-water-800 active:scale-[0.98]
                   disabled:opacity-40 disabled:active:scale-100"
      >
        {verifying ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Verificando...
          </span>
        ) : (
          "Ingresar"
        )}
      </button>

      <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-water-200/60">
        <ShieldCheck className="h-3 w-3" />
        Acceso protegido
      </div>
    </div>
  );
}
