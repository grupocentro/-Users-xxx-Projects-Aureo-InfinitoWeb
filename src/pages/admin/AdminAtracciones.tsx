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
import { Plus, Pencil, Trash2, X, Upload, Loader2 } from "lucide-react";

type Atraccion = {
  id: string;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  intensidad: string | null;
  duracion: string | null;
  edad_min: number | null;
  rating: number | null;
  reviews: number | null;
  badge: string | null;
  accent: string | null;
  ubicacion: string | null;
  tags: string[];
  estado: string;
  orden: number | null;
};

const emptyForm = {
  nombre: "",
  descripcion: "",
  imagen_url: "",
  intensidad: "Media",
  duracion: "",
  edad_min: 0,
  rating: 0,
  reviews: 0,
  badge: "",
  accent: "",
  ubicacion: "",
  tags: [] as string[],
  estado: "activo",
  orden: 0,
};

export default function AdminAtracciones() {
  const { toast } = useToast();
  const [atracciones, setAtracciones] = useState<Atraccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `atracciones/${Date.now()}.${ext}`;
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

  const fetch = async () => {
    const { data } = await supabase.from("atracciones").select("*").order("orden", { ascending: true });
    if (data) {
      setAtracciones(data.map((a) => ({ ...a, tags: Array.isArray(a.tags) ? (a.tags as string[]) : [] })));
    }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setNewTag(""); setDialogOpen(true); };

  const openEdit = (a: Atraccion) => {
    setEditingId(a.id);
    setForm({
      nombre: a.nombre,
      descripcion: a.descripcion || "",
      imagen_url: a.imagen_url || "",
      intensidad: a.intensidad || "Media",
      duracion: a.duracion || "",
      edad_min: a.edad_min || 0,
      rating: a.rating || 0,
      reviews: a.reviews || 0,
      badge: a.badge || "",
      accent: a.accent || "",
      ubicacion: a.ubicacion || "",
      tags: a.tags,
      estado: a.estado,
      orden: a.orden || 0,
    });
    setNewTag("");
    setDialogOpen(true);
  };

  const addTag = () => {
    const t = newTag.trim();
    if (t && !form.tags.includes(t)) { setForm({ ...form, tags: [...form.tags, t] }); setNewTag(""); }
  };

  const removeTag = (i: number) => { setForm({ ...form, tags: form.tags.filter((_, idx) => idx !== i) }); };

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
      intensidad: form.intensidad || null,
      duracion: form.duracion || null,
      edad_min: form.edad_min,
      rating: form.rating,
      reviews: form.reviews,
      badge: form.badge || null,
      accent: form.accent || null,
      ubicacion: form.ubicacion || null,
      tags: form.tags,
      estado: form.estado,
      orden: form.orden,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("atracciones").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("atracciones").insert(payload));
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Actualizado" : "Creado", description: `"${form.nombre}" guardado.` });
      setDialogOpen(false);
      fetch();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    const { error } = await supabase.from("atracciones").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Eliminado", description: `"${nombre}" fue eliminado.` });
      fetch();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestión de Atracciones</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Nueva Atracción</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Atracción" : "Nueva Atracción"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Nombre *</Label>
                <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Tobogán Extremo" />
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
                  <Label>Intensidad</Label>
                  <Select value={form.intensidad} onValueChange={(v) => setForm({ ...form, intensidad: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baja">Baja</SelectItem>
                      <SelectItem value="Media">Media</SelectItem>
                      <SelectItem value="Alta">Alta</SelectItem>
                      <SelectItem value="Extrema">Extrema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duración</Label>
                  <Input value={form.duracion} onChange={(e) => setForm({ ...form, duracion: e.target.value })} placeholder="Ej: 45 seg" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Edad mín.</Label>
                  <Input type="number" value={form.edad_min} onChange={(e) => setForm({ ...form, edad_min: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Rating</Label>
                  <Input type="number" step="0.1" value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Reviews</Label>
                  <Input type="number" value={form.reviews} onChange={(e) => setForm({ ...form, reviews: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Badge</Label>
                  <Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="Ej: 🔥 Popular" />
                </div>
                <div>
                  <Label>Orden</Label>
                  <Input type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Accent (color)</Label>
                  <Input value={form.accent} onChange={(e) => setForm({ ...form, accent: e.target.value })} placeholder="Ej: cyan" />
                </div>
                <div>
                  <Label>Ubicación</Label>
                  <Input value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} placeholder="Ej: Zona Norte" />
                </div>
              </div>
              <div>
                <Label>Tags</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Ej: Toboganes" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} />
                  <Button type="button" variant="outline" size="sm" onClick={addTag}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.tags.map((t, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      {t}
                      <button onClick={() => removeTag(i)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
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
                <TableHead>Atracción</TableHead>
                <TableHead>Intensidad</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : atracciones.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No hay atracciones creadas</TableCell></TableRow>
              ) : (
                atracciones.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {a.imagen_url && <img src={a.imagen_url} alt={a.nombre} className="h-10 w-10 rounded object-cover" />}
                        <div>
                          <p className="font-medium">{a.nombre}</p>
                          {a.badge && <p className="text-xs text-muted-foreground">{a.badge}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{a.intensidad || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {a.tags.slice(0, 3).map((t, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{t}</Badge>
                        ))}
                        {a.tags.length > 3 && <Badge variant="outline" className="text-xs">+{a.tags.length - 3}</Badge>}
                      </div>
                    </TableCell>
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
