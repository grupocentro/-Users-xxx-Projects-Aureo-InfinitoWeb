import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card, CardContent,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  RefreshCw, ChevronDown, ChevronUp, Activity, CheckCircle2, XCircle,
  Clock, ShieldCheck, AlertTriangle, Users, History,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

import { MetricCard } from "@/components/admin/MetricCard";
import { ChartCard } from "@/components/admin/ChartCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { statusLabel } from "@/lib/status-labels";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";
import { presetRange, type DateRange } from "@/lib/date-range";
import { LoadingState } from "@/components/admin/LoadingState";
import { ErrorState } from "@/components/admin/ErrorState";
import { EmptyState } from "@/components/admin/EmptyState";
import { ExportButton } from "@/components/admin/ExportButton";

// =============================================================================
// Tipos
// =============================================================================
interface RawValidacion {
  id: string;
  created_at: string;
  resultado: string;
  motivo: string | null;
  uuid_code: string | null;
  qr_id: string | null;
  compra_id: string | null;
  scanner_id: string | null;
  metadata: Record<string, unknown> | null;
}

interface ValidacionEnriquecida extends RawValidacion {
  scanner_nombre: string;
  scanner_rol: string;
  comprador_nombre: string;
  tipo_entrada: string;
  evento: string;
  fecha_visita: string | null;
  punto_acceso: string | null;
  device_type: string | null;
}

const RESULTADOS = ["valido", "ya_usado", "no_encontrado", "compra_no_aprobada", "fecha_invalida", "error"] as const;

function rangeBounds(range: DateRange) {
  const from = range.from ?? format(new Date(), "yyyy-MM-dd");
  const to   = range.to   ?? format(new Date(), "yyyy-MM-dd");
  return { fromIso: `${from}T00:00:00`, toIso: `${to}T23:59:59` };
}

