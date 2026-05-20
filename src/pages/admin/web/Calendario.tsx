import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Pencil, Trash2, CalendarDays, Loader2,
} from "lucide-react";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { es } from "date-fns/locale";

import { LoadingState } from "@/components/admin/LoadingState";
import { ErrorState } from "@/components/admin/ErrorState";
import { EmptyState } from "@/components/admin/EmptyState";

// =============================================================================
// Tipos — tabla `calendario` creada en migración 20260520120000.
// =============================================================================
interface CalendarioRow {
  id: string;
  fecha: string; // YYYY-MM-DD
  etiqueta: string | null;
  color_hex: string | null;
  precio_modificador: number | string | null;
  nota: string | null;
  created_at: string;
  updated_at: string;
}

// Colores predefinidos para elegir desde el form (siempre se puede tipear hex libre).
const COLORES_PRESET: { label: string; hex: string }[] = [
  { label: "Aqua",    hex: "#00b4d8" },
  { label: "Navy",    hex: "#023e8a" },
  { label: "Verde",   hex: "#10b981" },
  { label: "Ámbar",   hex: "#f59e0b" },
  { label: "Rosa",    hex: "#ec4899" },
  { label: "Violeta", hex: "#8b5cf6" },
];

const emptyForm = {
  fecha: format(new Date(), "yyyy-MM-dd"),
  etiqueta: "",
  color_hex: "#00b4d8",
  precio_modificador: "" as string | number,
  nota: "",
};

function getEstadoDia(fecha: string): "pasado" | "hoy" | "futuro" {
  const f = parseISO(fecha + "T00:00:00");
  const hoy = startOfDay(new Date());
  if (isBefore(f, hoy)) return "pasado";
  if (f.getTime() === hoy.getTime()) return "hoy";
  return "futuro";
}

