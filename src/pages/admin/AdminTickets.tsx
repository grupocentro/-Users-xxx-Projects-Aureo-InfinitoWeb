import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, ScanLine, CheckCircle, Clock, Ticket,
  History, RefreshCw, AlertTriangle, XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ExportButton } from "@/components/admin/ExportButton";

interface ScanRecord {
  id: string;
  uuid_code: string;
  usado: boolean;
  usado_at: string | null;
  usado_por: string | null;
  compra_id: string;
  tipo: "parque" | "evento";
  tipo_nombre: string;
  scanner_nombre: string;
  cliente_nombre: string;
}

// =============================================================================
// Tipos para qr_validaciones (tabla creada en migración 20260518230000).
// types.ts autogenerado no la conoce todavía → tipo manual + casts en queries.
// =============================================================================
type ValidacionResultado =
  | "valido"
  | "ya_usado"
  | "no_encontrado"
  | "compra_no_aprobada"
  | "fecha_invalida"
  | "error";

interface ValidacionRow {
  id: string;
  created_at: string;
  resultado: ValidacionResultado | string;
  motivo: string | null;
  uuid_code: string | null;
  qr_id: string | null;
  compra_id: string | null;
  scanner_id: string | null;
  metadata: Record<string, unknown> | null;
  scanner_nombre: string;
}

const RESULTADO_LABEL: Record<string, string> = {
  valido: "Válido",
  ya_usado: "Ya usado",
  no_encontrado: "No encontrado",
  compra_no_aprobada: "Compra no aprobada",
  fecha_invalida: "Fecha inválida",
  error: "Error",
};

