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
  Plus, Pencil, Trash2, Newspaper, Loader2, Upload, ImageIcon,
  ArrowUp, ArrowDown,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

import { LoadingState } from "@/components/admin/LoadingState";
import { ErrorState } from "@/components/admin/ErrorState";
import { EmptyState } from "@/components/admin/EmptyState";

// =============================================================================
// Tipos — la tabla `noticias` se creó en migración 20260520120000.
// No está en types.ts autogenerado → cast `as never` en queries.
// =============================================================================
type EstadoNoticia = "borrador" | "publicado" | "archivado";

interface NoticiaRow {
  id: string;
  titulo: string;
  cuerpo: string | null;
  imagen_url: string | null;
  fecha_publicacion: string;
  estado: EstadoNoticia;
  orden: number;
  created_at: string;
  updated_at: string;
}

const ESTADO_LABEL: Record<EstadoNoticia, string> = {
  borrador:   "Borrador",
  publicado:  "Publicado",
  archivado:  "Archivado",
};

const ESTADO_BADGE: Record<EstadoNoticia, string> = {
  borrador:   "bg-app-bg text-app-muted border-app-border",
  publicado:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  archivado:  "bg-rose-50 text-rose-700 border-rose-200",
};

const emptyForm = {
  titulo: "",
  cuerpo: "",
  imagen_url: "",
  fecha_publicacion: new Date().toISOString(),
  estado: "borrador" as EstadoNoticia,
  orden: 0,
};

