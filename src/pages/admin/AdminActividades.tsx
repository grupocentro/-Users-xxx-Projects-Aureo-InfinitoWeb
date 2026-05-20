import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Upload, Loader2 } from "lucide-react";

type Actividad = {
  id: string;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  ubicacion: string | null;
  duracion: string | null;
  intensidad: string | null;
  rating: number | null;
  reviews: number | null;
  fecha: string | null;
  hora: string | null;
  estado: string;
  orden: number | null;
};

const emptyForm = {
  nombre: "",
  descripcion: "",
  imagen_url: "",
  ubicacion: "",
  duracion: "",
  intensidad: "",
  rating: 0,
  reviews: 0,
  fecha: "",
  hora: "",
  estado: "activo",
  orden: 0,
};

export default function AdminActividades() {
  const { toast } = useToast();
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `actividades/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("eventos").upload(fileName, file, { upsert: true });
    if (error) {
      toast({ title: "Error al subir imagen", description: error.message, variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from("eventos").getPublicUrl(fileName);
      setForm((f) => ({ ...f, imagen_url: urlData.publicUrl }));
      toast({ title: "Imagen subida" });
    }
    setUploading(false);
  };

  const fetchData = async () => {
    const { data } = await supabase.from("actividades").select("*").order("orden", { ascending: true });
    if (data) setActividades(data as Actividad[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };

  const openEdit = (a: Actividad) => {
    setEditingId(a.id);
    setForm({
      nombre: a.nombre,
      descripcion: a.descripcion || "",
      imagen_url: a.imagen_url || "",
      ubicacion: a.ubicacion || "",
      duracion: a.duracion || "",
      intensidad: a.intensidad || "",
      rating: a.rating || 0,
      reviews: a.reviews || 0,
      fecha: a.fecha || "",
      hora: a.hora || "",
      estado: a.estado,
      orden: a.orden || 0,
    });
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
      imagen_url: form.imagen_url || null,
      ubicacion: form.ubicacion || null,
      duracion: form.duracion || null,
      intensidad: form.intensidad || null,
      rating: form.rating,
      reviews: form.reviews,
      fecha: form.fecha || null,
      hora: form.hora || null,
      estado: form.estado,
      orden: form.orden,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("actividades").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("actividades").insert(payload));
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Actualizado" : "Creado", description: `"${form.nombre}" guardado.` });
      setDialogOpen(false);
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    const { error } = await supabase.from("actividades").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Eliminado", description: `"${nombre}" fue eliminado.` });
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Próximas Actividades</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Nueva Actividad</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Actividad" : "Nueva Actividad"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Nombre *</Label>
                <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Clase de Aqua Gym" />
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={3} />
              </div>
              <div>
                <Label>Imagen</Label>
                <div className="mt-1 space-y-2">
                  {form.imagen_url && (
                    <img src={form.imagen_url} alt="Preview" className="h-24 w-24 rounded-lg object-cover" />
                  )}
                  <div className="flex gap-2 items-center">
                    <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                      <label className="cursor-pointer">
                        {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        {uploading ? "Subiendo..." : "Subir imagen"}
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    </Button>
                  </div>
                  <Input value={form.imagen_url} onChange={(e) => setForm({ ...form, imagen_url: e.target.value })} placeholder="O pegar URL directa" className="text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Fecha</Label>
                  <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
                </div>
                <div>
                  <Label>Hora</Label>
                  <Input value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} placeholder="Ej: 10:00 - 12:00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Duración</Label>
                  <Input value={form.duracion} onChange={(e) => setForm({ ...form, duracion: e.target.value })} placeholder="Ej: 1 hora" />
                </div>
                <div>
                  <Label>Intensidad</Label>
                  <Input value={form.intensidad} onChange={(e) => setForm({ ...form, intensidad: e.target.value })} placeholder="Ej: Media" />
                </div>
              </div>
              <div>
                <Label>Ubicación</Label>
                <Input value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} placeholder="Ej: Zona Norte" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Rating</Label>
                  <Input type="number" step="0.1" value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Reviews</Label>
                  <Input type="number" value={form.reviews} onChange={(e) => setForm({ ...form, reviews: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Orden</Label>
                  <Input type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <TableHead>Actividad</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : actividades.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No hay actividades creadas</TableCell></TableRow>
              ) : (
                actividades.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {a.imagen_url && <img src={a.imagen_url} alt={a.nombre} className="h-10 w-10 rounded object-cover" />}
                        <p className="font-medium">{a.nombre}</p>
                      </div>
                    </TableCell>
                    <TableCell>{a.fecha || "—"}</TableCell>
                    <TableCell>{a.ubicacion || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={a.estado === "activo" ? "default" : "secondary"}>{a.estado}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id, a.nombre)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
