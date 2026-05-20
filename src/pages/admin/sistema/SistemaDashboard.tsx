import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line,
} from "recharts";
import {
  DollarSign, Ticket, ShoppingCart, AlertTriangle, CheckCircle2, Clock,
  XCircle, ScanLine, TrendingUp, Calendar, Award, Activity,
} from "lucide-react";
import { format, parseISO, startOfDay } from "date-fns";
import { es } from "date-fns/locale";

import { MetricCard } from "@/components/admin/MetricCard";
import { ChartCard } from "@/components/admin/ChartCard";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { presetRange, type DateRange } from "@/lib/date-range";
import { LoadingState } from "@/components/admin/LoadingState";
import { ErrorState } from "@/components/admin/ErrorState";
import { EmptyState } from "@/components/admin/EmptyState";

// =============================================================================
// Tipos auxiliares (sólo lo que usamos del schema, sin depender de types.ts)
// =============================================================================
interface CompraRow {
  id: string;
  total: number | string;
  cantidad: number;
  estado_pago: string;
  created_at: string;
  tipo_entrada_id: string | null;
  evento_id: string | null;
  fecha_visita: string | null;
}
interface CodigoQrRow {
  id: string;
  usado: boolean;
  usado_at: string | null;
  compra_id: string;
}
interface QrValidacionRow {
  id: string;
  resultado: string;
  created_at: string;
}
interface TipoEntradaRow { id: string; nombre: string }
interface EventoRow      { id: string; nombre: string }

const ARS = (n: number) => `$${Math.round(n).toLocaleString("es-AR")}`;
const PIE_COLORS = ["hsl(var(--water-500))", "hsl(var(--water-300))", "hsl(var(--water-700))", "hsl(var(--water-200))", "hsl(38, 95%, 55%)"];
const STATUS_COLORS: Record<string, string> = {
  aprobado:         "hsl(160, 70%, 45%)",
  pendiente:        "hsl(38, 95%, 55%)",
  rechazado:        "hsl(0, 80%, 60%)",
  payment_mismatch: "hsl(50, 90%, 55%)",
};

function rangeInclusive(range: DateRange): { fromIso: string; toIso: string } {
  // Conviene asumir que el rango es siempre válido (preset garantiza valores).
  const from = range.from ?? format(startOfDay(new Date()), "yyyy-MM-dd");
  const to   = range.to   ?? format(startOfDay(new Date()), "yyyy-MM-dd");
  return { fromIso: `${from}T00:00:00`, toIso: `${to}T23:59:59` };
}

function isoDay(s: string): string { return s.slice(0, 10); }

