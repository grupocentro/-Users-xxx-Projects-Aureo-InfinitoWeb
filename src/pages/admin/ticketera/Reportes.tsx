import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DollarSign, Ticket, Activity, AlertTriangle, Hourglass, RefreshCw,
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";

import { LoadingState } from "@/components/admin/LoadingState";
import { ErrorState } from "@/components/admin/ErrorState";
import { EmptyState } from "@/components/admin/EmptyState";
import { ExportButton } from "@/components/admin/ExportButton";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { statusLabel } from "@/lib/status-labels";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { presetRange, type DateRange } from "@/lib/date-range";

// =============================================================================
// Tipos
// =============================================================================
interface CompraRow {
  id: string; total: number | string; cantidad: number; estado_pago: string;
  created_at: string; tipo_entrada_id: string | null; evento_id: string | null;
  fecha_visita: string | null; user_id: string;
}
interface QrRow { id: string; usado: boolean; usado_at: string | null; compra_id: string }
interface ValidacionRow { id: string; resultado: string; created_at: string }
interface TipoRow { id: string; nombre: string }
interface EventoRow { id: string; nombre: string }
interface ProfileRow { id: string; nombre: string | null; apellido: string | null; email: string | null }

const ARS = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;

function rangeBounds(range: DateRange) {
  const from = range.from ?? format(new Date(), "yyyy-MM-dd");
  const to   = range.to   ?? format(new Date(), "yyyy-MM-dd");
  return { fromIso: `${from}T00:00:00`, toIso: `${to}T23:59:59` };
}

