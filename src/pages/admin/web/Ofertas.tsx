import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Plus, Pencil, Trash2, Tag, Loader2, Upload, ImageIcon,
} from "lucide-react";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { es } from "date-fns/locale";

import { LoadingState } from "@/components/admin/LoadingState";
import { ErrorState } from "@/components/admin/ErrorState";
import { EmptyState } from "@/components/admin/EmptyState";

// =============================================================================
// Tipos — tabla `ofertas` creada en migración 20260520120000.
// =============================================================================
type EstadoOferta = "borrador" | "activa" | "expirada" | "archivada";

interface OfertaRow {
  id: string;
  titulo: string;
  descripcion: string | null;
  descuento_pct: number | string | null;
  vigencia_desde: string | null;
  vigencia_hasta: string | null;
  imagen_url: string | null;
  estado: EstadoOferta;
  orden: number;
  created_at: string;
  updated_at: string;
}

const ESTADO_LABEL: Record<EstadoOferta, string> = {
  borrador:   "Borrador",
  activa:     "Activa",
  expirada:   "Expirada",
  archivada:  "Archivada",
};

const ESTADO_BADGE: Record<EstadoOferta, string> = {
  borrador:  "bg-app-bg text-app-muted border-app-border",
  activa:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  expirada:  "bg-amber-50 text-amber-700 border-amber-200",
  archivada: "bg-rose-50 text-rose-700 border-rose-200",
};

type Vigencia = "futura" | "vigente" | "vencida" | "sin_vigencia";
const VIGENCIA_LABEL: Record<Vigencia, string> = {
  vigente:        "Vigente",
  futura:         "Por iniciar",
  vencida:        "Vencida",
  sin_vigencia:   "Sin fechas",
};
const VIGENCIA_BADGE: Record<Vigencia, string> = {
  vigente:        "bg-emerald-50 text-emerald-700 border-emerald-200",
  futura:         "bg-water-50 text-water-700 border-water-200",
  vencida:        "bg-amber-50 text-amber-700 border-amber-200",
  sin_vigencia:   "bg-app-bg text-app-muted border-app-border",
};

function getVigencia(o: OfertaRow): Vigencia {
  if (!o.vigencia_desde && !o.vigencia_hasta) return "sin_vigencia";
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (o.vigencia_desde && isBefore(hoy, parseISO(o.vigencia_desde))) return "futura";
  if (o.vigencia_hasta && isAfter(hoy, parseISO(o.vigencia_hasta))) return "vencida";
  return "vigente";
}

const emptyForm = {
  titulo: "",
  descripcion: "",
  descuento_pct: "" as string | number,
  vigencia_desde: "",
  vigencia_hasta: "",
  imagen_url: "",
  estado: "borrador" as EstadoOferta,
  orden: 0,
};