export default function SistemaDashboard() {
  const [range, setRange] = useState<DateRange>(() => presetRange("7d"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [compras, setCompras] = useState<CompraRow[]>([]);
  const [qrs, setQrs] = useState<CodigoQrRow[]>([]);
  const [validaciones, setValidaciones] = useState<QrValidacionRow[]>([]);
  const [tipos, setTipos] = useState<TipoEntradaRow[]>([]);
  const [eventos, setEventos] = useState<EventoRow[]>([]);

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      setLoading(true);
      setError(false);
      const { fromIso, toIso } = rangeInclusive(range);

      try {
        const [comprasRes, qrsRes, validRes, tiposRes, eventosRes] = await Promise.all([
          // Compras del rango: filtramos por created_at del rango
          supabase
            .from("compras")
            .select("id, total, cantidad, estado_pago, created_at, tipo_entrada_id, evento_id, fecha_visita")
            .gte("created_at", fromIso).lte("created_at", toIso),
          // Códigos QR: todos (poco volumen relativo); usado_at del rango para "validados hoy"
          supabase
            .from("codigos_qr")
            .select("id, usado, usado_at, compra_id"),
          // Validaciones del rango
          supabase
            .from("qr_validaciones" as never)
            .select("id, resultado, created_at")
            .gte("created_at", fromIso).lte("created_at", toIso)
            .order("created_at", { ascending: false }),
          supabase.from("tipos_entrada").select("id, nombre"),
          supabase.from("eventos").select("id, nombre"),
        ]);

        if (cancel) return;

        if (comprasRes.error || qrsRes.error || validRes.error || tiposRes.error || eventosRes.error) {
          console.error("Dashboard error:", comprasRes.error, qrsRes.error, validRes.error);
          setError(true);
          return;
        }

        setCompras((comprasRes.data ?? []) as unknown as CompraRow[]);
        setQrs((qrsRes.data ?? []) as unknown as CodigoQrRow[]);
        setValidaciones((validRes.data ?? []) as unknown as QrValidacionRow[]);
        setTipos((tiposRes.data ?? []) as TipoEntradaRow[]);
        setEventos((eventosRes.data ?? []) as EventoRow[]);
      } catch (err) {
        console.error("Dashboard fatal:", err);
        if (!cancel) setError(true);
      } finally {
        if (!cancel) setLoading(false);
      }
    };
    load();
    return () => { cancel = true; };
  }, [range]);

  // ==========================================================================
  // Cálculos derivados
  // ==========================================================================
  const stats = useMemo(() => {
    const aprobadas = compras.filter((c) => c.estado_pago === "aprobado");
    const pendientes = compras.filter((c) => c.estado_pago === "pendiente");
    const rechazadas = compras.filter((c) => c.estado_pago === "rechazado");
    const mismatch = compras.filter((c) => c.estado_pago === "payment_mismatch");

    const ingresos = aprobadas.reduce((s, c) => s + Number(c.total), 0);
    const ticketsVendidos = aprobadas.reduce((s, c) => s + (c.cantidad ?? 0), 0);
    const ticketPromedio = aprobadas.length > 0 ? ingresos / aprobadas.length : 0;
    const ticketsPorCompra = aprobadas.length > 0 ? ticketsVendidos / aprobadas.length : 0;

    // QR del periodo: filtramos los QR usados en el rango (usado_at)
    const { fromIso, toIso } = rangeInclusive(range);
    const qrUsadosEnRango = qrs.filter((q) => q.usado && q.usado_at && q.usado_at >= fromIso && q.usado_at <= toIso);
    const qrEmitidosTotales = qrs.length;
    const qrUsadosTotales = qrs.filter((q) => q.usado).length;
    const qrPendientesTotales = qrEmitidosTotales - qrUsadosTotales;

    const validHoy = validaciones; // ya están filtradas por rango
    const validExitosas = validHoy.filter((v) => v.resultado === "valido").length;
    const validFallidas = validHoy.filter((v) => v.resultado !== "valido").length;

    return {
      // Ventas
      ingresos, ticketsVendidos, comprasAprobadas: aprobadas.length,
      comprasPendientes: pendientes.length, comprasRechazadas: rechazadas.length,
      comprasMismatch: mismatch.length, ticketPromedio, ticketsPorCompra,
      // QR
      qrEmitidosTotales, qrUsadosTotales, qrPendientesTotales,
      qrUsadosEnRango: qrUsadosEnRango.length,
      // Validaciones
      validTotal: validHoy.length, validExitosas, validFallidas,
    };
  }, [compras, qrs, validaciones, range]);

  // Ventas por día (chart)
  const ventasPorDia = useMemo(() => {
    const map = new Map<string, { dia: string; ingresos: number; tickets: number }>();
    const aprobadas = compras.filter((c) => c.estado_pago === "aprobado");
    for (const c of aprobadas) {
      const dia = isoDay(c.created_at);
      const entry = map.get(dia) ?? { dia, ingresos: 0, tickets: 0 };
      entry.ingresos += Number(c.total);
      entry.tickets += c.cantidad ?? 0;
      map.set(dia, entry);
    }
    return Array.from(map.values())
      .sort((a, b) => a.dia.localeCompare(b.dia))
      .map((e) => ({ ...e, label: format(parseISO(e.dia + "T00:00:00"), "dd MMM", { locale: es }) }));
  }, [compras]);

  // Tickets por tipo de entrada
  const ticketsPorTipo = useMemo(() => {
    const tipoMap = new Map(tipos.map((t) => [t.id, t.nombre]));
    const map = new Map<string, { nombre: string; cantidad: number; ingresos: number }>();
    for (const c of compras.filter((x) => x.estado_pago === "aprobado")) {
      if (!c.tipo_entrada_id) continue;
      const nombre = tipoMap.get(c.tipo_entrada_id) ?? "—";
      const entry = map.get(c.tipo_entrada_id) ?? { nombre, cantidad: 0, ingresos: 0 };
      entry.cantidad += c.cantidad ?? 0;
      entry.ingresos += Number(c.total);
      map.set(c.tipo_entrada_id, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.cantidad - a.cantidad);
  }, [compras, tipos]);

  // Ventas por evento
  const ventasPorEvento = useMemo(() => {
    const evMap = new Map(eventos.map((e) => [e.id, e.nombre]));
    const map = new Map<string, { nombre: string; ingresos: number; tickets: number }>();
    for (const c of compras.filter((x) => x.estado_pago === "aprobado")) {
      if (!c.evento_id) continue;
      const nombre = evMap.get(c.evento_id) ?? "—";
      const entry = map.get(c.evento_id) ?? { nombre, ingresos: 0, tickets: 0 };
      entry.ingresos += Number(c.total);
      entry.tickets += c.cantidad ?? 0;
      map.set(c.evento_id, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.ingresos - a.ingresos);
  }, [compras, eventos]);

  // Distribución por estado de pago
  const estadoCompras = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of compras) counts[c.estado_pago] = (counts[c.estado_pago] ?? 0) + 1;
    return Object.entries(counts).map(([estado, value]) => ({ estado, value }));
  }, [compras]);

  // QR usados vs pendientes (totales)
  const qrPie = useMemo(() => ([
    { name: "Usados",     value: stats.qrUsadosTotales },
    { name: "Pendientes", value: stats.qrPendientesTotales },
  ]), [stats]);

  // Validaciones por día
  const validacionesPorDia = useMemo(() => {
    const map = new Map<string, { dia: string; exitosas: number; fallidas: number }>();
    for (const v of validaciones) {
      const dia = isoDay(v.created_at);
      const entry = map.get(dia) ?? { dia, exitosas: 0, fallidas: 0 };
      if (v.resultado === "valido") entry.exitosas++;
      else entry.fallidas++;
      map.set(dia, entry);
    }
    return Array.from(map.values())
      .sort((a, b) => a.dia.localeCompare(b.dia))
      .map((e) => ({ ...e, label: format(parseISO(e.dia + "T00:00:00"), "dd MMM", { locale: es }) }));
  }, [validaciones]);

  // Rankings / "top X"
  const mejorDia = useMemo(() => {
    if (ventasPorDia.length === 0) return null;
    return ventasPorDia.reduce((acc, d) => (d.ingresos > acc.ingresos ? d : acc), ventasPorDia[0]);
  }, [ventasPorDia]);

  const tipoTop = ticketsPorTipo[0] ?? null;
  const eventoTop = ventasPorEvento[0] ?? null;

  // ==========================================================================
  // Render
  // ==========================================================================
  if (loading) return <LoadingState message="Cargando datos del dashboard..." />;
  if (error)   return <ErrorState onRetry={() => setRange({ ...range })} />;

  const hayDatos = compras.length > 0 || qrs.length > 0 || validaciones.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-water-800">Dashboard Ticketera</h1>
          <p className="mt-1 text-sm text-app-muted">
            Vista operativa con datos reales del período seleccionado.
          </p>
        </div>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      {!hayDatos ? (
        <EmptyState
          title="Sin actividad en el período"
          description="No hay compras, QR ni validaciones registradas dentro del rango seleccionado. Probá ampliar el período."
        />
      ) : (
        <>
          {/* ============================ KPIs Ventas ============================ */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-water-600">Ventas e ingresos</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Ingresos del período" value={ARS(stats.ingresos)} icon={DollarSign} variant="primary" />
              <MetricCard label="Tickets vendidos"     value={stats.ticketsVendidos}  icon={Ticket}        variant="default" />
              <MetricCard label="Compras aprobadas"    value={stats.comprasAprobadas} icon={CheckCircle2} variant="success" />
              <MetricCard label="Ticket promedio"      value={ARS(stats.ticketPromedio)} icon={TrendingUp} variant="default"
                          hint={`Tickets/compra: ${stats.ticketsPorCompra.toFixed(2)}`} />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Pendientes"       value={stats.comprasPendientes} icon={Clock}          variant="warning" />
              <MetricCard label="Rechazadas"       value={stats.comprasRechazadas} icon={XCircle}        variant="danger" />
              <MetricCard label="Payment mismatch" value={stats.comprasMismatch}   icon={AlertTriangle}  variant="warning"
                          hint={stats.comprasMismatch > 0 ? "Requiere revisión" : "Sin incidencias"} />
              <MetricCard
                label="Mejor día"
                value={mejorDia ? mejorDia.label : "—"}
                icon={Award}
                variant="primary"
                hint={mejorDia ? ARS(mejorDia.ingresos) : undefined}
              />
            </div>
          </section>

          {/* ============================ KPIs QR ============================ */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-water-600">Tickets QR</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="QR emitidos (total)" value={stats.qrEmitidosTotales} icon={Ticket}       variant="default" />
              <MetricCard label="QR usados (total)"   value={stats.qrUsadosTotales}   icon={CheckCircle2} variant="success"
                          hint={stats.qrEmitidosTotales > 0
                            ? `${((stats.qrUsadosTotales / stats.qrEmitidosTotales) * 100).toFixed(1)}% de tasa de uso`
                            : undefined} />
              <MetricCard label="QR pendientes"       value={stats.qrPendientesTotales} icon={Clock}      variant="warning" />
              <MetricCard label="Usados en el período" value={stats.qrUsadosEnRango}   icon={ScanLine}    variant="primary" />
            </div>
          </section>

          {/* ============================ KPIs Validaciones ============================ */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-water-600">Validaciones del período</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Validaciones totales"   value={stats.validTotal}     icon={Activity}      variant="default" />
              <MetricCard label="Exitosas"               value={stats.validExitosas}  icon={CheckCircle2}  variant="success" />
              <MetricCard label="Fallidas"               value={stats.validFallidas}  icon={XCircle}       variant="danger" />
              <MetricCard
                label="Evento top"
                value={eventoTop ? eventoTop.nombre : "—"}
                icon={Calendar}
                variant="primary"
                hint={eventoTop ? `${eventoTop.tickets} tickets · ${ARS(eventoTop.ingresos)}` : undefined}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Tipo top"
                value={tipoTop ? tipoTop.nombre : "—"}
                icon={Award}
                variant="primary"
                hint={tipoTop ? `${tipoTop.cantidad} tickets · ${ARS(tipoTop.ingresos)}` : undefined}
              />
            </div>
          </section>

          {/* ============================ Gráficos ============================ */}
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-water-600">Análisis gráfico</h2>

            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Ingresos por día" description="Sólo compras aprobadas del período">
                {ventasPorDia.length === 0 ? <EmptyState variant="inline" title="Sin ventas" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ventasPorDia}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--app-border))" />
                      <XAxis dataKey="label" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip formatter={(v: number) => [ARS(v), "Ingresos"]}
                               contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--app-border))" }} />
                      <Bar dataKey="ingresos" fill="hsl(var(--water-500))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Tickets vendidos por día">
                {ventasPorDia.length === 0 ? <EmptyState variant="inline" title="Sin datos" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ventasPorDia}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--app-border))" />
                      <XAxis dataKey="label" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--app-border))" }} />
                      <Line type="monotone" dataKey="tickets" stroke="hsl(var(--water-600))" strokeWidth={2}
                            dot={{ fill: "hsl(var(--water-700))", r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Tickets por tipo de entrada">
                {ticketsPorTipo.length === 0 ? <EmptyState variant="inline" title="Sin datos" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ticketsPorTipo} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--app-border))" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis type="category" dataKey="nombre" className="text-xs" width={120} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--app-border))" }} />
                      <Bar dataKey="cantidad" fill="hsl(var(--water-400))" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Estado de compras">
                {estadoCompras.length === 0 ? <EmptyState variant="inline" title="Sin datos" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={estadoCompras} dataKey="value" nameKey="estado" outerRadius={90}
                           label={(d) => `${d.estado}: ${d.value}`}>
                        {estadoCompras.map((e, i) => (
                          <Cell key={i} fill={STATUS_COLORS[e.estado] ?? PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="QR usados vs pendientes" description="Sobre el total histórico de QR emitidos">
                {stats.qrEmitidosTotales === 0 ? <EmptyState variant="inline" title="Sin QR emitidos" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={qrPie} dataKey="value" nameKey="name" outerRadius={90}
                           label={(d) => `${d.name}: ${d.value}`}>
                        <Cell fill="hsl(160, 70%, 45%)" />
                        <Cell fill="hsl(38, 95%, 55%)" />
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Validaciones por día">
                {validacionesPorDia.length === 0 ? <EmptyState variant="inline" title="Sin validaciones" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={validacionesPorDia}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--app-border))" />
                      <XAxis dataKey="label" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--app-border))" }} />
                      <Legend />
                      <Bar dataKey="exitosas" stackId="v" fill="hsl(160, 70%, 45%)" name="Exitosas" />
                      <Bar dataKey="fallidas" stackId="v" fill="hsl(0, 80%, 60%)"  name="Fallidas" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Ventas por evento" description="Top eventos con ingresos del período">
                {ventasPorEvento.length === 0 ? <EmptyState variant="inline" title="Sin ventas de eventos" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ventasPorEvento.slice(0, 8)} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--app-border))" />
                      <XAxis type="number" className="text-xs" tickFormatter={(v) => ARS(v)} />
                      <YAxis type="category" dataKey="nombre" className="text-xs" width={130} />
                      <Tooltip formatter={(v: number) => [ARS(v), "Ingresos"]}
                               contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--app-border))" }} />
                      <Bar dataKey="ingresos" fill="hsl(var(--water-700))" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Ingresos por tipo de entrada">
                {ticketsPorTipo.length === 0 ? <EmptyState variant="inline" title="Sin datos" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ticketsPorTipo}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--app-border))" />
                      <XAxis dataKey="nombre" className="text-xs" />
                      <YAxis className="text-xs" tickFormatter={(v) => ARS(v)} />
                      <Tooltip formatter={(v: number) => [ARS(v), "Ingresos"]}
                               contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--app-border))" }} />
                      <Bar dataKey="ingresos" fill="hsl(var(--water-500))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
