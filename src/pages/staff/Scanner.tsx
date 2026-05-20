import { useState, useEffect, useRef } from "react";
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

const RESULTADO_CONFIG: Record<ValidacionResultado, { variant: Variant; emoji: string; titulo: string }> = {
  valido:              { variant: "ok",    emoji: "✅", titulo: "Entrada válida" },
  ya_usado:            { variant: "warn",  emoji: "⚠️", titulo: "QR ya utilizado" },
  no_encontrado:       { variant: "error", emoji: "❌", titulo: "QR no encontrado" },
  compra_no_aprobada:  { variant: "error", emoji: "❌", titulo: "Compra no aprobada" },
  fecha_invalida:      { variant: "warn",  emoji: "📅", titulo: "Fecha no corresponde" },
  error:               { variant: "error", emoji: "⚠️", titulo: "Error al validar" },
};

const VARIANT_CLASS: Record<Variant, string> = {
  ok:    "border-green-500 bg-green-50",
  warn:  "border-yellow-500 bg-yellow-50",
  error: "border-destructive bg-red-50",
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
    if (!user) { navigate("/login"); return; }
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

        {/* Result */}
        {result && cfg && (
          <Card className={`border-2 ${VARIANT_CLASS[cfg.variant]}`}>
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <div className="flex items-center justify-center mb-2">
                  {cfg.variant === "ok" && <CheckCircle2 className="w-14 h-14 text-green-600" />}
                  {cfg.variant === "warn" && <AlertTriangle className="w-14 h-14 text-yellow-600" />}
                  {cfg.variant === "error" && <XCircle className="w-14 h-14 text-destructive" />}
                </div>
                <p className="text-2xl font-black mb-1">{cfg.emoji} {cfg.titulo}</p>
                <p className="text-sm text-muted-foreground">{result.mensaje}</p>
              </div>

              {/* Detalles según corresponda */}
              <div className="space-y-2 text-sm">
                {result.comprador_nombre && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Comprador:</span>
                    <span className="font-medium">{result.comprador_nombre}</span>
                  </div>
                )}
                {result.tipo_entrada && (
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Entrada:</span>
                    <span className="font-medium">{result.tipo_entrada}</span>
                  </div>
                )}
                {result.fecha_visita && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Fecha visita:</span>
                    <span className="font-medium">{result.fecha_visita}</span>
                  </div>
                )}
                {result.estado_pago && result.resultado === "compra_no_aprobada" && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Estado pago:</span>
                    <span className="font-medium uppercase">{result.estado_pago}</span>
                  </div>
                )}
                {result.ya_usado_at && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Usado el:</span>
                    <span className="font-medium">
                      {new Date(result.ya_usado_at).toLocaleString("es-AR")}
                    </span>
                  </div>
                )}
              </div>

              <Button variant="outline" className="w-full mt-5 h-11 text-base" onClick={handleClear}>
                Escanear otro
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
