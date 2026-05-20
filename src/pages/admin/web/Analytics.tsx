import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Eye, MousePointerClick, Smartphone, Monitor, ShoppingCart, MessageCircle,
  MapPin, Mail, RefreshCw, Globe,
} from "lucide-react";
import { format, parseISO, startOfDay, startOfMonth, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { MetricCard } from "@/components/admin/MetricCard";
import { ChartCard } from "@/components/admin/ChartCard";
import { LoadingState } from "@/components/admin/LoadingState";
import { ErrorState } from "@/components/admin/ErrorState";
import { EmptyState } from "@/components/admin/EmptyState";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { presetRange, type DateRange } from "@/lib/date-range";

// =============================================================================
// Tipos — tabla `web_analytics_events` (Fase 0)
// =============================================================================
interface AnalyticsEvent {
  id: string;
  event_type: string;
  page_path: string | null;
  element_id: string | null;
  element_label: string | null;
  referrer: string | null;
  device_type: string | null;
  browser: string | null;
  session_id: string | null;
  created_at: string;
}

function rangeBounds(range: DateRange) {
  const from = range.from ?? format(new Date(), "yyyy-MM-dd");
  const to   = range.to   ?? format(new Date(), "yyyy-MM-dd");
  return { fromIso: `${from}T00:00:00`, toIso: `${to}T23:59:59` };
}

// =============================================================================
// Componente
// =============================================================================
export default function Analytics() {
  const [range, setRange] = useState<DateRange>(() => presetRange("30d"));
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { fromIso, toIso } = rangeBounds(range);
    try {
      const { data, error: err } = await supabase
        .from("web_analytics_events" as never)
        .select("id, event_type, page_path, element_id, element_label, referrer, device_type, browser, session_id, created_at")
        .gte("created_at", fromIso).lte("created_at", toIso)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (err) {
        console.error("analytics fetch error:", err);
        setError(true);
      } else {
        setEvents((data ?? []) as unknown as AnalyticsEvent[]);
      }
    } catch (err) {
      console.error("analytics fetch fatal:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ==========================================================================
  // Cálculos derivados
  // ==========================================================================
  const now = new Date();
  const today0 = startOfDay(now).getTime();
  const week0  = startOfDay(subDays(now, 6)).getTime();
  const month0 = startOfMonth(now).getTime();

  const stats = useMemo(() => {
    const pvs = events.filter((e) => e.event_type === "page_view");

    const visitasHoy = pvs.filter((e) => parseISO(e.created_at).getTime() >= today0).length;
    const visitas7d  = pvs.filter((e) => parseISO(e.created_at).getTime() >= week0).length;
    const visitasMes = pvs.filter((e) => parseISO(e.created_at).getTime() >= month0).length;
    const visitasPeriodo = pvs.length;

    const compras    = events.filter((e) => e.event_type === "comprar_entrada_click").length;
    const whatsapps  = events.filter((e) => e.event_type === "whatsapp_click").length;
    const mapas      = events.filter((e) => e.event_type === "mapa_click").length;
    const contactos  = events.filter((e) => e.event_type === "contacto_click").length;
    const eventosClicks = events.filter((e) => e.event_type === "evento_click").length;

    // Sesiones únicas (aproximadas)
    const sesiones = new Set(events.filter((e) => e.session_id).map((e) => e.session_id)).size;

    return {
      visitasHoy, visitas7d, visitasMes, visitasPeriodo,
      compras, whatsapps, mapas, contactos, eventosClicks,
      sesiones,
    };
  }, [events, today0, week0, month0]);

  // Visitas por día
  const visitasPorDia = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events.filter((x) => x.event_type === "page_view")) {
      const dia = e.created_at.slice(0, 10);
      map.set(dia, (map.get(dia) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dia, total]) => ({
        label: format(parseISO(dia + "T00:00:00"), "dd MMM", { locale: es }),
        total,
      }));
  }, [events]);

  // Top páginas
  const topPaginas = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events.filter((x) => x.event_type === "page_view")) {
      const path = e.page_path ?? "(sin path)";
      map.set(path, (map.get(path) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [events]);

  // Top botones clickeados (todos los event_types excepto page_view + agrupados por element_label)
  const topBotones = useMemo(() => {
    const map = new Map<string, { label: string; type: string; count: number }>();
    for (const e of events) {
      if (e.event_type === "page_view") continue;
      const key = `${e.event_type}::${e.element_label ?? "(sin label)"}`;
      const entry = map.get(key) ?? { label: e.element_label ?? "(sin label)", type: e.event_type, count: 0 };
      entry.count++;
      map.set(key, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [events]);

  // Device distribution
  const porDevice = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      const d = e.device_type ?? "unknown";
      map.set(d, (map.get(d) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [events]);

  // Origen / referrer (agrupado simple)
  const porReferrer = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      const ref = e.referrer ?? "(null)";
      // Agrupamos referrers conocidos para legibilidad
      let label = ref;
      if (ref === "direct" || ref === "(null)") label = "Directo";
      else if (ref === "internal") label = "Interno";
      else if (/google\./.test(ref)) label = "Google";
      else if (/instagram/.test(ref)) label = "Instagram";
      else if (/facebook|fb\.com/.test(ref)) label = "Facebook";
      else if (/twitter|t\.co|x\.com/.test(ref)) label = "Twitter/X";
      else label = ref;
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [events]);

  // Actividad reciente: últimos 50
  const recientes = useMemo(() => events.slice(0, 50), [events]);

  // ==========================================================================
  // Render
  // ==========================================================================
  if (loading) return <LoadingState message="Cargando analytics..." />;
  if (error)   return <ErrorState onRetry={fetchData} />;

  const DEVICE_COLORS: Record<string, string> = {
    mobile:  "hsl(var(--water-500))",
    desktop: "hsl(var(--water-700))",
    tablet:  "hsl(var(--water-300))",
    unknown: "hsl(204, 25%, 60%)",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-water-800">Analytics del sitio</h1>
          <p className="mt-1 text-sm text-app-muted">
            Métricas de uso del sitio público. Datos anónimos, sin información personal.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <DateRangeFilter value={range} onChange={setRange} />
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2 rounded-xl">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </Button>
        </div>
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={Eye}
          title="Sin actividad registrada todavía"
          description="A medida que los visitantes naveguen el sitio público, los eventos se irán acumulando acá."
        />
      ) : (
        <>
          {/* ==================== Visitas ==================== */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-water-600">Visitas</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Visitas hoy"      value={stats.visitasHoy}     icon={Eye}    variant="primary" />
              <MetricCard label="Últimos 7 días"   value={stats.visitas7d}      icon={Eye}    variant="default" />
              <MetricCard label="Este mes"         value={stats.visitasMes}     icon={Eye}    variant="default" />
              <MetricCard label="Sesiones únicas"  value={stats.sesiones}       icon={Globe}  variant="default"
                          hint={`${stats.visitasPeriodo} page views del período`} />
            </div>
          </section>

          {/* ==================== Conversiones / Acciones ==================== */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-water-600">Acciones del período</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Click Comprar entrada" value={stats.compras}        icon={ShoppingCart}     variant="success" />
              <MetricCard label="Click WhatsApp"        value={stats.whatsapps}      icon={MessageCircle}    variant="success" />
              <MetricCard label="Click Mapa"            value={stats.mapas}          icon={MapPin}           variant="primary" />
              <MetricCard label="Click Contacto"        value={stats.contactos}      icon={Mail}             variant="primary" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Click en eventos" value={stats.eventosClicks} icon={MousePointerClick} variant="default" />
            </div>
          </section>

          {/* ==================== Gráficos ==================== */}
          <section className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Visitas por día" description="Page views del período">
              {visitasPorDia.length === 0 ? <EmptyState variant="inline" title="Sin visitas" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={visitasPorDia}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--app-border))" />
                    <XAxis dataKey="label" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--app-border))" }} />
                    <Bar dataKey="total" fill="hsl(var(--water-500))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Mobile vs Desktop vs Tablet" description="Distribución por dispositivo">
              {porDevice.length === 0 ? <EmptyState variant="inline" title="Sin datos" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={porDevice} dataKey="value" nameKey="name" outerRadius={90}
                         label={(d) => `${d.name}: ${d.value}`}>
                      {porDevice.map((d, i) => (
                        <Cell key={i} fill={DEVICE_COLORS[d.name] ?? "hsl(var(--water-200))"} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </section>

          {/* ==================== Top páginas + Top botones ==================== */}
          <section className="grid gap-4 lg:grid-cols-2">
            <Card className="border-water-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-water-800">Top páginas más vistas</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {topPaginas.length === 0 ? <EmptyState variant="inline" title="Sin datos" /> : (
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Ruta</TableHead><TableHead className="w-24 text-right">Visitas</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {topPaginas.map(([path, count]) => (
                        <TableRow key={path}>
                          <TableCell className="font-mono text-xs">{path}</TableCell>
                          <TableCell className="text-right font-mono">{count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="border-water-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-water-800">Top botones clickeados</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {topBotones.length === 0 ? <EmptyState variant="inline" title="Sin clicks" /> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Etiqueta</TableHead>
                        <TableHead className="w-20 text-right">Clicks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topBotones.map((b, i) => (
                        <TableRow key={i}>
                          <TableCell><Badge variant="secondary" className="text-[10px]">{b.type}</Badge></TableCell>
                          <TableCell className="text-sm">{b.label}</TableCell>
                          <TableCell className="text-right font-mono">{b.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </section>

          {/* ==================== Referrer ==================== */}
          <section className="grid gap-4 lg:grid-cols-2">
            <Card className="border-water-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-water-800">Origen del tráfico</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {porReferrer.length === 0 ? <EmptyState variant="inline" title="Sin datos" /> : (
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Origen</TableHead><TableHead className="w-20 text-right">Eventos</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {porReferrer.map(([ref, count]) => (
                        <TableRow key={ref}>
                          <TableCell className="text-sm">{ref}</TableCell>
                          <TableCell className="text-right font-mono">{count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <ChartCard title="Top páginas — barras" description="Visualización rápida">
              {topPaginas.length === 0 ? <EmptyState variant="inline" title="Sin datos" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topPaginas.slice(0, 8).map(([path, count]) => ({ path, count }))} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--app-border))" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis type="category" dataKey="path" className="text-xs" width={140} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--app-border))" }} />
                    <Bar dataKey="count" fill="hsl(var(--water-400))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </section>

          {/* ==================== Actividad reciente ==================== */}
          <Card className="border-water-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-water-800">Actividad reciente</CardTitle>
              <p className="text-xs text-app-muted">Últimos 50 eventos del período</p>
            </CardHeader>
            <CardContent className="p-0">
              {recientes.length === 0 ? <EmptyState variant="inline" title="Sin actividad" /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Ruta / Label</TableHead>
                      <TableHead className="hidden md:table-cell">Device</TableHead>
                      <TableHead className="hidden md:table-cell">Browser</TableHead>
                      <TableHead className="hidden lg:table-cell">Origen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recientes.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="whitespace-nowrap text-xs text-app-muted">
                          {format(parseISO(e.created_at), "dd/MM HH:mm:ss", { locale: es })}
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="text-[10px]">{e.event_type}</Badge></TableCell>
                        <TableCell className="text-xs">
                          <div className="font-mono">{e.page_path ?? "—"}</div>
                          {e.element_label && <div className="text-app-muted">{e.element_label}</div>}
                        </TableCell>
                        <TableCell className="hidden text-xs md:table-cell">
                          {e.device_type === "mobile" ? <Smartphone className="inline h-3 w-3" /> :
                           e.device_type === "desktop" ? <Monitor className="inline h-3 w-3" /> : null}
                          <span className="ml-1">{e.device_type ?? "—"}</span>
                        </TableCell>
                        <TableCell className="hidden text-xs text-app-muted md:table-cell">{e.browser ?? "—"}</TableCell>
                        <TableCell className="hidden text-xs text-app-muted lg:table-cell">{e.referrer ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <p className="text-xs text-app-muted">
            Total de eventos en el período: {events.length}{events.length === 5000 ? " (límite alcanzado — usá un rango más corto para ver todos)" : ""}.
            La tabla web_analytics_events es append-only y no guarda datos personales.
          </p>
        </>
      )}
    </div>
  );
}