// =============================================================================
// Componente principal
// =============================================================================
export default function Validaciones() {
  const [range, setRange] = useState<DateRange>(() => presetRange("today"));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState<ValidacionEnriquecida[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Filtros adicionales (en cliente, sobre el rango ya filtrado en server)
  const [fResultado, setFResultado] = useState("todos");
  const [fValidador, setFValidador] = useState("todos");
  const [fRol,       setFRol]       = useState("todos");
  const [fTipo,      setFTipo]      = useState("todos");
  const [fEvento,    setFEvento]    = useState("todos");
  const [fPunto,     setFPunto]     = useState("todos");

  // =========================================================================
  // Carga + enriquecimiento
  // =========================================================================
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { fromIso, toIso } = rangeBounds(range);

    try {
      // 1. validaciones del rango
      const { data: validRaw, error: validErr } = await supabase
        .from("qr_validaciones" as never)
        .select("id, created_at, resultado, motivo, uuid_code, qr_id, compra_id, scanner_id, metadata")
        .gte("created_at", fromIso).lte("created_at", toIso)
        .order("created_at", { ascending: false })
        .limit(2000);

      if (validErr) {
        console.error("Validaciones error:", validErr);
        setError(true);
        return;
      }
      const validRows = (validRaw ?? []) as unknown as RawValidacion[];

      if (validRows.length === 0) {
        setData([]);
        return;
      }

      // 2. ids únicos para enriquecer
      const scannerIds = [...new Set(validRows.map((v) => v.scanner_id).filter(Boolean))] as string[];
      const compraIds  = [...new Set(validRows.map((v) => v.compra_id).filter(Boolean))] as string[];

      // 3. enriquecer scanners (profiles + roles) y compras (tipo + evento + comprador)
      const [profilesScanRes, rolesRes, comprasRes] = await Promise.all([
        scannerIds.length > 0
          ? supabase.from("profiles").select("id, nombre, apellido").in("id", scannerIds)
          : Promise.resolve({ data: [] }),
        scannerIds.length > 0
          ? supabase.from("user_roles").select("user_id, role").in("user_id", scannerIds)
          : Promise.resolve({ data: [] }),
        compraIds.length > 0
          ? supabase
              .from("compras")
              .select("id, user_id, tipo_entrada_id, evento_id, fecha_visita")
              .in("id", compraIds)
          : Promise.resolve({ data: [] }),
      ]);

      const compras = (comprasRes.data ?? []) as Array<{
        id: string; user_id: string; tipo_entrada_id: string | null;
        evento_id: string | null; fecha_visita: string | null;
      }>;

      const buyerIds = [...new Set(compras.map((c) => c.user_id).filter(Boolean))];
      const tipoIds  = [...new Set(compras.map((c) => c.tipo_entrada_id).filter(Boolean))] as string[];
      const evIds    = [...new Set(compras.map((c) => c.evento_id).filter(Boolean))] as string[];

      const [profilesBuyersRes, tiposRes, eventosRes] = await Promise.all([
        buyerIds.length > 0
          ? supabase.from("profiles").select("id, nombre, apellido").in("id", buyerIds)
          : Promise.resolve({ data: [] }),
        tipoIds.length > 0
          ? supabase.from("tipos_entrada").select("id, nombre").in("id", tipoIds)
          : Promise.resolve({ data: [] }),
        evIds.length > 0
          ? supabase.from("eventos").select("id, nombre").in("id", evIds)
          : Promise.resolve({ data: [] }),
      ]);

      // 4. construir mapas
      const scannerNameMap = new Map(
        (profilesScanRes.data ?? []).map((p) => [p.id, `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim() || "—"]),
      );
      // Si un user tiene varios roles, tomamos el de mayor prioridad (admin > editor > control_entradas)
      const ROLE_ORDER: Record<string, number> = { admin: 3, editor: 2, control_entradas: 1 };
      const rolesByUser = new Map<string, string>();
      for (const row of (rolesRes.data ?? []) as Array<{ user_id: string; role: string }>) {
        const prev = rolesByUser.get(row.user_id);
        if (!prev || (ROLE_ORDER[row.role] ?? 0) > (ROLE_ORDER[prev] ?? 0)) {
          rolesByUser.set(row.user_id, row.role);
        }
      }
      const buyerNameMap = new Map(
        (profilesBuyersRes.data ?? []).map((p) => [p.id, `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim() || "—"]),
      );
      const tipoMap = new Map((tiposRes.data ?? []).map((t) => [t.id, t.nombre]));
      const eventoMap = new Map((eventosRes.data ?? []).map((e) => [e.id, e.nombre]));
      const compraMap = new Map(compras.map((c) => [c.id, c]));

      // 5. enriquecer
      const enriched: ValidacionEnriquecida[] = validRows.map((v) => {
        const compra = v.compra_id ? compraMap.get(v.compra_id) : undefined;
        const md = v.metadata ?? {};
        return {
          ...v,
          scanner_nombre: v.scanner_id ? (scannerNameMap.get(v.scanner_id) ?? "—") : "—",
          scanner_rol:    v.scanner_id ? (rolesByUser.get(v.scanner_id) ?? "—") : "—",
          comprador_nombre: compra ? (buyerNameMap.get(compra.user_id) ?? "—") : "—",
          tipo_entrada:   compra?.tipo_entrada_id ? (tipoMap.get(compra.tipo_entrada_id) ?? "—") : "—",
          evento:         compra?.evento_id ? (eventoMap.get(compra.evento_id) ?? "—") : "—",
          fecha_visita:   compra?.fecha_visita ?? null,
          punto_acceso:   (md["punto_acceso"] as string | undefined) ?? null,
          device_type:    (md["device_type"]  as string | undefined) ?? null,
        };
      });

      setData(enriched);
    } catch (err) {
      console.error("Validaciones fatal:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // =========================================================================
  // Filtros + datos derivados
  // =========================================================================
  const validadoresUnicos = useMemo(() => {
    const set = new Map<string, string>();
    for (const v of data) {
      if (v.scanner_id) set.set(v.scanner_id, v.scanner_nombre);
    }
    return Array.from(set.entries());
  }, [data]);
  const tiposUnicos   = useMemo(() => [...new Set(data.map((v) => v.tipo_entrada).filter((t) => t !== "—"))], [data]);
  const eventosUnicos = useMemo(() => [...new Set(data.map((v) => v.evento).filter((e) => e !== "—"))], [data]);
  const puntosUnicos  = useMemo(() => [...new Set(data.map((v) => v.punto_acceso).filter(Boolean) as string[])], [data]);

  const filtered = useMemo(() => {
    return data.filter((v) => {
      if (fResultado !== "todos" && v.resultado !== fResultado) return false;
      if (fValidador !== "todos" && v.scanner_id !== fValidador) return false;
      if (fRol       !== "todos" && v.scanner_rol !== fRol) return false;
      if (fTipo      !== "todos" && v.tipo_entrada !== fTipo) return false;
      if (fEvento    !== "todos" && v.evento !== fEvento) return false;
      if (fPunto     !== "todos" && v.punto_acceso !== fPunto) return false;
      return true;
    });
  }, [data, fResultado, fValidador, fRol, fTipo, fEvento, fPunto]);

  // Stats sobre el rango (no sobre el filtered, para que los KPIs reflejen el día/rango)
  const stats = useMemo(() => {
    const exitosas = data.filter((v) => v.resultado === "valido").length;
    const yaUsado  = data.filter((v) => v.resultado === "ya_usado").length;
    const fallidas = data.length - exitosas;

    // Hora pico: hora con más validaciones exitosas
    const horaCount = new Array(24).fill(0);
    for (const v of data.filter((x) => x.resultado === "valido")) {
      const h = new Date(v.created_at).getHours();
      horaCount[h]++;
    }
    const maxHora = horaCount.indexOf(Math.max(...horaCount));
    const horaPico = horaCount[maxHora] > 0 ? `${String(maxHora).padStart(2, "0")}:00` : "—";

    // Validador con más escaneos
    const counts = new Map<string, { id: string; nombre: string; total: number }>();
    for (const v of data) {
      if (!v.scanner_id) continue;
      const e = counts.get(v.scanner_id) ?? { id: v.scanner_id, nombre: v.scanner_nombre, total: 0 };
      e.total++;
      counts.set(v.scanner_id, e);
    }
    const rankings = Array.from(counts.values()).sort((a, b) => b.total - a.total);
    const top = rankings[0] ?? null;

    return { total: data.length, exitosas, fallidas, yaUsado, horaPico, top, rankings };
  }, [data]);

  // Gráficos
  const escaneosPorHora = useMemo(() => {
    const arr = Array.from({ length: 24 }, (_, h) => ({ hora: `${String(h).padStart(2, "0")}h`, exitosas: 0, fallidas: 0 }));
    for (const v of data) {
      const h = new Date(v.created_at).getHours();
      if (v.resultado === "valido") arr[h].exitosas++;
      else arr[h].fallidas++;
    }
    // sólo mostramos las horas con actividad para evitar gráfico de 24 columnas vacías
    return arr.filter((row) => row.exitosas + row.fallidas > 0);
  }, [data]);

  const porRol = useMemo(() => {
    const map = new Map<string, { rol: string; total: number; exitosas: number; fallidas: number }>();
    for (const v of data) {
      const rol = v.scanner_rol || "—";
      const e = map.get(rol) ?? { rol, total: 0, exitosas: 0, fallidas: 0 };
      e.total++;
      if (v.resultado === "valido") e.exitosas++;
      else e.fallidas++;
      map.set(rol, e);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [data]);

  // Export rows
  const exportRows = useMemo(() => filtered.map((v) => ({
    fecha:        format(parseISO(v.created_at), "yyyy-MM-dd HH:mm:ss"),
    resultado:    statusLabel("validacion", v.resultado),
    motivo:       v.motivo ?? "",
    codigo:       v.uuid_code ?? "",
    comprador:    v.comprador_nombre,
    tipo_entrada: v.tipo_entrada,
    evento:       v.evento,
    fecha_visita: v.fecha_visita ?? "",
    validador:    v.scanner_nombre,
    rol:          v.scanner_rol,
    punto_acceso: v.punto_acceso ?? "",
    dispositivo:  v.device_type ?? "",
  })), [filtered]);

  const exportHeaders = {
    fecha: "Fecha y hora", resultado: "Resultado", motivo: "Motivo",
    codigo: "Código QR", comprador: "Comprador", tipo_entrada: "Tipo de entrada",
    evento: "Evento", fecha_visita: "Fecha de visita",
    validador: "Validador", rol: "Rol", punto_acceso: "Punto de acceso", dispositivo: "Dispositivo",
  };

  const limpiarFiltros = () => {
    setFResultado("todos"); setFValidador("todos"); setFRol("todos");
    setFTipo("todos"); setFEvento("todos"); setFPunto("todos");
  };

  // =========================================================================
  // Render
  // =========================================================================
  if (loading) return <LoadingState message="Cargando validaciones..." />;
  if (error)   return <ErrorState onRetry={fetchData} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-water-800">Validaciones QR</h1>
          <p className="mt-1 text-sm text-app-muted">Historial completo de escaneos · auditoría append-only.</p>
        </div>
        <div className="flex items-end gap-3">
          <DateRangeFilter value={range} onChange={setRange} />
          <Button variant="outline" size="sm" onClick={fetchData} className="gap-2 rounded-xl">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total"      value={stats.total}     icon={Activity}      variant="default" />
        <MetricCard label="Exitosas"   value={stats.exitosas}  icon={CheckCircle2}  variant="success" />
        <MetricCard label="Fallidas"   value={stats.fallidas}  icon={XCircle}       variant="danger" />
        <MetricCard label="Ya usado"   value={stats.yaUsado}   icon={AlertTriangle} variant="warning" />
      </section>
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Hora pico"  value={stats.horaPico}  icon={Clock}         variant="primary" />
        <MetricCard label="Validador top" value={stats.top?.nombre ?? "—"} icon={Users} variant="primary"
                    hint={stats.top ? `${stats.top.total} validaciones` : undefined} />
        <MetricCard
          label="Tasa de éxito"
          value={stats.total > 0 ? `${((stats.exitosas / stats.total) * 100).toFixed(1)}%` : "—"}
          icon={ShieldCheck} variant="success" />
        <MetricCard
          label="Filtradas"
          value={filtered.length}
          icon={History}
          variant="default"
          hint={filtered.length !== data.length ? "Filtros aplicados" : undefined}
        />
      </section>

      {/* Filtros */}
      <Card className="border-water-100">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div>
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-app-muted">Resultado</Label>
            <Select value={fResultado} onValueChange={setFResultado}>
              <SelectTrigger className="mt-1.5 h-9 w-[180px] rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {RESULTADOS.map((r) => (
                  <SelectItem key={r} value={r}>{statusLabel("validacion", r)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-app-muted">Validador</Label>
            <Select value={fValidador} onValueChange={setFValidador}>
              <SelectTrigger className="mt-1.5 h-9 w-[180px] rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {validadoresUnicos.map(([id, nombre]) => (
                  <SelectItem key={id} value={id}>{nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-app-muted">Rol</Label>
            <Select value={fRol} onValueChange={setFRol}>
              <SelectTrigger className="mt-1.5 h-9 w-[150px] rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="control_entradas">Control entradas</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-app-muted">Tipo entrada</Label>
            <Select value={fTipo} onValueChange={setFTipo}>
              <SelectTrigger className="mt-1.5 h-9 w-[180px] rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {tiposUnicos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-app-muted">Evento</Label>
            <Select value={fEvento} onValueChange={setFEvento}>
              <SelectTrigger className="mt-1.5 h-9 w-[180px] rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {eventosUnicos.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-app-muted">Punto acceso</Label>
            <Select value={fPunto} onValueChange={setFPunto}>
              <SelectTrigger className="mt-1.5 h-9 w-[180px] rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {puntosUnicos.length === 0 && <SelectItem value="vacio" disabled>Sin datos aún</SelectItem>}
                {puntosUnicos.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {(fResultado !== "todos" || fValidador !== "todos" || fRol !== "todos" || fTipo !== "todos" || fEvento !== "todos" || fPunto !== "todos") && (
            <Button variant="ghost" size="sm" onClick={limpiarFiltros}>Limpiar filtros</Button>
          )}
          <div className="ml-auto">
            <ExportButton
              filenamePrefix="validaciones-qr"
              title="Historial de validaciones QR"
              subtitle={`Período: ${range.from ?? "—"} a ${range.to ?? "—"}`}
              meta={{ "Total filas": String(filtered.length) }}
              csvHeaders={exportHeaders}
              rows={exportRows}
            />
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <section className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Escaneos por hora" description="Distribución horaria del rango seleccionado">
          {escaneosPorHora.length === 0 ? <EmptyState variant="inline" title="Sin actividad" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={escaneosPorHora}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--app-border))" />
                <XAxis dataKey="hora" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--app-border))" }} />
                <Legend />
                <Bar dataKey="exitosas" stackId="h" fill="hsl(160, 70%, 45%)" name="Exitosas" />
                <Bar dataKey="fallidas" stackId="h" fill="hsl(0, 80%, 60%)"   name="Fallidas" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Escaneos por rol" description="Total por rol del validador">
          {porRol.length === 0 ? <EmptyState variant="inline" title="Sin datos" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porRol}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--app-border))" />
                <XAxis dataKey="rol" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--app-border))" }} />
                <Legend />
                <Bar dataKey="exitosas" stackId="r" fill="hsl(160, 70%, 45%)" name="Exitosas" />
                <Bar dataKey="fallidas" stackId="r" fill="hsl(0, 80%, 60%)"   name="Fallidas" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Ranking de validadores" description="Top 10 con más escaneos">
          {stats.rankings.length === 0 ? <EmptyState variant="inline" title="Sin validadores" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.rankings.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--app-border))" />
                <XAxis type="number" className="text-xs" />
                <YAxis type="category" dataKey="nombre" className="text-xs" width={140} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--app-border))" }} />
                <Bar dataKey="total" fill="hsl(var(--water-600))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Exitosas vs fallidas" description="Resumen del rango">
          {data.length === 0 ? <EmptyState variant="inline" title="Sin datos" /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: "Total", exitosas: stats.exitosas, fallidas: stats.fallidas }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--app-border))" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--app-border))" }} />
                <Legend />
                <Bar dataKey="exitosas" fill="hsl(160, 70%, 45%)" name="Exitosas" />
                <Bar dataKey="fallidas" fill="hsl(0, 80%, 60%)"   name="Fallidas" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>

      {/* Tabla */}
      <Card className="overflow-hidden border-water-100">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState variant="inline"
                        title="No hay validaciones para mostrar"
                        description="Probá ajustar los filtros o ampliar el rango de fechas." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead />
                  <TableHead>Fecha</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead>Tipo / Evento</TableHead>
                  <TableHead>Validador</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Punto</TableHead>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>Código</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((v) => (
                  <ValidacionRow key={v.id} v={v} expanded={expanded === v.id} onToggle={() => setExpanded((p) => p === v.id ? null : v.id)} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-app-muted">
        Mostrando {filtered.length} de {data.length} validaciones en el período. Las validaciones nuevas se acumulan en tiempo real
        en <code className="rounded bg-water-50 px-1.5 py-0.5">qr_validaciones</code> (append-only).
      </p>
    </div>
  );
}

