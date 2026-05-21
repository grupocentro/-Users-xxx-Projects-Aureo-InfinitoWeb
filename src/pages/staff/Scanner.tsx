import { useState, useEffect, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, Camera, CameraOff, Search, Loader2,
  CheckCircle2, AlertTriangle, XCircle, User, Ticket, Calendar,
} from "lucide-react";

// =============================================================================
// Tipos de la RPC `public.validar_qr` (migración 20260518230000)
// types.ts autogenerado no la conoce todavía → tipo manual.
// =============================================================================
type ValidacionResultado =
  | "valido"
  | "ya_usado"
  | "no_encontrado"
  | "compra_no_aprobada"
  | "fecha_invalida"
  | "error";

type ValidarQrResponse = {
  ok: boolean;
  resultado: ValidacionResultado;
  mensaje: string;
  qr_id?: string | null;
  compra_id?: string | null;
  usado_at?: string | null;
  ya_usado_at?: string | null;
  ya_usado_por?: string | null;
  fecha_visita?: string | null;
  tipo_entrada?: string | null;
  cantidad?: number | null;
  comprador_nombre?: string | null;
  estado_pago?: string | null;
};

// =============================================================================
// Configuración visual por resultado
// =============================================================================
type Variant = "ok" | "warn" | "error";

const RESULTADO_CONFIG: Record<ValidacionResultado, { variant: Variant; emoji: string; titulo: string; welcome?: string }> = {
  valido:              { variant: "ok",    emoji: "✅", titulo: "Entrada válida",     welcome: "Bienvenido a Infinito Water Park" },
  ya_usado:            { variant: "warn",  emoji: "⚠️", titulo: "QR ya utilizado" },
  no_encontrado:       { variant: "error", emoji: "❌", titulo: "QR no encontrado" },
  compra_no_aprobada:  { variant: "error", emoji: "❌", titulo: "Compra no aprobada" },
  fecha_invalida:      { variant: "warn",  emoji: "📅", titulo: "Fecha no corresponde" },
  error:               { variant: "error", emoji: "⚠️", titulo: "Error al validar" },
};

const VARIANT_THEME: Record<Variant, {
  gradient: string;
  ringColor: string;
  glowColor: string;
  iconColor: string;
  accentText: string;
  bgSoft: string;
}> = {
  ok: {
    gradient:   "from-emerald-400 via-green-500 to-emerald-600",
    ringColor:  "ring-emerald-400/60",
    glowColor:  "rgba(16, 185, 129, 0.55)",
    iconColor:  "text-emerald-600",
    accentText: "text-emerald-700",
    bgSoft:     "bg-emerald-50",
  },
  warn: {
    gradient:   "from-amber-400 via-yellow-500 to-amber-600",
    ringColor:  "ring-amber-400/60",
    glowColor:  "rgba(245, 158, 11, 0.55)",
    iconColor:  "text-amber-600",
    accentText: "text-amber-700",
    bgSoft:     "bg-amber-50",
  },
  error: {
    gradient:   "from-rose-500 via-red-500 to-rose-600",
    ringColor:  "ring-rose-400/60",
    glowColor:  "rgba(244, 63, 94, 0.55)",
    iconColor:  "text-rose-600",
    accentText: "text-rose-700",
    bgSoft:     "bg-rose-50",
  },
};

// Patrones de vibración (mobile only)
const VIBRATE_OK    = [60];
const VIBRATE_WARN  = [100, 50, 100];
const VIBRATE_ERROR = [200, 80, 200];

function vibrate(pattern: number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch { /* ignore */ }
  }
}

// Heurística simple de device detection para el _metadata de validar_qr.
// La BD recibe esto como string libre dentro de qr_validaciones.metadata.
function detectDeviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|tablet/i.test(ua)) return "tablet";
  if (/Mobile|iPhone|Android/i.test(ua)) return "mobile";
  return "desktop";
}

// =============================================================================
// DetailRow — helper visual de cada línea del resultado del scanner.
// =============================================================================
function DetailRow({
  icon: Icon, label, value, accent,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: ReactNode;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-app-border bg-white px-3 py-2.5">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-water-50 text-water-600">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className={`text-sm font-bold ${accent}`}>{value}</div>
      </div>
    </div>
  );
}

