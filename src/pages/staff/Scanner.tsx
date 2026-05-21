import { useState, useEffect, useRef, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Camera, CameraOff, Search, Loader2, CheckCircle2, AlertTriangle, XCircle,
  User, Ticket, Calendar, LogOut, Activity, Sparkles, Clock, TrendingUp,
  Users, History, RefreshCw, ScanLine, ChevronRight,
} from "lucide-react";

// =============================================================================
// /staff/scanner — Consola operativa de control de accesos
// =============================================================================
// Experiencia fullscreen optimizada para staff QR. SIN sidebar admin.
// La lógica de validación (RPC validar_qr) se mantiene 100% intacta.
// =============================================================================

type ValidacionResultado =
  | "valido" | "ya_usado" | "no_encontrado"
  | "compra_no_aprobada" | "fecha_invalida" | "error";

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

type Variant = "ok" | "warn" | "error";

const RESULTADO_CONFIG: Record<ValidacionResultado, { variant: Variant; titulo: string; welcome?: string }> = {
  valido:              { variant: "ok",    titulo: "Acceso autorizado", welcome: "Bienvenido a Infinito Water Park" },
  ya_usado:            { variant: "warn",  titulo: "QR ya utilizado" },
  no_encontrado:       { variant: "error", titulo: "QR no encontrado" },
  compra_no_aprobada:  { variant: "error", titulo: "Compra no aprobada" },
  fecha_invalida:      { variant: "warn",  titulo: "Fecha no corresponde" },
  error:               { variant: "error", titulo: "Error al validar" },
};

const VIBRATE_OK    = [60];
const VIBRATE_WARN  = [100, 50, 100];
const VIBRATE_ERROR = [200, 80, 200];
function vibrate(pattern: number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(pattern); } catch { /* ignore */ }
  }
}

function detectDeviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|tablet/i.test(ua)) return "tablet";
  if (/Mobile|iPhone|Android/i.test(ua)) return "mobile";
  return "desktop";
}

const ARS = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;

