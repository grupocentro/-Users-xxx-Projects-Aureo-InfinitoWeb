import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Upload, Loader2, ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Evento = {
  id: string;
  nombre: string;
  descripcion: string | null;
  edicion: string | null;
  emoji: string | null;
  tagline: string | null;
  gradiente: string | null;
  imagen_url: string | null;
  fecha: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  estado: string;
  precio: number;
};

const emptyForm = {
  nombre: "",
  descripcion: "",
  edicion: "",
  emoji: "🎉",
  tagline: "",
  gradiente: "",
  imagen_url: "",
  fecha: undefined as Date | undefined,
  hora_inicio: "",
  hora_fin: "",
  estado: "activo",
  precio: 0,
};

export default function AdminEventos() {
  const { toast } = useToast();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Solo se permiten imágenes.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("eventos").upload(fileName, file);
    if (error) {
      toast({ title: "Error al subir", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("eventos").getPublicUrl(fileName);
    setForm((f) => ({ ...f, imagen_url: urlData.publicUrl }));
    setImagePreview(urlData.publicUrl);
    setUploading(false);
    toast({ title: "Imagen subida ✅" });
  };

  const fetchEventos = async () => {
    const { data } = await supabase
      .from("eventos")
      .select("*")
      .order("fecha", { ascending: false });
    if (data) setEventos(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchEventos();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setImagePreview(null);
    setDialogOpen(true);
  };

  const openEdit = (ev: Evento) => {
    setEditingId(ev.id);
    setForm({
      nombre: ev.nombre,
      descripcion: ev.descripcion || "",
      edicion: ev.edicion || "",
      emoji: ev.emoji || "🎉",
      tagline: ev.tagline || "",
      gradiente: ev.gradiente || "",
      imagen_url: ev.imagen_url || "",
      fecha: ev.fecha ? new Date(ev.fecha + "T12:00:00") : undefined,
      hora_inicio: ev.hora_inicio || "",
      hora_fin: ev.hora_fin || "",
      estado: ev.estado,
      precio: ev.precio || 0,
    });
    setImagePreview(ev.imagen_url || null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      toast({ title: "Error", description: "El nombre es obligatorio.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion || null,
      edicion: form.edicion || null,
      emoji: form.emoji || null,
      tagline: form.tagline || null,
      gradiente: form.gradiente || null,
      imagen_url: form.imagen_url || null,
      fecha: form.fecha ? format(form.fecha, "yyyy-MM-dd") : null,
      hora_inicio: form.hora_inicio || null,
      hora_fin: form.hora_fin || null,
      estado: form.estado,
      precio: form.precio || 0,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("eventos").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("eventos").insert(payload));
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Actualizado" : "Creado", description: `Evento "${form.nombre}" guardado.` });
      setDialogOpen(false);
      fetchEventos();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    const { error } = await supabase.from("eventos").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Eliminado", description: `"${nombre}" fue eliminado.` });
      fetchEventos();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestión de Eventos</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Nuevo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Evento" : "Nuevo Evento"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-[60px_1fr] gap-3">
                <div>
                  <Label>Emoji</Label>
                  <Input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className="text-center text-xl" />
                </div>
                <div>
                  <Label>Nombre *</Label>
                  <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: OCASO, NEON SPLASH" />
                </div>
              </div>

              <div>
                <Label>Tagline</Label>
                <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Ej: La fiesta del atardecer" />
              </div>

              <div>
                <Label>Edición</Label>
                <Input value={form.edicion} onChange={(e) => setForm({ ...form, edicion: e.target.value })} placeholder="Ej: Vol. 3" />
              </div>

              <div>
                <Label>Descripción</Label>
                <Textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción del evento..." rows={3} />
              </div>

              <div>
                <Label>Precio por persona ($)</Label>
                <Input type="number" min={0} value={form.precio} onChange={(e) => setForm({ ...form, precio: Number(e.target.value) })} placeholder="Ej: 35000" />
              </div>

              {/* Date picker */}
              <div>
                <Label>Fecha</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.fecha && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.fecha ? format(form.fecha, "PPP", { locale: es }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.fecha}
                      onSelect={(d) => setForm({ ...form, fecha: d })}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Hora inicio</Label>
                  <Input type="time" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} />
                </div>
                <div>
                  <Label>Hora fin</Label>
                  <Input type="time" value={form.hora_fin} onChange={(e) => setForm({ ...form, hora_fin: e.target.value })} />
                </div>
              </div>

              <div>
                <Label>Gradiente CSS</Label>
                <Input value={form.gradiente} onChange={(e) => setForm({ ...form, gradiente: e.target.value })} placeholder="Ej: from-orange-500 to-pink-600" />
              </div>

              <div>
                <Label>Imagen del evento</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                {imagePreview ? (
                  <div className="relative mt-2 rounded-lg overflow-hidden border">
                    <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                        Cambiar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-1 h-24 flex flex-col gap-1 text-muted-foreground"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <>
                        <ImageIcon className="h-6 w-6" />
                        <span className="text-sm">Subir imagen</span>
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div>
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? "Guardando..." : editingId ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Cargando...</TableCell>
                </TableRow>
              ) : eventos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No hay eventos creados</TableCell>
                </TableRow>
              ) : (
                eventos.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{ev.emoji || "🎉"}</span>
                        <div>
                          <p className="font-medium">{ev.nombre}</p>
                          {ev.tagline && <p className="text-xs text-muted-foreground">{ev.tagline}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {ev.fecha
                        ? format(new Date(ev.fecha + "T12:00:00"), "dd/MM/yyyy")
                        : <span className="text-muted-foreground">Sin fecha</span>}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {ev.precio > 0 ? `$${ev.precio.toLocaleString("es-AR")}` : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {ev.hora_inicio
                        ? `${ev.hora_inicio}${ev.hora_fin ? ` - ${ev.hora_fin}` : ""}`
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ev.estado === "activo" ? "default" : "secondary"}>{ev.estado}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(ev)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(ev.id, ev.nombre)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
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