// =============================================================================
// Componente
// =============================================================================
export default function Scanner() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isStaff, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ValidarQrResponse | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [processing, setProcessing] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  // Ref para evitar re-llamar a la RPC con el mismo código mientras se procesa.
  const scannerRef = useRef<{ stop: () => void; destroy: () => void } | null>(null);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) { navigate("/sistemas"); return; }
    if (!isAdmin && !isStaff) { navigate("/"); }
  }, [user, isAdmin, isStaff, authLoading, roleLoading, navigate]);

  const startCamera = async () => {
    try {
      const QrScanner = (await import("qr-scanner")).default;
      if (!videoRef.current) return;

      const scanner = new QrScanner(
        videoRef.current,
        (res) => {
          // Cortar la cámara antes de procesar para evitar lecturas múltiples.
          if (inFlightRef.current) return;
          inFlightRef.current = true;
          handleValidate(res.data);
          scanner.stop();
          setScanning(false);
        },
        {
          returnDetailedScanResult: true,
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );

      scannerRef.current = scanner;
      await scanner.start();
      setScanning(true);
      setCameraError(false);
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError(true);
    }
  };

  const stopCamera = () => {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;
    setScanning(false);
  };

  useEffect(() => {
    return () => { scannerRef.current?.destroy(); };
  }, []);

  // ---------------------------------------------------------------------------
  // Validación: SIEMPRE delega en la RPC SECURITY DEFINER `validar_qr`.
  // El frontend ya NO decide validez, no hace SELECT ni UPDATE sobre codigos_qr.
  // ---------------------------------------------------------------------------
  const handleValidate = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) {
      inFlightRef.current = false;
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      // NOTA: `validar_qr` se agregó en migración 20260518230000.
      // En migración 20260520120100 se agregó la sobrecarga `validar_qr(text, jsonb)`
      // que acepta metadata extra del cliente. La firma de 1 arg sigue funcionando
      // (wrapper backwards-compat), por eso PostgreSQL elige la de 2 args al
      // recibir _metadata. types.ts autogenerado no la conoce todavía → cast.
      //
      // punto_acceso_id queda en null hasta que se implemente el selector.
      const metadata = {
        scanner_source: "staff_scanner",
        device_type: detectDeviceType(),
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "",
        timestamp_local: new Date().toISOString(),
        punto_acceso_id: null,
      };

      const { data, error } = await supabase.rpc(
        "validar_qr" as never,
        { _uuid_code: trimmed, _metadata: metadata } as never,
      );

      if (error) {
        console.error("RPC validar_qr error:", error);
        setResult({
          ok: false,
          resultado: "error",
          mensaje: error.message || "Error al validar el QR",
        });
        vibrate(VIBRATE_ERROR);
        return;
      }

      const res = data as unknown as ValidarQrResponse | null;
      if (!res) {
        setResult({ ok: false, resultado: "error", mensaje: "Respuesta vacía del servidor" });
        vibrate(VIBRATE_ERROR);
        return;
      }

      setResult(res);

      if (res.resultado === "valido") vibrate(VIBRATE_OK);
      else if (res.resultado === "ya_usado" || res.resultado === "fecha_invalida") vibrate(VIBRATE_WARN);
      else vibrate(VIBRATE_ERROR);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      console.error("Validation error:", err);
      setResult({ ok: false, resultado: "error", mensaje: message });
      vibrate(VIBRATE_ERROR);
    } finally {
      setProcessing(false);
      inFlightRef.current = false;
    }
  };

  const handleClear = () => {
    setResult(null);
    setManualCode("");
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  const cfg = result ? RESULTADO_CONFIG[result.resultado] : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6">
        <button
          onClick={() => navigate(isAdmin ? "/admin" : "/mi-cuenta")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>

        <h1 className="text-2xl font-bold mb-1">🔍 Escáner QR</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Escaneá o ingresá un código para validar la entrada
        </p>

        {/* Camera */}
        <Card className="mb-4 overflow-hidden">
          <CardContent className="p-0">
            <div className="relative aspect-square bg-muted">
              <video ref={videoRef} className="w-full h-full object-cover" />
              {!scanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="text-center">
                    {cameraError ? (
                      <>
                        <CameraOff className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">No se pudo acceder a la cámara</p>
                      </>
                    ) : (
                      <>
                        <Camera className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">Cámara apagada</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="p-3">
              <Button
                className="w-full h-12 text-base font-semibold"
                variant={scanning ? "destructive" : "default"}
                onClick={scanning ? stopCamera : startCamera}
              >
                {scanning ? (
                  <><CameraOff className="w-5 h-5 mr-2" /> Detener cámara</>
                ) : (
                  <><Camera className="w-5 h-5 mr-2" /> Activar cámara</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Manual input */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-2">Ingreso manual</p>
            <div className="flex gap-2">
              <Input
                placeholder="Pegá el código UUID aquí"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="font-mono text-sm"
              />
              <Button
                onClick={() => { handleValidate(manualCode); setManualCode(""); }}
                disabled={!manualCode.trim() || processing}
                className="h-10"
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Result — premium */}
        {result && cfg && (() => {
          const theme = VARIANT_THEME[cfg.variant];
          const now = result.usado_at ? new Date(result.usado_at) : new Date();
          return (
            <>
              <style>{`
                @keyframes scanner-reveal {
                  0%   { opacity: 0; transform: translateY(16px) scale(0.96); }
                  100% { opacity: 1; transform: translateY(0)    scale(1);    }
                }
                @keyframes scanner-glow-pulse {
                  0%, 100% { box-shadow: 0 0 0 0 var(--glow-color), 0 12px 40px -8px var(--glow-color); }
                  50%      { box-shadow: 0 0 24px 4px var(--glow-color), 0 18px 56px -8px var(--glow-color); }
                }
                @keyframes scanner-icon-pop {
                  0%   { opacity: 0; transform: scale(0.4) rotate(-12deg); }
                  60%  { opacity: 1; transform: scale(1.12) rotate(4deg); }
                  100% { opacity: 1; transform: scale(1)   rotate(0deg); }
                }
              `}</style>
              <div
                className={`relative overflow-hidden rounded-3xl bg-white ring-2 ${theme.ringColor}`}
                style={{
                  ["--glow-color" as string]: theme.glowColor,
                  animation: "scanner-reveal 0.45s cubic-bezier(0.22, 1, 0.36, 1), scanner-glow-pulse 2.4s ease-in-out infinite",
                }}
              >
                {/* Banner superior con gradient */}
                <div className={`relative px-6 py-7 text-white bg-gradient-to-br ${theme.gradient}`}>
                  {/* Brillo decorativo */}
                  <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
                  <div className="pointer-events-none absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

                  <div className="relative flex flex-col items-center text-center">
                    <div
                      className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-white/95 shadow-2xl"
                      style={{ animation: "scanner-icon-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
                    >
                      {cfg.variant === "ok"    && <CheckCircle2  className={`h-12 w-12 ${theme.iconColor}`} />}
                      {cfg.variant === "warn"  && <AlertTriangle className={`h-12 w-12 ${theme.iconColor}`} />}
                      {cfg.variant === "error" && <XCircle       className={`h-12 w-12 ${theme.iconColor}`} />}
                    </div>
                    {cfg.welcome && cfg.variant === "ok" && (
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/80">
                        🎉 {cfg.welcome}
                      </p>
                    )}
                    <h2 className="mt-1 text-2xl font-black drop-shadow-sm sm:text-3xl">
                      {cfg.titulo}
                    </h2>
                    <p className="mt-1 max-w-xs text-sm font-medium text-white/90">{result.mensaje}</p>
                  </div>
                </div>

                {/* Detalles */}
                <div className="space-y-2.5 px-6 py-5">
                  {result.comprador_nombre && (
                    <DetailRow icon={User} label="Comprador" value={result.comprador_nombre} accent={theme.accentText} />
                  )}
                  {result.tipo_entrada && (
                    <DetailRow
                      icon={Ticket}
                      label="Entrada"
                      value={
                        <span>
                          {result.tipo_entrada}
                          {result.cantidad && result.cantidad > 1 && (
                            <span className="ml-1.5 inline-flex items-center rounded-full bg-water-100 px-2 py-0.5 text-[10px] font-bold text-water-700">
                              × {result.cantidad}
                            </span>
                          )}
                        </span>
                      }
                      accent={theme.accentText}
                    />
                  )}
                  {result.fecha_visita && (
                    <DetailRow
                      icon={Calendar}
                      label="Fecha visita"
                      value={
                        <span className="capitalize">
                          {new Date(result.fecha_visita + "T12:00:00").toLocaleDateString("es-AR", {
                            weekday: "long", day: "numeric", month: "long",
                          })}
                        </span>
                      }
                      accent={theme.accentText}
                    />
                  )}
                  {result.resultado === "valido" && (
                    <DetailRow
                      icon={CheckCircle2}
                      label="Hora de acceso"
                      value={now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                      accent={theme.accentText}
                    />
                  )}
                  {result.estado_pago && result.resultado === "compra_no_aprobada" && (
                    <div className={`flex items-center justify-between rounded-xl ${theme.bgSoft} px-3 py-2`}>
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado pago</span>
                      <span className={`text-sm font-bold uppercase ${theme.accentText}`}>{result.estado_pago}</span>
                    </div>
                  )}
                  {result.ya_usado_at && (
                    <div className={`rounded-xl ${theme.bgSoft} px-3 py-2.5`}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Acceso anterior</p>
                      <p className={`mt-0.5 text-sm font-bold ${theme.accentText}`}>
                        {new Date(result.ya_usado_at).toLocaleString("es-AR", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <div className="px-6 pb-6">
                  <Button variant="outline" className="h-12 w-full rounded-2xl border-2 text-base font-bold" onClick={handleClear}>
                    Escanear otro
                  </Button>
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