// =============================================================================
// Componente principal
// =============================================================================
export default function Reportes() {
  const [range, setRange] = useState<DateRange>(() => presetRange("30d"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [compras, setCompras] = useState<CompraRow[]>([]);
  const [qrs, setQrs] = useState<QrRow[]>([]);
  const [validaciones, setValidaciones] = useState<ValidacionRow[]>([]);
  const [tipos, setTipos] = useState<TipoRow[]>([]);
  const [eventos, setEventos] = useState<EventoRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { fromIso, toIso } = rangeBounds(range);

    try {
      const [comprasRes, qrsRes, validRes, tiposRes, eventosRes] = await Promise.all([
        supabase
          .from("compras")
          .select("id, total, cantidad, estado_pago, created_at, tipo_entrada_id, evento_id, fecha_visita, user_id")
          .gte("created_at", fromIso).lte("created_at", toIso),
        supabase.from("codigos_qr").select("id, usado, usado_at, compra_id"),
        supabase
          .from("qr_validaciones" as never)
          .select("id, resultado, created_at")
          .gte("created_at", fromIso).lte("created_at", toIso),
        supabase.from("tipos_entrada").select("id, nombre"),
        supabase.from("eventos").select("id, nombre"),
      ]);

      if (comprasRes.error || qrsRes.error || validRes.error) {
        console.error("Reportes error:", comprasRes.error, qrsRes.error, validRes.error);
        setError(true);
        return;
      }
      const comprasData = (comprasRes.data ?? []) as unknown as CompraRow[];
      setCompras(comprasData);
      setQrs((qrsRes.data ?? []) as unknown as QrRow[]);
      setValidaciones((validRes.data ?? []) as unknown as ValidacionRow[]);
      setTipos((tiposRes.data ?? []) as TipoRow[]);
      setEventos((eventosRes.data ?? []) as EventoRow[]);

      // Enriquecer profiles para reportes que muestren compradores (mismatch + pendientes antiguas)
      const userIds = [...new Set(comprasData.map((c) => c.user_id))];
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles").select("id, nombre, apellido, email").in("id", userIds);
        setProfiles((profs ?? []) as ProfileRow[]);
      } else {
        setProfiles([]);
      }
    } catch (err) {
      console.error("Reportes fatal:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ==========================================================================
  // Mapas auxiliares
  // ==========================================================================
  const tipoMap   = useMemo(() => new Map(tipos.map((t) => [t.id, t.nombre])), [tipos]);
  const eventoMap = useMemo(() => new Map(eventos.map((e) => [e.id, e.nombre])), [eventos]);
  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  const aprobadas = useMemo(() => compras.filter((c) => c.estado_pago === "aprobado"), [compras]);
  const mismatch  = useMemo(() => compras.filter((c) => c.estado_pago === "payment_mismatch"), [compras]);
  const pendientes = useMemo(() => compras.filter((c) => c.estado_pago === "pendiente"), [compras]);

  // ==========================================================================
  // Reportes agregados
  // ==========================================================================
  const ventasPorDia = useMemo(() => {
    const map = new Map<string, { dia: string; ingresos: number; tickets: number; compras: number }>();
    for (const c of aprobadas) {
      const dia = c.created_at.slice(0, 10);
      const e = map.get(dia) ?? { dia, ingresos: 0, tickets: 0, compras: 0 };
      e.ingresos += Number(c.total);
      e.tickets += c.cantidad;
      e.compras++;
      map.set(dia, e);
    }
    return Array.from(map.values()).sort((a, b) => a.dia.localeCompare(b.dia));
  }, [aprobadas]);

  const ventasPorTipo = useMemo(() => {
    const map = new Map<string, { tipo: string; ingresos: number; tickets: number; compras: number }>();
    for (const c of aprobadas) {
      if (!c.tipo_entrada_id) continue;
      const tipo = tipoMap.get(c.tipo_entrada_id) ?? "—";
      const e = map.get(c.tipo_entrada_id) ?? { tipo, ingresos: 0, tickets: 0, compras: 0 };
      e.ingresos += Number(c.total); e.tickets += c.cantidad; e.compras++;
      map.set(c.tipo_entrada_id, e);
    }
    return Array.from(map.values()).sort((a, b) => b.ingresos - a.ingresos);
  }, [aprobadas, tipoMap]);

  const ventasPorEvento = useMemo(() => {
    const map = new Map<string, { evento: string; ingresos: number; tickets: number; compras: number }>();
    for (const c of aprobadas) {
      if (!c.evento_id) continue;
      const evento = eventoMap.get(c.evento_id) ?? "—";
      const e = map.get(c.evento_id) ?? { evento, ingresos: 0, tickets: 0, compras: 0 };
      e.ingresos += Number(c.total); e.tickets += c.cantidad; e.compras++;
      map.set(c.evento_id, e);
    }
    return Array.from(map.values()).sort((a, b) => b.ingresos - a.ingresos);
  }, [aprobadas, eventoMap]);

  const ticketsResumen = useMemo(() => {
    const totalEmitidos = qrs.length;
    const usados = qrs.filter((q) => q.usado).length;
    return {
      emitidos: totalEmitidos,
      usados,
      pendientes: totalEmitidos - usados,
      tasaUso: totalEmitidos > 0 ? (usados / totalEmitidos) * 100 : 0,
    };
  }, [qrs]);

  const validacionesAgg = useMemo(() => {
    const map = new Map<string, { resultado: string; total: number }>();
    for (const v of validaciones) {
      const e = map.get(v.resultado) ?? { resultado: v.resultado, total: 0 };
      e.total++;
      map.set(v.resultado, e);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [validaciones]);

  // Compras pendientes "antiguas" — pendientes con más de 24h
  const pendientesAntiguas = useMemo(() => {
    const ahora = new Date();
    return pendientes.filter((c) => differenceInDays(ahora, parseISO(c.created_at)) >= 1)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }, [pendientes]);

  const recaudacionTotal = useMemo(() => ({
    aprobado:         aprobadas.reduce((s, c) => s + Number(c.total), 0),
    pendiente:        pendientes.reduce((s, c) => s + Number(c.total), 0),
    payment_mismatch: mismatch.reduce((s, c) => s + Number(c.total), 0),
  }), [aprobadas, pendientes, mismatch]);

  // ==========================================================================
  // Render
  // ==========================================================================
  if (loading) return <LoadingState message="Cargando reportes..." />;
  if (error)   return <ErrorState onRetry={fetchAll} />;

  const rangoTexto = `${range.from ?? "—"} a ${range.to ?? "—"}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-water-800">Reportes operativos</h1>
          <p className="mt-1 text-sm text-app-muted">
            Reportes agregados del período. Cada uno se puede exportar a CSV o PDF.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <DateRangeFilter value={range} onChange={setRange} />
          <Button variant="outline" size="sm" onClick={fetchAll} className="gap-2 rounded-xl">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="ventas">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
          <TabsTrigger value="ventas">      <DollarSign className="mr-1.5 h-4 w-4" /> Ventas</TabsTrigger>
          <TabsTrigger value="tickets">     <Ticket className="mr-1.5 h-4 w-4" />     Tickets</TabsTrigger>
          <TabsTrigger value="validaciones"><Activity className="mr-1.5 h-4 w-4" />   Validaciones</TabsTrigger>
          <TabsTrigger value="incidencias"> <AlertTriangle className="mr-1.5 h-4 w-4" /> Incidencias</TabsTrigger>
          <TabsTrigger value="recaudacion"> <Hourglass className="mr-1.5 h-4 w-4" />  Recaudación</TabsTrigger>
        </TabsList>

        {/* =================== VENTAS ============================== */}
        <TabsContent value="ventas" className="space-y-4 pt-4">
          {/* Por día */}
          <ReporteCard
            title="Ventas por día"
            description={`Compras aprobadas · ${rangoTexto}`}
            rows={ventasPorDia.map((r) => ({
              dia: format(parseISO(r.dia + "T00:00:00"), "dd/MM/yyyy"),
              compras: r.compras, tickets: r.tickets, ingresos: ARS(r.ingresos),
            }))}
            headers={{ dia: "Día", compras: "Compras", tickets: "Tickets", ingresos: "Ingresos" }}
            filenamePrefix="ventas-por-dia"
            pdfTitle="Ventas por día"
            pdfMeta={{ Período: rangoTexto }}
          />
          {/* Por tipo */}
          <ReporteCard
            title="Ventas por tipo de entrada"
            description={`Compras aprobadas · ${rangoTexto}`}
            rows={ventasPorTipo.map((r) => ({
              tipo: r.tipo, compras: r.compras, tickets: r.tickets, ingresos: ARS(r.ingresos),
            }))}
            headers={{ tipo: "Tipo de entrada", compras: "Compras", tickets: "Tickets", ingresos: "Ingresos" }}
            filenamePrefix="ventas-por-tipo"
            pdfTitle="Ventas por tipo de entrada"
            pdfMeta={{ Período: rangoTexto }}
          />
          {/* Por evento */}
          <ReporteCard
            title="Ventas por evento"
            description={`Compras aprobadas · ${rangoTexto}`}
            rows={ventasPorEvento.map((r) => ({
              evento: r.evento, compras: r.compras, tickets: r.tickets, ingresos: ARS(r.ingresos),
            }))}
            headers={{ evento: "Evento", compras: "Compras", tickets: "Tickets", ingresos: "Ingresos" }}
            filenamePrefix="ventas-por-evento"
            pdfTitle="Ventas por evento"
            pdfMeta={{ Período: rangoTexto }}
          />
        </TabsContent>

        {/* =================== TICKETS ============================== */}
        <TabsContent value="tickets" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumen de tickets QR</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-4">
                <SummaryStat label="Emitidos"  value={ticketsResumen.emitidos} />
                <SummaryStat label="Usados"    value={ticketsResumen.usados} />
                <SummaryStat label="Pendientes" value={ticketsResumen.pendientes} />
                <SummaryStat label="Tasa de uso" value={`${ticketsResumen.tasaUso.toFixed(1)}%`} />
              </div>
            </CardContent>
          </Card>
          <ReporteCard
            title="Detalle de tickets QR"
            description={`Histórico completo (${qrs.length} filas)`}
            rows={qrs.slice(0, 1000).map((q) => ({
              id: q.id.slice(0, 8),
              compra_id: q.compra_id.slice(0, 8),
              usado: q.usado ? "Sí" : "No",
              usado_at: q.usado_at ? format(parseISO(q.usado_at), "dd/MM/yy HH:mm") : "—",
            }))}
            headers={{ id: "QR ID", compra_id: "Compra", usado: "Usado", usado_at: "Hora de uso" }}
            filenamePrefix="tickets-qr"
            pdfTitle="Tickets QR — Detalle"
            pdfMeta={{ "Total": String(qrs.length), "Mostrados en CSV/PDF": String(Math.min(qrs.length, 1000)) }}
            note={qrs.length > 1000 ? "Sólo se exportan las primeras 1000 filas." : undefined}
          />
        </TabsContent>

        {/* =================== VALIDACIONES ============================ */}
        <TabsContent value="validaciones" className="space-y-4 pt-4">
          <ReporteCard
            title="Validaciones QR por resultado"
            description={`Período: ${rangoTexto}`}
            rows={validacionesAgg.map((r) => ({
              resultado: statusLabel("validacion", r.resultado),
              total: r.total,
              pct: validaciones.length > 0 ? `${((r.total / validaciones.length) * 100).toFixed(1)}%` : "0%",
            }))}
            headers={{ resultado: "Resultado", total: "Total", pct: "% del período" }}
            filenamePrefix="validaciones-resumen"
            pdfTitle="Validaciones QR — Resumen"
            pdfMeta={{ Período: rangoTexto, "Total validaciones": String(validaciones.length) }}
          />
        </TabsContent>

        {/* =================== INCIDENCIAS ============================ */}
        <TabsContent value="incidencias" className="space-y-4 pt-4">
          <ReporteCard
            title="Compras con payment_mismatch"
            description="Diferencia entre monto pagado y monto esperado. No se emitieron QR."
            rows={mismatch.map((c) => {
              const p = profileMap.get(c.user_id);
              return {
                fecha: format(parseISO(c.created_at), "dd/MM/yy HH:mm"),
                cliente: p ? `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim() : c.user_id.slice(0, 8),
                email: p?.email ?? "—",
                cantidad: c.cantidad,
                total: ARS(Number(c.total)),
                fecha_visita: c.fecha_visita ?? "—",
              };
            })}
            headers={{
              fecha: "Fecha", cliente: "Cliente", email: "Email",
              cantidad: "Cant.", total: "Total", fecha_visita: "Fecha visita",
            }}
            filenamePrefix="payment-mismatch"
            pdfTitle="Compras con payment_mismatch"
            pdfMeta={{ Período: rangoTexto, "Total": String(mismatch.length) }}
            badge={mismatch.length > 0 ? <StatusBadge kind="compra" value="payment_mismatch" /> : null}
          />
          <ReporteCard
            title="Compras pendientes antiguas (>24h)"
            description="Compras en estado 'pendiente' creadas hace más de 1 día"
            rows={pendientesAntiguas.map((c) => {
              const p = profileMap.get(c.user_id);
              return {
                fecha: format(parseISO(c.created_at), "dd/MM/yy HH:mm"),
                dias: differenceInDays(new Date(), parseISO(c.created_at)),
                cliente: p ? `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim() : c.user_id.slice(0, 8),
                email: p?.email ?? "—",
                cantidad: c.cantidad,
                total: ARS(Number(c.total)),
              };
            })}
            headers={{
              fecha: "Fecha", dias: "Días", cliente: "Cliente", email: "Email",
              cantidad: "Cant.", total: "Total",
            }}
            filenamePrefix="pendientes-antiguas"
            pdfTitle="Compras pendientes antiguas"
            pdfMeta={{ Período: rangoTexto, "Total": String(pendientesAntiguas.length) }}
          />
        </TabsContent>

        {/* =================== RECAUDACIÓN ============================ */}
        <TabsContent value="recaudacion" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recaudación del período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <SummaryStat label="Aprobado"        value={ARS(recaudacionTotal.aprobado)} />
                <SummaryStat label="Pendiente"       value={ARS(recaudacionTotal.pendiente)} />
                <SummaryStat label="Payment mismatch" value={ARS(recaudacionTotal.payment_mismatch)} />
              </div>
            </CardContent>
          </Card>
          <ReporteCard
            title="Detalle de recaudación por compra"
            description={`Todas las compras del período (${compras.length} filas)`}
            rows={compras.slice(0, 1000).map((c) => {
              const p = profileMap.get(c.user_id);
              return {
                fecha: format(parseISO(c.created_at), "dd/MM/yy HH:mm"),
                cliente: p ? `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim() : c.user_id.slice(0, 8),
                estado: statusLabel("compra", c.estado_pago),
                cantidad: c.cantidad,
                total: ARS(Number(c.total)),
              };
            })}
            headers={{
              fecha: "Fecha", cliente: "Cliente", estado: "Estado",
              cantidad: "Cant.", total: "Total",
            }}
            filenamePrefix="recaudacion-detalle"
            pdfTitle="Recaudación — Detalle de compras"
            pdfMeta={{ Período: rangoTexto, "Total": String(compras.length) }}
            note={compras.length > 1000 ? "Sólo se exportan las primeras 1000 filas." : undefined}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =============================================================================
// Subcomponentes locales
// =============================================================================
function SummaryStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-water-100 bg-gradient-to-br from-white via-water-50/40 to-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-app-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold text-water-800">{value}</p>
    </div>
  );
}