// =============================================================================
// Fila expandible
// =============================================================================
function ValidacionRow({ v, expanded, onToggle }: { v: ValidacionEnriquecida; expanded: boolean; onToggle: () => void }) {
  return (
    <>
      <TableRow className="cursor-pointer hover:bg-water-50/40" onClick={onToggle}>
        <TableCell className="w-8 text-app-muted">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </TableCell>
        <TableCell className="whitespace-nowrap text-sm">
          {format(parseISO(v.created_at), "dd/MM HH:mm:ss", { locale: es })}
        </TableCell>
        <TableCell><StatusBadge kind="validacion" value={v.resultado} /></TableCell>
        <TableCell className="font-medium text-sm">{v.comprador_nombre}</TableCell>
        <TableCell className="text-xs">
          <div>{v.tipo_entrada !== "—" ? v.tipo_entrada : "—"}</div>
          {v.evento !== "—" && <div className="text-app-muted">{v.evento}</div>}
        </TableCell>
        <TableCell className="text-sm">{v.scanner_nombre}</TableCell>
        <TableCell className="text-xs">
          {v.scanner_rol !== "—" ? (
            <span className="rounded-full bg-water-100 px-2 py-0.5 text-water-700">{v.scanner_rol}</span>
          ) : "—"}
        </TableCell>
        <TableCell className="text-xs text-app-muted">{v.punto_acceso ?? "—"}</TableCell>
        <TableCell className="text-xs text-app-muted">{v.device_type ?? "—"}</TableCell>
        <TableCell>
          {v.uuid_code ? (
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{v.uuid_code.slice(0, 8)}…</code>
          ) : <span className="text-xs text-app-muted">—</span>}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={10} className="bg-water-50/40 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailRow label="Motivo">{v.motivo ?? "—"}</DetailRow>
              <DetailRow label="QR ID">{v.qr_id ?? "—"}</DetailRow>
              <DetailRow label="Compra ID">{v.compra_id ?? "—"}</DetailRow>
              <DetailRow label="Código completo">
                {v.uuid_code ? <code className="text-xs">{v.uuid_code}</code> : "—"}
              </DetailRow>
              <DetailRow label="Fecha de visita">{v.fecha_visita ?? "—"}</DetailRow>
              <DetailRow label="Metadata">
                <pre className="overflow-x-auto rounded bg-white p-2 text-[10px] text-app-muted">
                  {JSON.stringify(v.metadata ?? {}, null, 2)}
                </pre>
              </DetailRow>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-app-muted">{label}</p>
      <div className="mt-0.5 text-sm text-water-800">{children}</div>
    </div>
  );
}