export default function Calendario() {
  const { toast } = useToast();
  const [rows, setRows] = useState<CalendarioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filtro, setFiltro] = useState<"todos" | "futuro" | "pasado">("futuro");

  const fetchRows = async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase
      .from("calendario" as never)
      .select("*")
      .order("fecha", { ascending: true });
    if (err) {
      console.error("calendario error:", err);
      setError(true);
    } else {
      setRows((data ?? []) as unknown as CalendarioRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, []);

  const filtered = useMemo(() => {
    if (filtro === "todos") return rows;
    return rows.filter((r) => getEstadoDia(r.fecha) === filtro || (filtro === "futuro" && getEstadoDia(r.fecha) === "hoy"));
  }, [rows, filtro]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, fecha: format(new Date(), "yyyy-MM-dd") });
    setDialogOpen(true);
  };

  const openEdit = (r: CalendarioRow) => {
    setEditingId(r.id);
    setForm({
      fecha: r.fecha,
      etiqueta: r.etiqueta ?? "",
      color_hex: r.color_hex ?? "#00b4d8",
      precio_modificador: r.precio_modificador === null ? "" : String(r.precio_modificador),
      nota: r.nota ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.fecha) {
      toast({ title: "Error", description: "La fecha es obligatoria.", variant: "destructive" });
      return;
    }
    // Validar color_hex si está presente
    const colorTrim = form.color_hex.trim();
    if (colorTrim && !/^#[0-9a-f]{6}$/i.test(colorTrim)) {
      toast({ title: "Error", description: "Color hex inválido. Formato: #RRGGBB", variant: "destructive" });
      return;
    }
    // Validar precio modificador si está presente
    let precio_modificador: number | null = null;
    if (form.precio_modificador !== "" && form.precio_modificador !== null) {
      const n = Number(form.precio_modificador);
      if (Number.isNaN(n)) {
        toast({ title: "Error", description: "El modificador de precio debe ser un número.", variant: "destructive" });
        return;
      }
      precio_modificador = n;
    }

    setSaving(true);
    const payload = {
      fecha: form.fecha,
      etiqueta: form.etiqueta.trim() || null,
      color_hex: colorTrim || null,
      precio_modificador,
      nota: form.nota.trim() || null,
    };
    const op = editingId
      ? supabase.from("calendario" as never).update(payload).eq("id", editingId)
      : supabase.from("calendario" as never).insert(payload);
    const { error: err } = await op;
    if (err) {
      const msg = err.code === "23505" ? "Ya existe una entrada para esa fecha." : err.message;
      toast({ title: "Error al guardar", description: msg, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Día actualizado ✅" : "Día creado ✅" });
      setDialogOpen(false);
      fetchRows();
    }
    setSaving(false);
  };

  const handleDelete = async (r: CalendarioRow) => {
    if (!confirm(`¿Eliminar el día ${r.fecha}?`)) return;
    const { error: err } = await supabase.from("calendario" as never).delete().eq("id", r.id);
    if (err) {
      toast({ title: "Error al eliminar", description: err.message, variant: "destructive" });
    } else {
      toast({ title: "Día eliminado" });
      fetchRows();
    }
  };

  if (loading) return <LoadingState message="Cargando calendario..." />;
  if (error)   return <ErrorState onRetry={fetchRows} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-water-800">Calendario</h1>
          <p className="mt-1 text-sm text-app-muted">
            Días con etiquetas, colores y modificadores de precio. Una fila por fecha.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 rounded-xl bg-gradient-to-r from-water-500 to-water-700 text-white">
          <Plus className="h-4 w-4" /> Agregar día
        </Button>
      </div>

      <Card className="border-water-100">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div>
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-app-muted">Mostrar</Label>
            <Select value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)}>
              <SelectTrigger className="mt-1.5 h-9 w-[200px] rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="futuro">Hoy y futuros</SelectItem>
                <SelectItem value="pasado">Pasados</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="ml-auto text-xs text-app-muted">
            Total: {rows.length} días · Mostrando {filtered.length}
          </p>
        </CardContent>
      </Card>

      <Card className="border-water-100">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              variant="inline"
              icon={CalendarDays}
              title={rows.length === 0 ? "Todavía no hay días registrados" : "Sin resultados con ese filtro"}
              description={rows.length === 0 ? "Creá el primer día especial con el botón superior." : "Probá cambiar el filtro."}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Fecha</TableHead>
                  <TableHead>Etiqueta</TableHead>
                  <TableHead className="w-24 text-center">Color</TableHead>
                  <TableHead className="w-32 text-right">Modif. precio</TableHead>
                  <TableHead className="hidden md:table-cell">Nota</TableHead>
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const estado = getEstadoDia(r.fecha);
                  return (
                    <TableRow key={r.id} className={estado === "pasado" ? "opacity-60" : ""}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-water-800">
                            {format(parseISO(r.fecha + "T00:00:00"), "dd/MM/yyyy")}
                          </p>
                          <p className="text-[10px] uppercase tracking-wider text-app-muted">
                            {format(parseISO(r.fecha + "T00:00:00"), "EEEE", { locale: es })}
                            {estado === "hoy" && <span className="ml-1 text-water-600">· hoy</span>}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{r.etiqueta ?? "—"}</TableCell>
                      <TableCell className="text-center">
                        {r.color_hex ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="h-4 w-4 rounded-full border border-app-border" style={{ backgroundColor: r.color_hex }} />
                            <code className="text-[10px] text-app-muted">{r.color_hex}</code>
                          </div>
                        ) : <span className="text-xs text-app-muted">—</span>}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {r.precio_modificador !== null && r.precio_modificador !== undefined
                          ? Number(r.precio_modificador).toLocaleString("es-AR")
                          : "—"}
                      </TableCell>
                      <TableCell className="hidden max-w-md truncate text-xs text-app-muted md:table-cell">
                        {r.nota ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => handleDelete(r)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar día" : "Nuevo día especial"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Fecha *</Label>
              <Input
                type="date"
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className="mt-1.5"
                disabled={!!editingId}
              />
              {editingId && <p className="mt-1 text-[11px] text-app-muted">La fecha no se puede cambiar (es UNIQUE).</p>}
            </div>
            <div>
              <Label>Etiqueta</Label>
              <Input
                value={form.etiqueta}
                onChange={(e) => setForm({ ...form, etiqueta: e.target.value })}
                className="mt-1.5"
                placeholder="Ej: Año Nuevo, Aniversario"
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {COLORES_PRESET.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setForm({ ...form, color_hex: c.hex })}
                    title={c.label}
                    aria-label={c.label}
                    className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${form.color_hex === c.hex ? "border-water-700 ring-2 ring-water-300" : "border-white"}`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
                <Input
                  value={form.color_hex}
                  onChange={(e) => setForm({ ...form, color_hex: e.target.value })}
                  className="ml-2 h-8 w-32 font-mono text-xs"
                  placeholder="#000000"
                />
              </div>
            </div>
            <div>
              <Label>Modificador de precio</Label>
              <Input
                type="number"
                step="any"
                value={form.precio_modificador}
                onChange={(e) => setForm({ ...form, precio_modificador: e.target.value })}
                className="mt-1.5"
                placeholder="Opcional — interpretado por el frontend (% o ARS)"
              />
              <p className="mt-1 text-[11px] text-app-muted">
                Valor libre. Se aplicará cuando se conecte al flujo de compra (fuera de scope de esta fase).
              </p>
            </div>
            <div>
              <Label>Nota</Label>
              <Textarea
                value={form.nota}
                onChange={(e) => setForm({ ...form, nota: e.target.value })}
                rows={3}
                className="mt-1.5"
                placeholder="Observación interna (opcional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Guardar cambios" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
