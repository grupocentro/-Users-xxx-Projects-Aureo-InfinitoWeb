import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle, QrCode, Home, Clock, XCircle, AlertTriangle,
  HelpCircle, RefreshCw, Loader2, ShoppingCart,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// =============================================================================
// Tipos locales — la verdad del estado viene de DB, no de la URL.
// =============================================================================
type CompraEstado = "pendiente" | "aprobado" | "rechazado" | "payment_mismatch" | string;

type CompraDetalle = {
  id: string;
  cantidad: number;
  total: number;
  estado_pago: CompraEstado;
  fecha_visita: string | null;
  created_at: string;
  tipo_entrada: { nombre: string; emoji: string | null } | null;
  evento:       { nombre: string; emoji: string | null } | null;
  qrCount: number;
};

// Resultado de la query: pueden faltar relaciones o datos parciales.
type CompraQueryRow = {
  id: string;
  cantidad: number;
  total: number;
  estado_pago: string;
  fecha_visita: string | null;
  created_at: string;
  tipo_entrada: { nombre: string; emoji: string | null } | null;
  evento:       { nombre: string; emoji: string | null } | null;
};

// =============================================================================
// Polling controlado: sólo en `pendiente`, cada 5 s, máximo 60 s.
// =============================================================================
const POLL_INTERVAL_MS = 5000;
const POLL_MAX = 12; // 12 × 5 s = 60 s

// =============================================================================
// Helpers de formato
// =============================================================================
function formatFecha(iso: string | null): string | null {
  if (!iso) return null;
  // `iso` viene como YYYY-MM-DD; agregamos T12:00:00 para evitar TZ shift.
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("es-AR", {
      weekday: "long", day: "numeric", month: "long",
    });
  } catch {
    return iso;
  }
}

function formatMoney(n: number): string {
  return `$${n.toLocaleString("es-AR")}`;
}