export default function AdminTickets() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [stats, setStats] = useState({
    totalParque: 0,
    totalEventos: 0,
    escaneadosParque: 0,
    escaneadosEventos: 0,
    pendientesParque: 0,
    pendientesEventos: 0,
  });

  // Auditoría QR (tab "Validaciones")
  const [validaciones, setValidaciones] = useState<ValidacionRow[]>([]);
  const [validacionesLoading, setValidacionesLoading] = useState(true);
  const [validacionesError, setValidacionesError] = useState(false);

  // -------------------------------------------------------------------------
  // Carga las últimas 100 validaciones de qr_validaciones.
  // RLS: solo admin / control_entradas pueden leer (definido en migración).
  // -------------------------------------------------------------------------
  const fetchValidaciones = useCallback(async () => {
    setValidacionesLoading(true);
    setValidacionesError(false);
    try {
      // qr_validaciones no está en types.ts → cast a never para bypass.
      const { data, error } = await supabase
        .from("qr_validaciones" as never)
        .select("id, created_at, resultado, motivo, uuid_code, qr_id, compra_id, scanner_id, metadata")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        console.error("Error al cargar qr_validaciones:", error);
        setValidacionesError(true);
        return;
      }

      const rows = (data ?? []) as unknown as Omit<ValidacionRow, "scanner_nombre">[];

      // Enriquecer scanner con nombre desde profiles.
      const scannerIds = [...new Set(rows.map((r) => r.scanner_id).filter(Boolean))] as string[];
      let profileMap = new Map<string, string>();
      if (scannerIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, nombre, apellido")
          .in("id", scannerIds);
        profileMap = new Map(
          (profs ?? []).map((p) => [p.id, `${p.nombre ?? ""} ${p.apellido ?? ""}`.trim() || "—"]),
        );
      }

      const enriched: ValidacionRow[] = rows.map((r) => ({
        ...r,
        scanner_nombre: r.scanner_id ? profileMap.get(r.scanner_id) || "—" : "—",
      }));
      setValidaciones(enriched);
    } catch (err) {
      console.error("Error inesperado validaciones:", err);
      setValidacionesError(true);
    } finally {
      setValidacionesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchValidaciones();
  }, [fetchValidaciones]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch all QR codes with their purchase info
    const { data: qrData } = await supabase
      .from("codigos_qr")
      .select("id, uuid_code, usado, usado_at, usado_por, compra_id")
      .order("usado_at", { ascending: false, nullsFirst: false });

    if (!qrData || qrData.length === 0) {
      setLoading(false);
      return;
    }

    // Get unique compra_ids
    const compraIds = [...new Set(qrData.map((q) => q.compra_id))];
    const { data: compras } = await supabase
      .from("compras")
      .select("id, tipo_entrada_id, evento_id, user_id")
      .in("id", compraIds);

    if (!compras) {
      setLoading(false);
      return;
    }

    // Get related data
    const userIds = [...new Set([
      ...compras.map((c) => c.user_id),
      ...qrData.map((q) => q.usado_por).filter(Boolean),
    ])] as string[];
    
    const tipoIds = [...new Set(compras.map((c) => c.tipo_entrada_id).filter(Boolean))] as string[];
    const eventoIds = [...new Set(compras.map((c) => c.evento_id).filter(Boolean))] as string[];

    const [profilesRes, tiposRes, eventosRes] = await Promise.all([
      userIds.length > 0
        ? supabase.from("profiles").select("id, nombre, apellido").in("id", userIds)
        : Promise.resolve({ data: [] }),
      tipoIds.length > 0
        ? supabase.from("tipos_entrada").select("id, nombre").in("id", tipoIds)
        : Promise.resolve({ data: [] }),
      eventoIds.length > 0
        ? supabase.from("eventos").select("id, nombre").in("id", eventoIds)
        : Promise.resolve({ data: [] }),
    ]);

    const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, `${p.nombre} ${p.apellido}`]));
    const tipoMap = new Map((tiposRes.data ?? []).map((t) => [t.id, t.nombre]));
    const eventoMap = new Map((eventosRes.data ?? []).map((e) => [e.id, e.nombre]));
    const compraMap = new Map(compras.map((c) => [c.id, c]));

    const enriched: ScanRecord[] = qrData.map((qr) => {
      const compra = compraMap.get(qr.compra_id);
      const isEvento = !!compra?.evento_id;
      return {
        id: qr.id,
        uuid_code: qr.uuid_code,
        usado: qr.usado,
        usado_at: qr.usado_at,
        usado_por: qr.usado_por,
        compra_id: qr.compra_id,
        tipo: isEvento ? "evento" : "parque",
        tipo_nombre: isEvento
          ? eventoMap.get(compra!.evento_id!) || "Evento"
          : tipoMap.get(compra?.tipo_entrada_id ?? "") || "Entrada",
        scanner_nombre: qr.usado_por ? profileMap.get(qr.usado_por) || "—" : "—",
        cliente_nombre: compra ? profileMap.get(compra.user_id) || "—" : "—",
      };
    });

    setRecords(enriched);

    // Calculate stats
    const parque = enriched.filter((r) => r.tipo === "parque");
    const eventos = enriched.filter((r) => r.tipo === "evento");
    setStats({
      totalParque: parque.length,
      totalEventos: eventos.length,
      escaneadosParque: parque.filter((r) => r.usado).length,
      escaneadosEventos: eventos.filter((r) => r.usado).length,
      pendientesParque: parque.filter((r) => !r.usado).length,
      pendientesEventos: eventos.filter((r) => !r.usado).length,
    });

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderTable = (data: ScanRecord[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Estado</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Código</TableHead>
          <TableHead>Escaneado por</TableHead>
          <TableHead>Hora escaneo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
              No hay registros
            </TableCell>
          </TableRow>
        ) : (
          data.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                {r.usado ? (
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle className="w-3 h-3 mr-1" /> Escaneado
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    <Clock className="w-3 h-3 mr-1" /> Pendiente
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <span className="text-sm font-medium">{r.tipo_nombre}</span>
              </TableCell>
              <TableCell className="font-medium">{r.cliente_nombre}</TableCell>
              <TableCell>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  {r.uuid_code.slice(0, 8)}…
                </code>
              </TableCell>
              <TableCell>{r.scanner_nombre}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {r.usado_at
                  ? format(new Date(r.usado_at), "dd/MM/yy HH:mm", { locale: es })
                  : "—"}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const parqueRecords = records.filter((r) => r.tipo === "parque");
  const eventoRecords = records.filter((r) => r.tipo === "evento");

  // ---------------------------------------------------------------------------
  // Badge por resultado de validación (consistente con la convención existente
  // de colores en este archivo: green / yellow / destructive sin tokens nuevos).
  // ---------------------------------------------------------------------------
  const resultadoBadge = (resultado: string) => {
    const label = RESULTADO_LABEL[resultado] ?? resultado;
    switch (resultado) {
      case "valido":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200 gap-1">
            <CheckCircle className="w-3 h-3" /> {label}
          </Badge>
        );
      case "ya_usado":
        return (
          <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-200 gap-1">
            <AlertTriangle className="w-3 h-3" /> {label}
          </Badge>
        );
      case "fecha_invalida":
        return (
          <Badge className="bg-yellow-50 text-yellow-700 border border-yellow-200 gap-1">
            <Clock className="w-3 h-3" /> {label}
          </Badge>
        );
      case "no_encontrado":
      case "compra_no_aprobada":
      case "error":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" /> {label}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{label}</Badge>;
    }
  };

  // ---------------------------------------------------------------------------
  // Tabla de auditoría QR (solo lectura).
  // ---------------------------------------------------------------------------
  const renderValidaciones = () => {
    if (validacionesLoading) {
      return (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (validacionesError) {
      return (
        <div className="px-6 py-8 text-center text-sm text-muted-foreground">
          <XCircle className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p>No se pudieron cargar las validaciones.</p>
          <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={fetchValidaciones}>
            <RefreshCw className="w-3.5 h-3.5" /> Reintentar
          </Button>
        </div>
      );
    }

    if (validaciones.length === 0) {
      return (
        <div className="px-6 py-10 text-center text-sm text-muted-foreground">
          <History className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p>Todavía no hay validaciones QR registradas.</p>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Resultado</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Scanner</TableHead>
            <TableHead>Código</TableHead>
            <TableHead>Compra</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {validaciones.map((v) => (
            <TableRow key={v.id}>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {format(new Date(v.created_at), "dd/MM/yy HH:mm:ss", { locale: es })}
              </TableCell>
              <TableCell>{resultadoBadge(v.resultado)}</TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-[260px]">
                {v.motivo || "—"}
              </TableCell>
              <TableCell className="text-sm">{v.scanner_nombre}</TableCell>
              <TableCell>
                {v.uuid_code ? (
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {v.uuid_code.slice(0, 8)}…
                  </code>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                {v.compra_id ? (
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {v.compra_id.slice(0, 8)}…
                  </code>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">🎟️ Tickets & Escaneos</h1>
        <ExportButton
          filenamePrefix="tickets-qr"
          title="Tickets QR"
          meta={{ Total: String(records.length) }}
          csvHeaders={{
            tipo: "Tipo", tipo_nombre: "Detalle", cliente: "Cliente",
            codigo: "Código", estado: "Estado", scanner: "Validador", hora: "Hora escaneo",
          }}
          rows={records.map((r) => ({
            tipo:        r.tipo === "parque" ? "Parque" : "Evento",
            tipo_nombre: r.tipo_nombre,
            cliente:     r.cliente_nombre,
            codigo:      r.uuid_code,
            estado:      r.usado ? "Escaneado" : "Pendiente",
            scanner:     r.scanner_nombre,
            hora:        r.usado_at ? format(new Date(r.usado_at), "yyyy-MM-dd HH:mm") : "—",
          }))}
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Escaneados Parque</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.escaneadosParque}</div>
            <p className="text-xs text-muted-foreground">de {stats.totalParque} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pendientes Parque</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendientesParque}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Escaneados Eventos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.escaneadosEventos}</div>
            <p className="text-xs text-muted-foreground">de {stats.totalEventos} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pendientes Eventos</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendientesEventos}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for parque vs eventos */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="todos" className="w-full">
            <div className="px-4 pt-4 flex flex-wrap items-center justify-between gap-3">
              <TabsList>
                <TabsTrigger value="todos">
                  <ScanLine className="w-4 h-4 mr-1.5" /> Todos ({records.length})
                </TabsTrigger>
                <TabsTrigger value="parque">
                  <Ticket className="w-4 h-4 mr-1.5" /> Parque ({parqueRecords.length})
                </TabsTrigger>
                <TabsTrigger value="eventos">
                  🎉 Eventos ({eventoRecords.length})
                </TabsTrigger>
                <TabsTrigger value="validaciones">
                  <History className="w-4 h-4 mr-1.5" /> Validaciones ({validaciones.length})
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="todos" className="mt-0">
              {renderTable(records)}
            </TabsContent>
            <TabsContent value="parque" className="mt-0">
              {renderTable(parqueRecords)}
            </TabsContent>
            <TabsContent value="eventos" className="mt-0">
              {renderTable(eventoRecords)}
            </TabsContent>
            <TabsContent value="validaciones" className="mt-0">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <p className="text-xs text-muted-foreground">
                  Auditoría append-only · últimas {validaciones.length} de hasta 100
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={fetchValidaciones}
                  disabled={validacionesLoading}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${validacionesLoading ? "animate-spin" : ""}`} />
                  Actualizar
                </Button>
              </div>
              {renderValidaciones()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