interface ReporteCardProps {
  title: string;
  description?: string;
  rows: Record<string, string | number>[];
  headers: Record<string, string>;
  filenamePrefix: string;
  pdfTitle: string;
  pdfMeta?: Record<string, string>;
  note?: string;
  badge?: React.ReactNode;
}

function ReporteCard({ title, description, rows, headers, filenamePrefix, pdfTitle, pdfMeta, note, badge }: ReporteCardProps) {
  const headerKeys = Object.keys(headers);
  return (
    <Card className="border-water-100">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base font-semibold text-water-800">{title}</CardTitle>
          {description && <p className="mt-0.5 text-xs text-app-muted">{description}</p>}
          {badge && <div className="mt-2">{badge}</div>}
          {note && <p className="mt-1 text-[11px] text-amber-700">{note}</p>}
        </div>
        <ExportButton
          filenamePrefix={filenamePrefix}
          title={pdfTitle}
          meta={pdfMeta}
          csvHeaders={headers}
          rows={rows}
          disabled={rows.length === 0}
        />
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <EmptyState variant="inline" title="Sin datos para el período" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {headerKeys.map((k) => <TableHead key={k}>{headers[k]}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 200).map((row, i) => (
                <TableRow key={i}>
                  {headerKeys.map((k) => (
                    <TableCell key={k} className="text-sm">{row[k] ?? "—"}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {rows.length > 200 && (
          <p className="border-t border-app-border bg-water-50/40 px-4 py-2 text-xs text-app-muted">
            Vista limitada a las primeras 200 filas en pantalla. El export incluye todas ({rows.length}).
          </p>
        )}
      </CardContent>
    </Card>
  );
}