// =============================================================================
// Componente
// =============================================================================
export default function CompraExitosa() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const compraId = params.get("compra_id");
  const statusHint = params.get("status"); // sólo informativo, no decide nada

  const [loading, setLoading] = useState(true);
  const [compra, setCompra] = useState<CompraDetalle | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);

  // -------------------------------------------------------------------------
  // Carga de compra desde DB. RLS sólo deja ver compras del propio user.
  // -------------------------------------------------------------------------
  const fetchCompra = useCallback(async (silent = false): Promise<CompraEstado | null> => {
    if (!compraId) return null;
    if (!silent) setLoading(true);

    try {
      const { data, error } = await supabase
        .from("compras")
        .select(
          "id, cantidad, total, estado_pago, fecha_visita, created_at," +
          " tipo_entrada:tipos_entrada(nombre, emoji)," +
          " evento:eventos(nombre, emoji)"
        )
        .eq("id", compraId)
        .maybeSingle();

      if (error) {
        console.error("Error al leer compra:", error);
        setErrorMsg("No pudimos consultar la compra. Probá actualizar en unos segundos.");
        return null;
      }

      if (!data) {
        // Puede ser: id inexistente, o RLS la oculta porque no es del user.
        // En ambos casos, para el cliente es indistinguible: "no encontrada".
        setCompra(null);
        setErrorMsg(null);
        return null;
      }

      const row = data as unknown as CompraQueryRow;

      // Conteo de QR (RLS permite SELECT al dueño vía JOIN con compras).
      let qrCount = 0;
      try {
        const { count } = await supabase
          .from("codigos_qr")
          .select("id", { count: "exact", head: true })
          .eq("compra_id", row.id);
        qrCount = count ?? 0;
      } catch {
        // Silencioso: si falla el conteo, mostramos 0 y seguimos.
      }

      const detalle: CompraDetalle = {
        id: row.id,
        cantidad: row.cantidad,
        total: Number(row.total),
        estado_pago: row.estado_pago,
        fecha_visita: row.fecha_visita,
        created_at: row.created_at,
        tipo_entrada: row.tipo_entrada,
        evento: row.evento,
        qrCount,
      };
      setCompra(detalle);
      setErrorMsg(null);
      return detalle.estado_pago;
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, [compraId]);

  // Fetch inicial cuando hay user y compra_id.
  useEffect(() => {
    if (authLoading) return;
    if (!compraId) { setLoading(false); return; }
    if (!user) {
      // Si vino de MP sin sesión, mandamos al login de visitantes con redirect.
      navigate(`/cliente/login?redirect=${encodeURIComponent(`/compra-exitosa?compra_id=${compraId}`)}`);
      return;
    }
    void fetchCompra(false);
  }, [user, authLoading, compraId, navigate, fetchCompra]);

  // -------------------------------------------------------------------------
  // Polling acotado: sólo si el estado actual es `pendiente`.
  // -------------------------------------------------------------------------
  useEffect(() => {
    // Limpiar cualquier interval previo cuando el estado cambia.
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    if (!compra || compra.estado_pago !== "pendiente") return;

    pollCountRef.current = 0;
    pollIntervalRef.current = setInterval(async () => {
      pollCountRef.current += 1;
      const next = await fetchCompra(true);
      if (next !== "pendiente" || pollCountRef.current >= POLL_MAX) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [compra, fetchCompra]);

  const handleRefresh = () => {
    setRefreshing(true);
    void fetchCompra(true);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  if (loading || authLoading) {
    return <LayoutCenter><Loader2 className="h-8 w-8 animate-spin text-primary" /></LayoutCenter>;
  }

  // Caso 1 — Sin compra_id en la URL.
  if (!compraId) {
    return (
      <Estado
        variant="muted"
        icon={<HelpCircle className="w-10 h-10 text-muted-foreground" />}
        titulo="No pudimos identificar la compra"
        mensaje="No vino información suficiente en el link. Si ya pagaste, revisá tu cuenta."
        primary={{ label: "Mis tickets", onClick: () => navigate("/mi-cuenta"), icon: <QrCode className="w-4 h-4 mr-1" /> }}
        secondary={{ label: "Comprar entradas", onClick: () => navigate("/comprar"), icon: <ShoppingCart className="w-4 h-4 mr-1" /> }}
        hint={statusHint ? `MercadoPago reportó: ${statusHint}` : null}
      />
    );
  }

  // Caso 2 — Hubo error de red/DB consultando.
  if (errorMsg && !compra) {
    return (
      <Estado
        variant="destructive"
        icon={<XCircle className="w-10 h-10 text-destructive" />}
        titulo="No pudimos consultar tu compra"
        mensaje={errorMsg}
        primary={{ label: refreshing ? "Actualizando…" : "Reintentar", onClick: handleRefresh, icon: <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />, disabled: refreshing }}
        secondary={{ label: "Inicio", onClick: () => navigate("/"), icon: <Home className="w-4 h-4 mr-1" /> }}
      />
    );
  }

  // Caso 3 — Compra no existe o pertenece a otro usuario (RLS la oculta).
  if (!compra) {
    return (
      <Estado
        variant="muted"
        icon={<HelpCircle className="w-10 h-10 text-muted-foreground" />}
        titulo="Compra no encontrada"
        mensaje="Esta compra no existe o no está asociada a tu cuenta."
        primary={{ label: "Mis tickets", onClick: () => navigate("/mi-cuenta"), icon: <QrCode className="w-4 h-4 mr-1" /> }}
        secondary={{ label: "Inicio", onClick: () => navigate("/"), icon: <Home className="w-4 h-4 mr-1" /> }}
      />
    );
  }

  // Caso 4 — Compra encontrada: branching por estado real.
  const entradaLabel = compra.evento?.nombre || compra.tipo_entrada?.nombre || "Entrada";
  const emoji = compra.evento?.emoji || compra.tipo_entrada?.emoji || "🎟️";
  const fechaTxt = formatFecha(compra.fecha_visita);

  if (compra.estado_pago === "aprobado") {
    return (
      <Estado
        variant="success"
        icon={<CheckCircle className="w-10 h-10 text-green-600" />}
        titulo="¡Compra aprobada! 🎉"
        mensaje="Tus entradas ya están disponibles."
        detalles={[
          { label: "Entrada", value: `${emoji} ${entradaLabel}` },
          { label: "Cantidad", value: `${compra.cantidad}` },
          { label: "Total", value: formatMoney(compra.total) },
          ...(fechaTxt ? [{ label: "Fecha visita", value: fechaTxt }] : []),
          ...(compra.qrCount > 0
            ? [{ label: "Códigos QR", value: `${compra.qrCount} generado${compra.qrCount > 1 ? "s" : ""}` }]
            : []),
        ]}
        primary={{ label: "Ver mis QR", onClick: () => navigate("/mi-cuenta"), icon: <QrCode className="w-4 h-4 mr-1" /> }}
        secondary={{ label: "Inicio", onClick: () => navigate("/"), icon: <Home className="w-4 h-4 mr-1" /> }}
      />
    );
  }

  if (compra.estado_pago === "pendiente") {
    return (
      <Estado
        variant="muted"
        icon={<Clock className="w-10 h-10 text-muted-foreground" />}
        titulo="Pago pendiente de confirmación"
        mensaje="MercadoPago todavía está procesando tu pago. Esto puede tardar unos minutos."
        detalles={[
          { label: "Entrada", value: `${emoji} ${entradaLabel}` },
          { label: "Cantidad", value: `${compra.cantidad}` },
          { label: "Total", value: formatMoney(compra.total) },
        ]}
        hint="Estamos revisando automáticamente cada pocos segundos."
        primary={{ label: refreshing ? "Actualizando…" : "Actualizar estado", onClick: handleRefresh, icon: <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />, disabled: refreshing }}
        secondary={{ label: "Mi cuenta", onClick: () => navigate("/mi-cuenta"), icon: <Home className="w-4 h-4 mr-1" /> }}
      />
    );
  }

  if (compra.estado_pago === "rechazado") {
    return (
      <Estado
        variant="destructive"
        icon={<XCircle className="w-10 h-10 text-destructive" />}
        titulo="Pago rechazado"
        mensaje="No pudimos confirmar el pago de esta compra. Podés intentarlo de nuevo."
        detalles={[
          { label: "Entrada", value: `${emoji} ${entradaLabel}` },
          { label: "Total intentado", value: formatMoney(compra.total) },
        ]}
        primary={{ label: "Comprar entradas", onClick: () => navigate("/comprar"), icon: <ShoppingCart className="w-4 h-4 mr-1" /> }}
        secondary={{ label: "Inicio", onClick: () => navigate("/"), icon: <Home className="w-4 h-4 mr-1" /> }}
      />
    );
  }

  if (compra.estado_pago === "payment_mismatch") {
    return (
      <Estado
        variant="destructive"
        icon={<AlertTriangle className="w-10 h-10 text-destructive" />}
        titulo="Pago en revisión"
        mensaje="Detectamos una diferencia entre el monto pagado y el monto esperado. Tu compra quedó en revisión y NO se emitieron QR todavía."
        detalles={[
          { label: "Entrada", value: `${emoji} ${entradaLabel}` },
          { label: "Total esperado", value: formatMoney(compra.total) },
          { label: "ID compra", value: compra.id.slice(0, 8) + "…" },
        ]}
        hint="Si pasaron más de 30 minutos sin resolución, contactá soporte con el ID de compra."
        primary={{ label: "Mi cuenta", onClick: () => navigate("/mi-cuenta"), icon: <Home className="w-4 h-4 mr-1" /> }}
        secondary={{ label: "Inicio", onClick: () => navigate("/"), icon: <Home className="w-4 h-4 mr-1" /> }}
      />
    );
  }

  // Caso 5 — Estado desconocido (cancelado, failure, valor no esperado).
  return (
    <Estado
      variant="muted"
      icon={<AlertTriangle className="w-10 h-10 text-muted-foreground" />}
      titulo="Estado no reconocido"
      mensaje={`La compra está en estado "${compra.estado_pago}". Si creés que es un error, revisá en tu cuenta o contactanos.`}
      detalles={[
        { label: "Entrada", value: `${emoji} ${entradaLabel}` },
        { label: "Total", value: formatMoney(compra.total) },
      ]}
      primary={{ label: refreshing ? "Actualizando…" : "Actualizar estado", onClick: handleRefresh, icon: <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />, disabled: refreshing }}
      secondary={{ label: "Mi cuenta", onClick: () => navigate("/mi-cuenta"), icon: <Home className="w-4 h-4 mr-1" /> }}
    />
  );
}

// =============================================================================
// Subcomponentes UI internos — no se exportan, sólo organizan el render.
// =============================================================================
function LayoutCenter({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {children}
    </div>
  );
}

type EstadoVariant = "success" | "destructive" | "muted";

type CtaButton = {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
};

type EstadoProps = {
  variant: EstadoVariant;
  icon: React.ReactNode;
  titulo: string;
  mensaje: string;
  detalles?: { label: string; value: string }[];
  hint?: string | null;
  primary?: CtaButton;
  secondary?: CtaButton;
};

const VARIANT_BG: Record<EstadoVariant, string> = {
  success:     "bg-green-100",
  destructive: "bg-destructive/10",
  muted:       "bg-muted",
};

function Estado({ variant, icon, titulo, mensaje, detalles, hint, primary, secondary }: EstadoProps) {
  return (
    <LayoutCenter>
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className={`w-16 h-16 rounded-full ${VARIANT_BG[variant]} flex items-center justify-center mx-auto mb-4`}>
            {icon}
          </div>
          <h1 className="text-2xl font-bold mb-2">{titulo}</h1>
          <p className="text-muted-foreground mb-6">{mensaje}</p>

          {detalles && detalles.length > 0 && (
            <div className="border rounded-2xl p-4 mb-4 text-left space-y-2">
              {detalles.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{d.label}</span>
                  <span className="font-semibold">{d.value}</span>
                </div>
              ))}
            </div>
          )}

          {hint && (
            <p className="text-xs text-muted-foreground mb-4">{hint}</p>
          )}

          <div className="flex gap-3">
            {secondary && (
              <Button variant="outline" className="flex-1" onClick={secondary.onClick} disabled={secondary.disabled}>
                {secondary.icon}{secondary.label}
              </Button>
            )}
            {primary && (
              <Button className="flex-1" onClick={primary.onClick} disabled={primary.disabled}>
                {primary.icon}{primary.label}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </LayoutCenter>
  );
}