// =============================================================================
// CLOCK — hora live (sin re-render por segundo del padre)
// =============================================================================
function LiveClock() {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-center leading-none">
      <p className="font-black text-water-800 tabular-nums" style={{ fontSize: "clamp(1.25rem, 2.5vw, 1.75rem)" }}>
        {now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </p>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-app-muted">
        {now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" })}
      </p>
    </div>
  );
}

// =============================================================================
// SCANNER PAGE
// =============================================================================
export default function Scanner() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { role, isAdmin, isStaff, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ValidarQrResponse | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [processing, setProcessing] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [continuous, setContinuous] = useState(true);
  const scannerRef = useRef<{ stop: () => void; destroy: () => void } | null>(null);
  const inFlightRef = useRef(false);
  const autoResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // KPIs operativos (recargan en cada validación exitosa)
  const [stats, setStats] = useState<{
    ingresosHoy: number;
    personasDentro: number;
    ultimoAcceso: string | null;
    validacionesExitosas: number;
    historial: Array<{
      id: string;
      created_at: string;
      resultado: string;
      comprador: string | null;
      tipo: string | null;
    }>;
  }>({
    ingresosHoy: 0, personasDentro: 0, ultimoAcceso: null,
    validacionesExitosas: 0, historial: [],
  });

  // -------------------------------------------------------------------------
  // Guard de auth (preservado)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) { navigate("/sistemas"); return; }
    if (!isAdmin && !isStaff) { navigate("/"); }
  }, [user, isAdmin, isStaff, authLoading, roleLoading, navigate]);

  // -------------------------------------------------------------------------
  // Carga inicial + refresh de KPIs
  // -------------------------------------------------------------------------
  const fetchStats = async () => {
    const hoyIso = new Date(); hoyIso.setHours(0, 0, 0, 0);
    const hoyStr = hoyIso.toISOString();

    const [ingRes, qrRes, validRes] = await Promise.all([
      supabase
        .from("compras")
        .select("total")
        .eq("estado_pago", "aprobado")
        .gte("created_at", hoyStr),
      supabase
        .from("codigos_qr")
        .select("id, usado_at")
        .eq("usado", true)
        .gte("usado_at", hoyStr),
      supabase
        .from("qr_validaciones" as never)
        .select("id, created_at, resultado, compra_id")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const ingresos = (ingRes.data ?? []).reduce((s, c) => s + Number(c.total ?? 0), 0);
    const personasDentro = (qrRes.data ?? []).length;

    // Enriquecer historial con comprador + tipo
    const validData = (validRes.data ?? []) as unknown as Array<{ id: string; created_at: string; resultado: string; compra_id: string | null }>;
    const compraIds = [...new Set(validData.map((v) => v.compra_id).filter(Boolean))] as string[];
    let comprasMap = new Map<string, { user_id: string; tipo_entrada_id: string | null }>();
    let profilesMap = new Map<string, string>();
    let tiposMap = new Map<string, string>();
    if (compraIds.length > 0) {
      const { data: comprasData } = await supabase.from("compras").select("id, user_id, tipo_entrada_id").in("id", compraIds);
      if (comprasData) {
        comprasMap = new Map(comprasData.map((c) => [c.id, { user_id: c.user_id, tipo_entrada_id: c.tipo_entrada_id }]));
        const userIds = [...new Set(comprasData.map((c) => c.user_id))];
        const tipoIds = [...new Set(comprasData.map((c) => c.tipo_entrada_id).filter(Boolean))] as string[];
        if (userIds.length > 0) {
          const { data: profs } = await supabase.from("profiles").select("id, nombre, apellido").in("id", userIds);
          if (profs) profilesMap = new Map(profs.map((p) => [p.id, `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim() || "—"]));
        }
        if (tipoIds.length > 0) {
          const { data: tipos } = await supabase.from("tipos_entrada").select("id, nombre").in("id", tipoIds);
          if (tipos) tiposMap = new Map(tipos.map((t) => [t.id, t.nombre]));
        }
      }
    }

    const historial = validData.map((v) => {
      const c = v.compra_id ? comprasMap.get(v.compra_id) : null;
      const comprador = c ? profilesMap.get(c.user_id) ?? null : null;
      const tipo = c?.tipo_entrada_id ? tiposMap.get(c.tipo_entrada_id) ?? null : null;
      return { id: v.id, created_at: v.created_at, resultado: v.resultado, comprador, tipo };
    });

    const validExitosasHoy = validData.filter((v) => v.resultado === "valido" && new Date(v.created_at) >= hoyIso).length;
    const ultimoAcceso = validData.find((v) => v.resultado === "valido")?.created_at ?? null;

    setStats({
      ingresosHoy: ingresos,
      personasDentro,
      ultimoAcceso,
      validacionesExitosas: validExitosasHoy,
      historial,
    });
  };

  useEffect(() => {
    if (user && (isAdmin || isStaff)) {
      void fetchStats();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin, isStaff]);

  // -------------------------------------------------------------------------
  // Cámara
  // -------------------------------------------------------------------------
  const startCamera = async () => {
    try {
      const QrScanner = (await import("qr-scanner")).default;
      if (!videoRef.current) return;
      const scanner = new QrScanner(
        videoRef.current,
        (res) => {
          if (inFlightRef.current) return;
          inFlightRef.current = true;
          void handleValidate(res.data);
          scanner.stop();
          setScanning(false);
        },
        { returnDetailedScanResult: true, highlightScanRegion: true, highlightCodeOutline: true }
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
    return () => {
      scannerRef.current?.destroy();
      if (autoResetRef.current) clearTimeout(autoResetRef.current);
    };
  }, []);

  // -------------------------------------------------------------------------
  // Validación (RPC validar_qr — lógica preservada byte-a-byte)
  // -------------------------------------------------------------------------
  const handleValidate = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) { inFlightRef.current = false; return; }

    setProcessing(true);
    setResult(null);

    try {
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
        setResult({ ok: false, resultado: "error", mensaje: error.message || "Error al validar el QR" });
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

      // Refresh KPIs después de cada validación
      void fetchStats();

      // Modo Operación Continua: auto-reset y restart a los 2 segundos
      if (continuous) {
        if (autoResetRef.current) clearTimeout(autoResetRef.current);
        autoResetRef.current = setTimeout(() => {
          setResult(null);
          setManualCode("");
          inFlightRef.current = false;
          if (!scanning) void startCamera();
        }, 2000);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      console.error("Validation error:", err);
      setResult({ ok: false, resultado: "error", mensaje: message });
      vibrate(VIBRATE_ERROR);
    } finally {
      setProcessing(false);
      if (!continuous) inFlightRef.current = false;
    }
  };

  const handleClear = () => {
    if (autoResetRef.current) { clearTimeout(autoResetRef.current); autoResetRef.current = null; }
    setResult(null);
    setManualCode("");
    inFlightRef.current = false;
  };

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-water-50">
        <Loader2 className="h-8 w-8 animate-spin text-water-600" />
      </div>
    );
  }

  const operatorName = (user?.user_metadata?.nombre as string | undefined) || user?.email?.split("@")[0] || "Operador";
  const roleLabel = role === "control_entradas" ? "Operador acceso" : isAdmin ? "Administrador" : "Staff";

  return (
    <>
      <style>{`
        @keyframes sc-glow-ok    { 0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4), 0 0 32px -4px rgba(16,185,129,0.5); } 50% { box-shadow: 0 0 0 12px rgba(16,185,129,0), 0 0 56px -4px rgba(16,185,129,0.65); } }
        @keyframes sc-glow-warn  { 0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.4), 0 0 32px -4px rgba(245,158,11,0.5); } 50% { box-shadow: 0 0 0 12px rgba(245,158,11,0), 0 0 56px -4px rgba(245,158,11,0.65); } }
        @keyframes sc-glow-err   { 0%,100% { box-shadow: 0 0 0 0 rgba(244,63,94,0.4), 0 0 32px -4px rgba(244,63,94,0.5); } 50% { box-shadow: 0 0 0 12px rgba(244,63,94,0), 0 0 56px -4px rgba(244,63,94,0.65); } }
        @keyframes sc-shake      { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
        @keyframes sc-fade-in    { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes sc-scan-line  { 0% { top: 0; opacity: 1; } 50% { opacity: 0.5; } 100% { top: 100%; opacity: 0; } }
        @keyframes sc-pulse-dot  { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.6; } }
        .sc-glow-ok    { animation: sc-glow-ok 2.2s ease-in-out infinite; }
        .sc-glow-warn  { animation: sc-glow-warn 2.2s ease-in-out infinite; }
        .sc-glow-err   { animation: sc-glow-err 2.2s ease-in-out infinite, sc-shake 0.35s ease-in-out 0s 2; }
        .sc-fade-in    { animation: sc-fade-in 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
      `}</style>

      <div className="flex min-h-dvh flex-col bg-gradient-to-br from-water-50 via-white to-water-100/40">

        {/* ═══════════════════════════════════════════════════════════════
            HEADER ULTRA MINIMAL (glass)
            ═══════════════════════════════════════════════════════════════ */}
        <header className="sticky top-0 z-30 border-b border-white/60 bg-white/70 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
            {/* Izquierda: brand + estado */}
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-water-500 to-water-700 text-white shadow-md">
                <ScanLine className="h-4 w-4" />
              </div>
              <div className="hidden sm:block leading-none">
                <p className="font-black text-water-800">Control de Accesos</p>
                <p className="mt-0.5 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-70" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  Online
                </p>
              </div>
              {/* Mobile compacto */}
              <div className="sm:hidden leading-none">
                <p className="text-xs font-black text-water-800">Accesos</p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider text-emerald-700">
                  <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" /> Live
                </p>
              </div>
            </div>

            {/* Centro: clock */}
            <div className="flex-shrink-0">
              <LiveClock />
            </div>

            {/* Derecha: operador + logout */}
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="hidden text-right sm:block leading-none">
                <p className="truncate text-sm font-bold text-water-800">{operatorName}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wider text-app-muted">{roleLabel}</p>
              </div>
              <button
                onClick={signOut}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-white/80 text-rose-600 transition-colors hover:bg-rose-50"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* ═══════════════════════════════════════════════════════════════
            ÁREA CENTRAL — CÁMARA + RESULTADO + KPIs + HISTORIAL
            ═══════════════════════════════════════════════════════════════ */}
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:grid lg:grid-cols-[1fr_360px] lg:gap-6">

          {/* ── Columna central: cámara + manual input ─────────────── */}
          <section className="space-y-3 sm:space-y-4">
            {/* Toggle "Modo Operación Continua" */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-water-200 bg-white/80 px-4 py-2.5 shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${continuous ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                  <Sparkles className="h-4 w-4" />
                </span>
                <div className="leading-tight">
                  <p className="text-sm font-bold text-water-800">Modo Operación Continua</p>
                  <p className="text-[11px] text-app-muted">Auto-reset 2s tras cada validación</p>
                </div>
              </div>
              <button
                onClick={() => setContinuous((v) => !v)}
                className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors ${continuous ? "bg-emerald-500" : "bg-slate-300"}`}
                aria-label="Toggle modo continuo"
                role="switch"
                aria-checked={continuous}
              >
                <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform ${continuous ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>

            {/* ─── CÁMARA principal ─────────────────────────────── */}
            <div className="relative overflow-hidden rounded-3xl border border-water-200 bg-water-900 shadow-xl"
                 style={{ aspectRatio: "16 / 10" }}>
              {/* Video */}
              <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover" />

              {/* Estado off / error */}
              {!scanning && !result && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-water-800 to-water-900">
                  <div className="text-center px-6">
                    {cameraError ? (
                      <>
                        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/20 ring-1 ring-rose-300/40">
                          <CameraOff className="h-8 w-8 text-rose-200" />
                        </div>
                        <p className="text-base font-bold text-white">No se pudo acceder a la cámara</p>
                        <p className="mt-1 text-xs text-water-200/80">Permití el acceso o usá el ingreso manual abajo</p>
                      </>
                    ) : (
                      <>
                        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-md">
                          <Camera className="h-8 w-8 text-white/80" />
                        </div>
                        <p className="text-base font-bold text-white">Cámara apagada</p>
                        <p className="mt-1 text-xs text-water-200/80">Tocá "Activar cámara" para empezar a escanear</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Scan line decorativa cuando scanning */}
              {scanning && !result && (
                <>
                  <div className="pointer-events-none absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent shadow-[0_0_8px_2px_rgba(16,185,129,0.6)]"
                       style={{ animation: "sc-scan-line 2.4s ease-in-out infinite" }} />
                  {/* Esquinas */}
                  <div className="pointer-events-none absolute inset-6 sm:inset-10">
                    {[
                      "top-0 left-0 border-t-2 border-l-2",
                      "top-0 right-0 border-t-2 border-r-2",
                      "bottom-0 left-0 border-b-2 border-l-2",
                      "bottom-0 right-0 border-b-2 border-r-2",
                    ].map((cls, i) => (
                      <div key={i} className={`absolute h-8 w-8 border-emerald-300/80 rounded-sm ${cls}`} />
                    ))}
                  </div>
                </>
              )}

              {/* RESULTADO overlay */}
              {result && (
                <ResultOverlay result={result} continuous={continuous} onClear={handleClear} />
              )}

              {/* Processing overlay */}
              {processing && !result && (
                <div className="absolute inset-0 flex items-center justify-center bg-water-900/70 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-2 text-white">
                    <Loader2 className="h-10 w-10 animate-spin" />
                    <p className="text-sm font-bold">Validando…</p>
                  </div>
                </div>
              )}
            </div>

            {/* Controles cámara */}
            <div className="flex gap-2">
              <Button
                onClick={scanning ? stopCamera : startCamera}
                className={`h-12 flex-1 rounded-2xl font-bold ${
                  scanning
                    ? "bg-rose-500 hover:bg-rose-600 text-white"
                    : "bg-gradient-to-br from-water-700 to-water-500 hover:brightness-110 text-white"
                }`}
              >
                {scanning ? <><CameraOff className="mr-2 h-5 w-5" /> Detener cámara</>
                          : <><Camera className="mr-2 h-5 w-5" /> Activar cámara</>}
              </Button>
            </div>

            {/* Ingreso manual */}
            <div className="rounded-2xl border border-water-200 bg-white/80 p-3 shadow-sm backdrop-blur-md sm:p-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-app-muted">Ingreso manual</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Pegá el código UUID"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="h-11 rounded-xl font-mono text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && manualCode.trim() && !processing) {
                      inFlightRef.current = true;
                      void handleValidate(manualCode);
                      setManualCode("");
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    if (manualCode.trim() && !processing) {
                      inFlightRef.current = true;
                      void handleValidate(manualCode);
                      setManualCode("");
                    }
                  }}
                  disabled={!manualCode.trim() || processing}
                  className="h-11 w-11 rounded-xl bg-water-700 p-0 hover:bg-water-800"
                >
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </section>

          {/* ── Columna lateral: KPIs + historial ──────────────────── */}
          <aside className="mt-4 space-y-3 lg:mt-0">
            {/* KPIs operativos compactos */}
            <div className="grid grid-cols-2 gap-2.5">
              <Kpi
                icon={<TrendingUp className="h-3.5 w-3.5" />}
                label="Ingresos hoy"
                value={ARS(stats.ingresosHoy)}
                tone="water"
              />
              <Kpi
                icon={<Users className="h-3.5 w-3.5" />}
                label="Personas dentro"
                value={stats.personasDentro}
                tone="emerald"
              />
              <Kpi
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Último acceso"
                value={stats.ultimoAcceso
                  ? new Date(stats.ultimoAcceso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
                  : "—"}
                tone="violet"
              />
              <Kpi
                icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                label="Válidos hoy"
                value={stats.validacionesExitosas}
                tone="amber"
              />
            </div>

            {/* Historial rápido */}
            <div className="rounded-2xl border border-water-200 bg-white/80 shadow-sm backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-water-100 px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-water-600" />
                  <p className="text-xs font-bold uppercase tracking-wider text-water-700">Últimos accesos</p>
                </div>
                <button
                  onClick={() => void fetchStats()}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-app-muted hover:bg-water-50 hover:text-water-700"
                  aria-label="Refrescar"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto overscroll-contain">
                {stats.historial.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-app-muted">Aún sin actividad hoy.</p>
                ) : (
                  <ul className="divide-y divide-water-100">
                    {stats.historial.map((h) => (
                      <HistoryRow key={h.id} row={h} />
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Atajo a /admin si es admin (no para staff puro) */}
            {isAdmin && (
              <button
                onClick={() => navigate("/admin/seleccionar")}
                className="group flex w-full items-center justify-between rounded-2xl border border-violet-200 bg-violet-50/60 px-4 py-3 text-sm font-bold text-violet-700 transition-colors hover:bg-violet-100"
              >
                <span className="inline-flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Panel administrativo
                </span>
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
          </aside>
        </main>
      </div>
    </>
  );
}

// =============================================================================
// ResultOverlay — overlay full sobre la cámara con resultado del scan
// =============================================================================
function ResultOverlay({
  result, continuous, onClear,
}: {
  result: ValidarQrResponse;
  continuous: boolean;
  onClear: () => void;
}) {
  const cfg = RESULTADO_CONFIG[result.resultado];
  const theme = {
    ok:    { gradient: "from-emerald-500 via-emerald-600 to-emerald-700", icon: CheckCircle2,  glow: "sc-glow-ok",   iconBg: "bg-emerald-400/30" },
    warn:  { gradient: "from-amber-500 via-amber-600 to-orange-600",       icon: AlertTriangle, glow: "sc-glow-warn", iconBg: "bg-amber-400/30" },
    error: { gradient: "from-rose-500 via-rose-600 to-rose-700",            icon: XCircle,       glow: "sc-glow-err",  iconBg: "bg-rose-400/30" },
  }[cfg.variant];
  const Icon = theme.icon;
  const now = result.usado_at ? new Date(result.usado_at) : new Date();

  return (
    <div className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br ${theme.gradient} text-white sc-fade-in`}>
      {/* Brillos decorativos */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

      {/* Icono central con glow */}
      <div className={`mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-2xl ${theme.glow} sm:h-24 sm:w-24`}>
        <Icon className={`h-12 w-12 ${cfg.variant === "ok" ? "text-emerald-600" : cfg.variant === "warn" ? "text-amber-600" : "text-rose-600"} sm:h-14 sm:w-14`} />
      </div>

      {/* Welcome para válido */}
      {cfg.welcome && cfg.variant === "ok" && (
        <p className="px-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white/85 sm:text-xs">
          🎉 {cfg.welcome}
        </p>
      )}

      {/* Título y mensaje */}
      <h2 className="mt-1 px-4 text-center font-black leading-tight drop-shadow-md"
          style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)" }}>
        {cfg.titulo}
      </h2>
      <p className="mt-1 max-w-md px-6 text-center text-sm text-white/90 sm:text-base">{result.mensaje}</p>

      {/* Detalles */}
      <div className="mt-4 grid w-full max-w-md grid-cols-2 gap-2 px-6 sm:gap-3">
        {result.comprador_nombre && (
          <DetailChip icon={User}   label="Visitante" value={result.comprador_nombre} />
        )}
        {result.tipo_entrada && (
          <DetailChip
            icon={Ticket}
            label="Entrada"
            value={
              result.cantidad && result.cantidad > 1
                ? `${result.tipo_entrada} × ${result.cantidad}`
                : result.tipo_entrada
            }
          />
        )}
        {result.fecha_visita && (
          <DetailChip
            icon={Calendar}
            label="Fecha visita"
            value={new Date(result.fecha_visita + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
          />
        )}
        {cfg.variant === "ok" && (
          <DetailChip
            icon={Clock}
            label="Hora acceso"
            value={now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
          />
        )}
        {result.ya_usado_at && (
          <div className="col-span-2 rounded-xl bg-black/20 px-3 py-2 backdrop-blur-md">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Acceso anterior</p>
            <p className="text-sm font-bold text-white">
              {new Date(result.ya_usado_at).toLocaleString("es-AR", {
                day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
              })}
            </p>
          </div>
        )}
      </div>

      {/* Continuo: indicador de auto-reset */}
      {continuous ? (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-bold ring-1 ring-white/20 backdrop-blur-md">
          <Loader2 className="h-3 w-3 animate-spin" />
          Listo para el siguiente en 2s…
        </div>
      ) : (
        <button
          onClick={onClear}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white/95 px-6 py-2.5 text-sm font-bold text-water-800 shadow-md hover:bg-white"
        >
          Escanear otro
        </button>
      )}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTES
// =============================================================================
function DetailChip({ icon: Icon, label, value }: { icon: typeof CheckCircle2; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 backdrop-blur-md">
      <Icon className="h-3.5 w-3.5 text-white/80 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wider text-white/70">{label}</p>
        <p className="truncate text-xs font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

function Kpi({
  icon, label, value, tone,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  tone: "water" | "emerald" | "violet" | "amber";
}) {
  const toneClasses = {
    water:   { bg: "bg-water-50",   text: "text-water-600",   border: "border-water-200/70" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200/70" },
    violet:  { bg: "bg-violet-50",  text: "text-violet-600",  border: "border-violet-200/70" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-600",   border: "border-amber-200/70" },
  }[tone];
  return (
    <div className={`rounded-2xl border ${toneClasses.border} bg-white/80 px-3 py-2.5 shadow-sm backdrop-blur-md`}>
      <div className="flex items-center justify-between gap-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-app-muted">{label}</p>
        <span className={`flex h-6 w-6 items-center justify-center rounded-md ${toneClasses.bg} ${toneClasses.text}`}>
          {icon}
        </span>
      </div>
      <p className="mt-1 text-lg font-black text-water-800 tabular-nums leading-tight sm:text-xl">{value}</p>
    </div>
  );
}

function HistoryRow({ row }: { row: { id: string; created_at: string; resultado: string; comprador: string | null; tipo: string | null } }) {
  const isValid = row.resultado === "valido";
  const isWarn  = row.resultado === "ya_usado" || row.resultado === "fecha_invalida";
  const tone = isValid ? "text-emerald-600 bg-emerald-50"
            : isWarn  ? "text-amber-600 bg-amber-50"
            :           "text-rose-600 bg-rose-50";
  const Icon = isValid ? CheckCircle2 : isWarn ? AlertTriangle : XCircle;
  return (
    <li className="flex items-center gap-2 px-3 py-2">
      <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md ${tone}`}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-water-800">
          {row.comprador ?? "Visitante"}
          {row.tipo && <span className="ml-1 font-normal text-app-muted">· {row.tipo}</span>}
        </p>
        <p className="text-[10px] text-app-muted tabular-nums">
          {new Date(row.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </li>
  );
}
