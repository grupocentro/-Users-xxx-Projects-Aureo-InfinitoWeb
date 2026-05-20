import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, ShoppingCart, TrendingUp, Users, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ExportButton } from "@/components/admin/ExportButton";
import { statusLabel } from "@/lib/status-labels";

type Compra = {
  id: string;
  cantidad: number;
  total: number;
  estado_pago: string;
  created_at: string;
  user_id: string;
  tipo_entrada_id: string | null;
  evento_id: string | null;
  mp_payment_id: string | null;
  profile?: { nombre: string; apellido: string; email: string } | null;
  tipo_entrada?: { nombre: string; emoji: string | null } | null;
};

export default function AdminVentas() {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");

  const fetchCompras = async () => {
    setLoading(true);
    let query = supabase
      .from("compras")
      .select("*, tipos_entrada:tipo_entrada_id(nombre, emoji)")
      .order("created_at", { ascending: false });

    if (filtroEstado !== "todos") {
      query = query.eq("estado_pago", filtroEstado);
    }
    if (fechaDesde) {
      query = query.gte("created_at", fechaDesde + "T00:00:00");
    }
    if (fechaHasta) {
      query = query.lte("created_at", fechaHasta + "T23:59:59");
    }

    const { data } = await query;
    if (data) {
      // Fetch profiles for unique user_ids
      const userIds = [...new Set(data.map((c: any) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nombre, apellido, email")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      setCompras(
        data.map((c: any) => ({
          ...c,
          profile: profileMap.get(c.user_id) || null,
          tipo_entrada: c.tipos_entrada || null,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCompras();
  }, [filtroEstado, fechaDesde, fechaHasta]);

  const stats = useMemo(() => {
    const aprobadas = compras.filter((c) => c.estado_pago === "aprobado");
    const pendientes = compras.filter((c) => c.estado_pago === "pendiente");
    return {
      totalIngresos: aprobadas.reduce((sum, c) => sum + c.total, 0),
      totalVentas: aprobadas.length,
      totalEntradas: aprobadas.reduce((sum, c) => sum + c.cantidad, 0),
      pendientes: pendientes.length,
    };
  }, [compras]);

  const exportRows = useMemo(() => compras.map((c) => ({
    fecha:    format(new Date(c.created_at), "yyyy-MM-dd HH:mm:ss"),
    cliente:  c.profile ? `${c.profile.nombre} ${c.profile.apellido}` : c.user_id.slice(0, 8),
    email:    c.profile?.email ?? "—",
    entrada:  c.tipo_entrada?.nombre ?? "—",
    cantidad: c.cantidad,
    total:    Math.round(c.total),
    estado:   statusLabel("compra", c.estado_pago),
    mp_id:    c.mp_payment_id ?? "—",
  })), [compras]);

  const exportHeaders = {
    fecha: "Fecha", cliente: "Cliente", email: "Email",
    entrada: "Entrada", cantidad: "Cant.", total: "Total ARS",
    estado: "Estado", mp_id: "MP ID",
  };

  const estadoBadge = (estado: string) => {
    switch (estado) {
      case "aprobado":
        return <Badge className="bg-accent text-accent-foreground">Aprobado</Badge>;
      case "pendiente":
        return <Badge variant="outline">Pendiente</Badge>;
      case "rechazado":
        return <Badge variant="destructive">Rechazado</Badge>;
      case "payment_mismatch":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300 gap-1">
            <AlertTriangle className="w-3 h-3" /> En revisión
          </Badge>
        );
      default:
        return <Badge variant="secondary">{estado}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Ventas</h1>
        <ExportButton
          filenamePrefix="ventas"
          title="Ventas"
          subtitle={(fechaDesde || fechaHasta) ? `Período: ${fechaDesde || "—"} a ${fechaHasta || "—"}` : undefined}
          meta={{ Total: String(compras.length), Estado: filtroEstado === "todos" ? "Todos" : filtroEstado }}
          csvHeaders={exportHeaders}
          rows={exportRows}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${stats.totalIngresos.toLocaleString("es-AR")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ventas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalVentas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Entradas vendidas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalEntradas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.pendientes}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <Label className="text-xs">Estado</Label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="aprobado">Aprobado</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="rechazado">Rechazado</SelectItem>
                  <SelectItem value="payment_mismatch">En revisión (diferencia de monto)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="w-[160px]" />
            </div>
            <div>
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="w-[160px]" />
            </div>
            {(fechaDesde || fechaHasta || filtroEstado !== "todos") && (
              <Button variant="ghost" size="sm" onClick={() => { setFiltroEstado("todos"); setFechaDesde(""); setFechaHasta(""); }}>
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead className="text-center">Cant.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>MP ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : compras.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay compras registradas
                  </TableCell>
                </TableRow>
              ) : (
                compras.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">
                      {format(new Date(c.created_at), "dd/MM/yy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell>
                      {c.profile ? (
                        <div>
                          <p className="font-medium text-sm">{c.profile.nombre} {c.profile.apellido}</p>
                          <p className="text-xs text-muted-foreground">{c.profile.email}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">{c.user_id.slice(0, 8)}…</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {c.tipo_entrada ? (
                        <span className="text-sm">{c.tipo_entrada.emoji || "🎟️"} {c.tipo_entrada.nombre}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{c.cantidad}</TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      ${c.total.toLocaleString("es-AR")}
                    </TableCell>
                    <TableCell>
                      {estadoBadge(c.estado_pago)}
                      {c.estado_pago === "payment_mismatch" && (
                        <p className="text-xs text-muted-foreground mt-1 max-w-[180px]">
                          Diferencia entre monto pagado y monto esperado. No se emitieron QR.
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.mp_payment_id || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