export default function Ofertas() {
  const { toast } = useToast();
  const [rows, setRows] = useState<OfertaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filtroEstado, setFiltroEstado] = useState<"todos" | EstadoOferta>("todos");
  const [filtroVigencia, setFiltroVigencia] = useState<"todas" | Vigencia>("todas");

  const fetchRows = async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase
      .from("ofertas" as never)
      .select("*")
      .order("orden", { ascending: true })
      .order("created_at", { ascending: false });
    if (err) {
      console.error("ofertas error:", err);
      setError(true);
    } else {
      setRows((data ?? []) as unknown as OfertaRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filtroEstado !== "todos" && r.estado !== filtroEstado) return false;
      if (filtroVigencia !== "todas" && getVigencia(r) !== filtroVigencia) return false;
      return true;
    });
  }, [rows, filtroEstado, filtroVigencia]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Solo se permiten imágenes.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `ofertas/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: err } = await supabase.storage.from("eventos").upload(fileName, file);
    if (err) {
      toast({ title: "Error al subir", description: err.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("eventos").getPublicUrl(fileName);
    setForm((f) => ({ ...f, imagen_url: urlData.publicUrl }));
    setUploading(false);
    toast({ title: "Imagen subida ✅" });
  };

  const openCreate = () => {
    setEditingId(null);
    const maxOrden = rows.reduce((m, r) => Math.max(m, r.orden), 0);
    setForm({ ...emptyForm, orden: maxOrden + 10 });
    setDialogOpen(true);
  };

  const openEdit = (o: OfertaRow) => {
    setEditingId(o.id);
    setForm({
      titulo: o.titulo,
      descripcion: o.descripcion ?? "",
      descuento_pct: o.descuento_pct === null ? "" : String(o.descuento_pct),
      vigencia_desde: o.vigencia_desde ?? "",
      vigencia_hasta: o.vigencia_hasta ?? "",
      imagen_url: o.imagen_url ?? "",
      estado: o.estado,
      orden: o.orden,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) {
      toast({ title: "Error", description: "El título es obligatorio.", variant: "destructive" });
      return;
    }
    // Validación vigencia: desde <= hasta cuando ambos presentes
    if (form.vigencia_desde && form.vigencia_hasta && form.vigencia_desde > form.vigencia_hasta) {
      toast({ title: "Error", description: "Vigencia desde no puede ser posterior a vigencia hasta.", variant: "destructive" });
      return;
    }
    // Validar descuento [0..100]
    let descuento_pct: number | null = null;
    if (form.descuento_pct !== "" && form.descuento_pct !== null) {
      const n = Number(form.descuento_pct);
      if (Number.isNaN(n) || n < 0 || n > 100) {
        toast({ title: "Error", description: "El descuento debe estar entre 0 y 100.", variant: "destructive" });
        return;
      }
      descuento_pct = n;
    }

    setSaving(true);
    const payload = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || null,
      descuento_pct,
      vigencia_desde: form.vigencia_desde || null,
      vigencia_hasta: form.vigencia_hasta || null,
      imagen_url: form.imagen_url.trim() || null,
      estado: form.estado,
      orden: Number(form.orden) || 0,
    };
    const op = editingId
      ? supabase.from("ofertas" as never).update(payload).eq("id", editingId)
      : supabase.from("ofertas" as never).insert(payload);
    const { error: err } = await op;
    if (err) {
      toast({ title: "Error al guardar", description: err.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Oferta actualizada ✅" : "Oferta creada ✅" });
      setDialogOpen(false);
      fetchRows();
    }
    setSaving(false);
  };

  const handleDelete = async (o: OfertaRow) => {
    if (!confirm(`¿Eliminar la oferta "${o.titulo}"?`)) return;
    const { error: err } = await supabase.from("ofertas" as never).delete().eq("id", o.id);
    if (err) {
      toast({ title: "Error al eliminar", description: err.message, variant: "destructive" });
    } else {
      toast({ title: "Oferta eliminada" });
      fetchRows();
    }
  };

  if (loading) return <LoadingState message="Cargando ofertas..." />;
  if (error)   return <ErrorState onRetry={fetchRows} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-water-800">Ofertas y promociones</h1>
          <p className="mt-1 text-sm text-app-muted">
            Promociones con descuento y vigencia. El sitio público sólo muestra las marcadas como <strong>Activas</strong> dentro de su vigencia.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 rounded-xl bg-gradient-to-r from-water-500 to-water-700 text-white">
          <Plus className="h-4 w-4" /> Nueva oferta
        </Button>
      </div>

      <Card className="border-water-100">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div>
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-app-muted">Estado</Label>
            <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as typeof filtroEstado)}>
              <SelectTrigger className="mt-1.5 h-9 w-[160px] rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="borrador">Borrador</SelectItem>
                <SelectItem value="activa">Activa</SelectItem>
                <SelectItem value="expirada">Expirada</SelectItem>
                <SelectItem value="archivada">Archivada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-app-muted">Vigencia</Label>
            <Select value={filtroVigencia} onValueChange={(v) => setFiltroVigencia(v as typeof filtroVigencia)}>
              <SelectTrigger className="mt-1.5 h-9 w-[160px] rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="vigente">Vigente</SelectItem>
                <SelectItem value="futura">Por iniciar</SelectItem>
                <SelectItem value="vencida">Vencida</SelectItem>
                <SelectItem value="sin_vigencia">Sin fechas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="ml-auto text-xs text-app-muted">
            Total: {rows.length} · Mostrando {filtered.length}
          </p>
        </CardContent>
      </Card>

      <Card className="border-water-100">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              variant="inline"
              icon={Tag}
              title={rows.length === 0 ? "Todavía no hay ofertas" : "Sin resultados con los filtros aplicados"}
              description={rows.length === 0 ? "Creá la primera oferta con el botón superior." : "Probá cambiar los filtros."}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Orden</TableHead>
                  <TableHead>Oferta</TableHead>
                  <TableHead>Descuento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden md:table-cell">Vigencia</TableHead>
                  <TableHead className="w-28 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((o) => {
                  const vig = getVigencia(o);
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="text-center text-xs text-app-muted">{o.orden}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {o.imagen_url ? (
                            <img src={o.imagen_url} alt="" className="h-8 w-12 rounded object-cover" />
                          ) : (
                            <div className="flex h-8 w-12 items-center justify-center rounded bg-water-50 text-water-300">
                              <ImageIcon className="h-3.5 w-3.5" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium">{o.titulo}</p>
                            {o.descripcion && (
                              <p className="text-[11px] text-app-muted line-clamp-1 max-w-md">{o.descripcion}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {o.descuento_pct !== null && o.descuento_pct !== undefined
                          ? <Badge className="bg-water-100 text-water-700 border-water-200">{Number(o.descuento_pct)}% OFF</Badge>
                          : <span className="text-xs text-app-muted">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${ESTADO_BADGE[o.estado]} border`}>{ESTADO_LABEL[o.estado]}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className={`${VIGENCIA_BADGE[vig]} border w-fit text-[10px]`}>
                            {VIGENCIA_LABEL[vig]}
                          </Badge>
                          {(o.vigencia_desde || o.vigencia_hasta) && (
                            <span className="text-[10px] text-app-muted">
                              {o.vigencia_desde ?? "—"} → {o.vigencia_hasta ?? "—"}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(o)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => handleDelete(o)}>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar oferta" : "Nueva oferta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Título *</Label>
              <Input
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                className="mt-1.5"
                placeholder="Ej: 2x1 días de semana"
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                rows={4}
                className="mt-1.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Descuento (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={form.descuento_pct}
                  onChange={(e) => setForm({ ...form, descuento_pct: e.target.value })}
                  className="mt-1.5"
                  placeholder="Opcional"
                />
              </div>
              <div>
                <Label>Orden</Label>
                <Input
                  type="number"
                  value={form.orden}
                  onChange={(e) => setForm({ ...form, orden: Number(e.target.value) || 0 })}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Vigencia desde</Label>
                <Input
                  type="date"
                  value={form.vigencia_desde}
                  onChange={(e) => setForm({ ...form, vigencia_desde: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Vigencia hasta</Label>
                <Input
                  type="date"
                  value={form.vigencia_hasta}
                  onChange={(e) => setForm({ ...form, vigencia_hasta: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div>
              <Label>Imagen</Label>
              <div className="mt-1.5 flex items-center gap-3">
                {form.imagen_url ? (
                  <img src={form.imagen_url} alt="" className="h-16 w-24 rounded object-cover" />
                ) : (
                  <div className="flex h-16 w-24 items-center justify-center rounded border border-dashed border-app-border bg-water-50">
                    <ImageIcon className="h-5 w-5 text-water-300" />
                  </div>
                )}
                <div className="space-y-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
                    Subir imagen
                  </Button>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  {form.imagen_url && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, imagen_url: "" })}>
                      Quitar
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v as EstadoOferta })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="borrador">Borrador</SelectItem>
                  <SelectItem value="activa">Activa</SelectItem>
                  <SelectItem value="expirada">Expirada</SelectItem>
                  <SelectItem value="archivada">Archivada</SelectItem>
                </SelectContent>
              </Select>
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