export default function Noticias() {
  const { toast } = useToast();
  const [rows, setRows] = useState<NoticiaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filtroEstado, setFiltroEstado] = useState<"todos" | EstadoNoticia>("todos");

  const fetchRows = async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase
      .from("noticias" as never)
      .select("*")
      .order("orden", { ascending: true })
      .order("fecha_publicacion", { ascending: false });
    if (err) {
      console.error("noticias error:", err);
      setError(true);
    } else {
      setRows((data ?? []) as unknown as NoticiaRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, []);

  const filtered = useMemo(
    () => filtroEstado === "todos" ? rows : rows.filter((r) => r.estado === filtroEstado),
    [rows, filtroEstado],
  );

  // El bucket "eventos" es público y ya existe — lo reutilizamos para noticias.
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Solo se permiten imágenes.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `noticias/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
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
    setForm({ ...emptyForm, fecha_publicacion: new Date().toISOString(), orden: maxOrden + 10 });
    setDialogOpen(true);
  };

  const openEdit = (n: NoticiaRow) => {
    setEditingId(n.id);
    setForm({
      titulo: n.titulo,
      cuerpo: n.cuerpo ?? "",
      imagen_url: n.imagen_url ?? "",
      fecha_publicacion: n.fecha_publicacion,
      estado: n.estado,
      orden: n.orden,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) {
      toast({ title: "Error", description: "El título es obligatorio.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      titulo: form.titulo.trim(),
      cuerpo: form.cuerpo.trim() || null,
      imagen_url: form.imagen_url.trim() || null,
      fecha_publicacion: form.fecha_publicacion,
      estado: form.estado,
      orden: Number(form.orden) || 0,
    };
    const op = editingId
      ? supabase.from("noticias" as never).update(payload).eq("id", editingId)
      : supabase.from("noticias" as never).insert(payload);
    const { error: err } = await op;
    if (err) {
      toast({ title: "Error al guardar", description: err.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Noticia actualizada ✅" : "Noticia creada ✅" });
      setDialogOpen(false);
      fetchRows();
    }
    setSaving(false);
  };

  const handleDelete = async (n: NoticiaRow) => {
    if (!confirm(`¿Eliminar la noticia "${n.titulo}"?`)) return;
    const { error: err } = await supabase.from("noticias" as never).delete().eq("id", n.id);
    if (err) {
      toast({ title: "Error al eliminar", description: err.message, variant: "destructive" });
    } else {
      toast({ title: "Noticia eliminada" });
      fetchRows();
    }
  };

  // Reorden simple: subir/bajar swap del campo `orden` con el vecino.
  const handleMove = async (n: NoticiaRow, direction: "up" | "down") => {
    const ordered = [...rows].sort((a, b) => a.orden - b.orden);
    const idx = ordered.findIndex((r) => r.id === n.id);
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= ordered.length) return;
    const target = ordered[targetIdx];
    const { error: err } = await supabase
      .from("noticias" as never)
      .upsert([
        { id: n.id, orden: target.orden },
        { id: target.id, orden: n.orden },
      ]);
    if (err) {
      toast({ title: "Error al reordenar", description: err.message, variant: "destructive" });
    } else {
      fetchRows();
    }
  };

  if (loading) return <LoadingState message="Cargando noticias..." />;
  if (error)   return <ErrorState onRetry={fetchRows} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-water-800">Noticias</h1>
          <p className="mt-1 text-sm text-app-muted">
            Publicaciones del sitio público. Solo las marcadas como <strong>Publicadas</strong> son visibles para los visitantes.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 rounded-xl bg-gradient-to-r from-water-500 to-water-700 text-white">
          <Plus className="h-4 w-4" /> Nueva noticia
        </Button>
      </div>

      <Card className="border-water-100">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div>
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-app-muted">Estado</Label>
            <Select value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as typeof filtroEstado)}>
              <SelectTrigger className="mt-1.5 h-9 w-[180px] rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="borrador">Borrador</SelectItem>
                <SelectItem value="publicado">Publicado</SelectItem>
                <SelectItem value="archivado">Archivado</SelectItem>
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
              icon={Newspaper}
              title={rows.length === 0 ? "Todavía no hay noticias" : "Sin resultados con ese filtro"}
              description={rows.length === 0 ? "Creá la primera noticia con el botón superior." : "Probá cambiar el estado."}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Orden</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead className="hidden lg:table-cell">Resumen</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden md:table-cell">Publicación</TableHead>
                  <TableHead className="w-28 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((n, i) => (
                  <TableRow key={n.id}>
                    <TableCell>
                      <div className="flex flex-col items-center gap-0.5">
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0" disabled={i === 0} onClick={() => handleMove(n, "up")}>
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <span className="text-[10px] text-app-muted">{n.orden}</span>
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0" disabled={i === filtered.length - 1} onClick={() => handleMove(n, "down")}>
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {n.imagen_url ? (
                          <img src={n.imagen_url} alt="" className="h-8 w-8 rounded object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-water-50 text-water-300">
                            <ImageIcon className="h-3.5 w-3.5" />
                          </div>
                        )}
                        <span className="text-sm">{n.titulo}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden max-w-md truncate text-xs text-app-muted lg:table-cell">
                      {n.cuerpo ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${ESTADO_BADGE[n.estado]} border`}>
                        {ESTADO_LABEL[n.estado]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-xs text-app-muted md:table-cell">
                      {format(parseISO(n.fecha_publicacion), "dd/MM/yy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(n)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => handleDelete(n)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar noticia" : "Nueva noticia"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Título *</Label>
              <Input
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                className="mt-1.5"
                placeholder="Ej: Apertura de temporada 2026"
              />
            </div>
            <div>
              <Label>Cuerpo</Label>
              <Textarea
                value={form.cuerpo}
                onChange={(e) => setForm({ ...form, cuerpo: e.target.value })}
                rows={6}
                className="mt-1.5"
                placeholder="Texto de la noticia"
              />
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v as EstadoNoticia })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="borrador">Borrador</SelectItem>
                    <SelectItem value="publicado">Publicado</SelectItem>
                    <SelectItem value="archivado">Archivado</SelectItem>
                  </SelectContent>
                </Select>
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
            <div>
              <Label>Fecha de publicación</Label>
              <Input
                type="datetime-local"
                value={form.fecha_publicacion.slice(0, 16)}
                onChange={(e) => setForm({ ...form, fecha_publicacion: new Date(e.target.value).toISOString() })}
                className="mt-1.5"
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
