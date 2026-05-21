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

// =============================================================================
// ExecKpi — chip premium para la fila de KPIs ejecutivos
// =============================================================================
function ExecKpi({
  label, value, sub, tone, icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone: "water" | "emerald" | "violet" | "amber";
  icon: React.ReactNode;
}) {
  const toneClasses = {
    water:   { ring: "ring-water-200",   bg: "bg-water-50",   text: "text-water-700",   glow: "shadow-water-200/40" },
    emerald: { ring: "ring-emerald-200", bg: "bg-emerald-50", text: "text-emerald-700", glow: "shadow-emerald-200/40" },
    violet:  { ring: "ring-violet-200",  bg: "bg-violet-50",  text: "text-violet-700",  glow: "shadow-violet-200/40" },
    amber:   { ring: "ring-amber-200",   bg: "bg-amber-50",   text: "text-amber-700",   glow: "shadow-amber-200/40" },
  }[tone];

  return (
    <div className={`rounded-2xl bg-white/80 px-4 py-3 ring-1 ${toneClasses.ring} shadow-sm ${toneClasses.glow} backdrop-blur-md transition-all hover:-translate-y-0.5 hover:shadow-md`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-app-muted">{label}</p>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${toneClasses.bg} ${toneClasses.text}`}>
          {icon}
        </span>
      </div>
      <p className="mt-1.5 text-2xl font-black text-water-800">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-app-muted">{sub}</p>}
    </div>
  );
}

export default function TicketeraDashboard() {
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
    const tasaValidacion = qrEmitidosTotales > 0 ? (qrUsadosTotales / qrEmitidosTotales) * 100 : 0;

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
      qrUsadosEnRango: qrUsadosEnRango.length, tasaValidacion,
      // Validaciones
      validTotal: validHoy.length, validExitosas, validFallidas,
    };
  }, [compras, qrs, validaciones, range]);

  // ==========================================================================
  // KPIs EJECUTIVOS — Ingresos hoy / semana, próximos visitantes (NO filtrados por range)
  // Se calculan sobre TODOS los datos disponibles, no solo el período seleccionado.
  // ==========================================================================
  const [topMetrics, setTopMetrics] = useState<{
    ingresosHoy: number;
    ingresosSemana: number;
    proximosVisitantes: number;
    ocupacionFutura: { fecha: string; tickets: number; label: string }[];
  }>({ ingresosHoy: 0, ingresosSemana: 0, proximosVisitantes: 0, ocupacionFutura: [] });

  useEffect(() => {
    let cancel = false;
    (async () => {
      const hoyIso = startOfDay(new Date()).toISOString();
      const hoy7Iso = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
      hoy7Iso.setHours(0, 0, 0, 0);
      const hoy = startOfDay(new Date());
      const hoyDateStr = format(hoy, "yyyy-MM-dd");
      const en45Str = format(new Date(hoy.getTime() + 45 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");

      const [hoyRes, semanaRes, proximosRes] = await Promise.all([
        supabase
          .from("compras")
          .select("total, cantidad")
          .eq("estado_pago", "aprobado")
          .gte("created_at", hoyIso),
        supabase
          .from("compras")
          .select("total")
          .eq("estado_pago", "aprobado")
          .gte("created_at", hoy7Iso.toISOString()),
        supabase
          .from("compras")
          .select("cantidad, fecha_visita")
          .eq("estado_pago", "aprobado")
          .gte("fecha_visita", hoyDateStr)
          .lte("fecha_visita", en45Str),
      ]);

      if (cancel) return;

      const ingresosHoy = (hoyRes.data ?? []).reduce((s, c) => s + Number(c.total ?? 0), 0);
      const ingresosSemana = (semanaRes.data ?? []).reduce((s, c) => s + Number(c.total ?? 0), 0);
      const proximosFilas = (proximosRes.data ?? []) as Array<{ cantidad: number; fecha_visita: string }>;
      const proximosVisitantes = proximosFilas.reduce((s, c) => s + Number(c.cantidad ?? 0), 0);

      // Ocupación próximos 7 días
      const ocupMap = new Map<string, number>();
      for (const p of proximosFilas) {
        if (!p.fecha_visita) continue;
        ocupMap.set(p.fecha_visita, (ocupMap.get(p.fecha_visita) ?? 0) + Number(p.cantidad ?? 0));
      }
      const ocup7: typeof topMetrics.ocupacionFutura = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(hoy.getTime() + i * 24 * 60 * 60 * 1000);
        const key = format(d, "yyyy-MM-dd");
        ocup7.push({
          fecha: key,
          tickets: ocupMap.get(key) ?? 0,
          label: format(d, "EEE dd", { locale: es }).replace(/^./, (c) => c.toUpperCase()),
        });
      }

      setTopMetrics({ ingresosHoy, ingresosSemana, proximosVisitantes, ocupacionFutura: ocup7 });
    })();
    return () => { cancel = true; };
  }, [compras]); // recalcula cuando cambian compras (después de filtrar/refrescar)

  // ==========================================================================
  // ÚLTIMAS VENTAS y PRÓXIMOS VISITANTES — para tablas operativas
  // ==========================================================================
  const ultimasVentas = useMemo(() => {
    return [...compras]
      .filter((c) => c.estado_pago === "aprobado")
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 8);
  }, [compras]);

  const proximosPorDia = useMemo(() => {
    const map = new Map<string, { fecha: string; tickets: number; compras: number }>();
    const hoyStr = format(startOfDay(new Date()), "yyyy-MM-dd");
    for (const c of compras.filter((x) => x.estado_pago === "aprobado")) {
      if (!c.fecha_visita || c.fecha_visita < hoyStr) continue;
      const entry = map.get(c.fecha_visita) ?? { fecha: c.fecha_visita, tickets: 0, compras: 0 };
      entry.tickets += c.cantidad ?? 0;
      entry.compras += 1;
      map.set(c.fecha_visita, entry);
    }
    return Array.from(map.values())
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(0, 8)
      .map((e) => ({ ...e, label: format(parseISO(e.fecha + "T00:00:00"), "EEE dd MMM", { locale: es }).replace(/^./, c => c.toUpperCase()) }));
  }, [compras]);

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
      {/* ── Header ejecutivo ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-water-200/60 bg-gradient-to-br from-water-50 via-white to-white p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-water-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-10 h-36 w-36 rounded-full bg-water-200/40 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-water-200 bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-water-700 backdrop-blur-md">
              <Activity className="h-3 w-3" /> Centro operativo · Live
            </div>
            <h1 className="mt-2 text-3xl font-black leading-tight text-water-800 sm:text-4xl">Dashboard Ticketera</h1>
            <p className="mt-1 max-w-xl text-sm text-app-muted">
              Vista ejecutiva en tiempo real de ventas, accesos y operativa del parque.
            </p>
          </div>
          <DateRangeFilter value={range} onChange={setRange} />
        </div>

        {/* KPIs ejecutivos (globales, no afectados por el filtro de período) */}
        <div className="relative mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ExecKpi
            label="Ingresos hoy"
            value={ARS(topMetrics.ingresosHoy)}
            sub="Compras aprobadas hoy"
            tone="emerald"
            icon={<DollarSign className="h-4 w-4" />}
          />
          <ExecKpi
            label="Ingresos últimos 7 días"
            value={ARS(topMetrics.ingresosSemana)}
            sub="Tendencia semanal"
            tone="water"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <ExecKpi
            label="Próximos visitantes"
            value={topMetrics.proximosVisitantes}
            sub="Próximos 45 días"
            tone="violet"
            icon={<Ticket className="h-4 w-4" />}
          />
          <ExecKpi
            label="Tasa de validación"
            value={`${stats.tasaValidacion.toFixed(1)}%`}
            sub={`${stats.qrUsadosTotales} de ${stats.qrEmitidosTotales} QR usados`}
            tone="amber"
            icon={<ScanLine className="h-4 w-4" />}
          />
        </div>
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

              <ChartCard title="Ocupación próximos 7 días" description="Tickets confirmados para visita">
                {topMetrics.ocupacionFutura.length === 0 ? <EmptyState variant="inline" title="Sin ocupación futura" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topMetrics.ocupacionFutura}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--app-border))" />
                      <XAxis dataKey="label" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--app-border))" }} />
                      <Bar dataKey="tickets" fill="hsl(var(--water-600))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          </section>

          {/* ============================ Tablas operativas ============================ */}
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-water-600">Operativa</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Últimas ventas */}
              <div className="rounded-2xl border border-water-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-bold text-water-800">Últimas ventas aprobadas</h3>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    {ultimasVentas.length}
                  </span>
                </div>
                {ultimasVentas.length === 0 ? (
                  <p className="py-4 text-center text-sm text-app-muted">Sin ventas en el período.</p>
                ) : (
                  <div className="space-y-1.5">
                    {ultimasVentas.map((c) => (
                      <div key={c.id} className="flex items-center justify-between rounded-xl border border-app-border px-3 py-2 hover:bg-water-50/50">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-water-800">
                            {tipos.find((t) => t.id === c.tipo_entrada_id)?.nombre ?? eventos.find((e) => e.id === c.evento_id)?.nombre ?? "—"}
                            <span className="ml-1.5 text-xs text-app-muted">× {c.cantidad}</span>
                          </p>
                          <p className="text-[11px] text-app-muted">
                            {format(parseISO(c.created_at), "dd MMM HH:mm", { locale: es })}
                            {c.fecha_visita && (
                              <> · visita {format(parseISO(c.fecha_visita + "T00:00:00"), "dd/MM", { locale: es })}</>
                            )}
                          </p>
                        </div>
                        <span className="ml-3 flex-shrink-0 font-mono text-sm font-bold text-water-700">
                          {ARS(Number(c.total))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Próximos visitantes */}
              <div className="rounded-2xl border border-water-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-bold text-water-800">Próximos visitantes por día</h3>
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-700">
                    {topMetrics.proximosVisitantes} totales
                  </span>
                </div>
                {proximosPorDia.length === 0 ? (
                  <p className="py-4 text-center text-sm text-app-muted">Sin ocupación próxima.</p>
                ) : (
                  <div className="space-y-1.5">
                    {proximosPorDia.map((p) => (
                      <div key={p.fecha} className="flex items-center justify-between rounded-xl border border-app-border px-3 py-2 hover:bg-violet-50/40">
                        <div>
                          <p className="text-sm font-medium text-water-800">{p.label}</p>
                          <p className="text-[11px] text-app-muted">{p.compras} {p.compras === 1 ? "compra" : "compras"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded-full bg-water-50 px-2 text-sm font-bold text-water-700">
                            {p.tickets}
                          </span>
                          <span className="text-[11px] uppercase tracking-wider text-app-muted">tkts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
