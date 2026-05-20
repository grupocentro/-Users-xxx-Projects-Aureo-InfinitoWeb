import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, Droplets, Ticket, DollarSign, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DaySales {
  dia: string;
  total: number;
}

interface RecentPurchase {
  id: string;
  total: number;
  estado_pago: string;
  created_at: string;
  cantidad: number;
  cliente_nombre: string;
  tipo_entrada: string;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [ventasTotales, setVentasTotales] = useState(0);
  const [entradasHoy, setEntradasHoy] = useState(0);
  const [eventosActivos, setEventosActivos] = useState(0);
  const [atraccionesActivas, setAtraccionesActivas] = useState(0);
  const [chartData, setChartData] = useState<DaySales[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<RecentPurchase[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const today = startOfDay(new Date()).toISOString();
      const sevenDaysAgo = startOfDay(subDays(new Date(), 6)).toISOString();

      const [ventasRes, qrRes, eventosRes, atraccionesRes, chartRes, recentRes] = await Promise.all([
        // 1. Ventas totales aprobadas
        supabase.from("compras").select("total").eq("estado_pago", "aprobado"),
        // 2. QR usados hoy
        supabase.from("codigos_qr").select("id", { count: "exact", head: true }).eq("usado", true).gte("usado_at", today),
        // 3. Eventos activos
        supabase.from("eventos").select("id", { count: "exact", head: true }).eq("estado", "activo"),
        // 4. Atracciones activas
        supabase.from("atracciones").select("id", { count: "exact", head: true }).eq("estado", "activo"),
        // 5. Ventas últimos 7 días para gráfico
        supabase.from("compras").select("total, created_at").eq("estado_pago", "aprobado").gte("created_at", sevenDaysAgo),
        // 6. Últimas 10 compras
        supabase.from("compras").select("id, total, estado_pago, created_at, cantidad, user_id, tipo_entrada_id").order("created_at", { ascending: false }).limit(10),
      ]);

      // Ventas totales
      if (ventasRes.data) {
        setVentasTotales(ventasRes.data.reduce((sum, c) => sum + Number(c.total), 0));
      }

      // Entradas hoy
      setEntradasHoy(qrRes.count ?? 0);

      // Eventos y atracciones
      setEventosActivos(eventosRes.count ?? 0);
      setAtraccionesActivas(atraccionesRes.count ?? 0);

      // Chart data - agrupar por día
      if (chartRes.data) {
        const grouped: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
          const day = format(subDays(new Date(), i), "yyyy-MM-dd");
          grouped[day] = 0;
        }
        chartRes.data.forEach((c) => {
          const day = format(new Date(c.created_at), "yyyy-MM-dd");
          if (grouped[day] !== undefined) {
            grouped[day] += Number(c.total);
          }
        });
        setChartData(
          Object.entries(grouped).map(([dia, total]) => ({
            dia: format(new Date(dia), "EEE dd", { locale: es }),
            total,
          }))
        );
      }

      // Recent purchases - enrich with profile and tipo_entrada names
      if (recentRes.data && recentRes.data.length > 0) {
        const userIds = [...new Set(recentRes.data.map((c) => c.user_id))];
        const tipoIds = [...new Set(recentRes.data.map((c) => c.tipo_entrada_id).filter(Boolean))] as string[];

        const [profilesRes, tiposRes] = await Promise.all([
          supabase.from("profiles").select("id, nombre, apellido").in("id", userIds),
          tipoIds.length > 0
            ? supabase.from("tipos_entrada").select("id, nombre").in("id", tipoIds)
            : Promise.resolve({ data: [] }),
        ]);

        const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, `${p.nombre} ${p.apellido}`]));
        const tipoMap = new Map((tiposRes.data ?? []).map((t) => [t.id, t.nombre]));

        setRecentPurchases(
          recentRes.data.map((c) => ({
            id: c.id,
            total: Number(c.total),
            estado_pago: c.estado_pago,
            created_at: c.created_at,
            cantidad: c.cantidad,
            cliente_nombre: profileMap.get(c.user_id) || "—",
            tipo_entrada: c.tipo_entrada_id ? tipoMap.get(c.tipo_entrada_id) || "—" : "—",
          }))
        );
      }

      setLoading(false);
    };

    fetchAll();
  }, []);

  const estadoBadge = (estado: string) => {
    switch (estado) {
      case "aprobado":
        return <Badge className="bg-primary text-primary-foreground">Aprobado</Badge>;
      case "pendiente":
        return <Badge variant="secondary">Pendiente</Badge>;
      default:
        return <Badge variant="destructive">{estado}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${ventasTotales.toLocaleString("es-AR")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Entradas Hoy</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{entradasHoy}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Eventos Activos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eventosActivos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Atracciones</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{atraccionesActivas}</div>
          </CardContent>
        </Card>
      </div>

      {/* Sales chart */}
      <Card>
        <CardHeader>
          <CardTitle>Ventas últimos 7 días</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="dia" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  formatter={(value: number) => [`$${value.toLocaleString("es-AR")}`, "Ventas"]}
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad reciente</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPurchases.length === 0 ? (
            <p className="text-muted-foreground text-sm">No hay compras registradas aún.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Cant.</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPurchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.cliente_nombre}</TableCell>
                    <TableCell>{p.tipo_entrada}</TableCell>
                    <TableCell>{p.cantidad}</TableCell>
                    <TableCell>${p.total.toLocaleString("es-AR")}</TableCell>
                    <TableCell>{estadoBadge(p.estado_pago)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(p.created_at), "dd/MM HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
