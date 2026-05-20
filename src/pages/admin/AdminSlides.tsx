import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Pencil, Trash2, Upload, Loader2, Play, Image, GripVertical } from "lucide-react";

type Slide = {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  location: string;
  rating: number;
  image_url: string;
  accent: string;
  cta_text: string;
  video_url: string | null;
  orden: number;
  estado: string;
};

const emptyForm = {
  tag: "",
  title: "",
  subtitle: "",
  location: "",
  rating: 0,
  image_url: "",
  accent: "hsl(var(--water-400))",
  cta_text: "Ver más",
  video_url: "",
  orden: 0,
  estado: "activo",
};

export default function AdminSlides() {
  const { toast } = useToast();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDrop = async (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return;
    const reordered = [...slides];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setSlides(reordered);
    // Update orden in DB
    const updates = reordered.map((s, i) =>
      supabase.from("hero_slides").update({ orden: i + 1 }).eq("id", s.id)
    );
    await Promise.all(updates);
    toast({ title: "Orden actualizado" });
  };

  const fetchSlides = async () => {
    const { data } = await supabase.from("hero_slides").select("*").order("orden", { ascending: true });
    if (data) setSlides(data as Slide[]);
    setLoading(false);
  };

  useEffect(() => { fetchSlides(); }, []);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };

  const openEdit = (s: Slide) => {
    setEditingId(s.id);
    setForm({
      tag: s.tag,
      title: s.title,
      subtitle: s.subtitle,
      location: s.location,
      rating: s.rating,
      image_url: s.image_url,
      accent: s.accent,
      cta_text: s.cta_text,
      video_url: s.video_url || "",
      orden: s.orden,
      estado: s.estado,
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `hero/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("eventos").upload(fileName, file, { upsert: true });
    if (error) {
      toast({ title: "Error al subir", description: error.message, variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from("eventos").getPublicUrl(fileName);
      setForm((f) => ({ ...f, image_url: urlData.publicUrl }));
      toast({ title: "Imagen subida" });
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Error", description: "El título es obligatorio.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      tag: form.tag,
      title: form.title.trim(),
      subtitle: form.subtitle,
      location: form.location,
      rating: form.rating,
      image_url: form.image_url,
      accent: form.accent,
      cta_text: form.cta_text,
      video_url: form.video_url || null,
      orden: form.orden,
      estado: form.estado,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("hero_slides").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("hero_slides").insert(payload));
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Actualizado" : "Creado", description: `"${form.title}" guardado.` });
      setDialogOpen(false);
      fetchSlides();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`¿Eliminar slide "${title}"?`)) return;
    const { error } = await supabase.from("hero_slides").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Eliminado" });
      fetchSlides();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Slides del Hero</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Nuevo Slide</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Slide" : "Nuevo Slide"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Título *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej: Pileta de Olas" />
              </div>
              <div>
                <Label>Subtítulo</Label>
                <Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Ej: Desafiá olas de 2 metros" />
              </div>
              <div>
                <Label>Tag</Label>
                <Input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="Ej: 🌊 Pileta de Olas" />
              </div>
              <div>
                <Label>Imagen</Label>
                <div className="mt-1 space-y-2">
                  {form.image_url && (
                    <img src={form.image_url} alt="Preview" className="h-32 w-full rounded-lg object-cover" />
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
                  <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="O pegar URL directa" className="text-xs" />
                </div>
              </div>
              <div>
                <Label>URL Video (opcional, YouTube embed)</Label>
                <Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://www.youtube.com/embed/..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Ubicación</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ej: Centro del parque" />
                </div>
                <div>
                  <Label>Rating</Label>
                  <Input type="number" step="0.1" value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Texto CTA</Label>
                  <Input value={form.cta_text} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} placeholder="Ver más" />
                </div>
                <div>
                  <Label>Accent (color)</Label>
                  <Input value={form.accent} onChange={(e) => setForm({ ...form, accent: e.target.value })} placeholder="hsl(var(--water-400))" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Orden</Label>
                  <Input type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })} />
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
                <TableHead>Slide</TableHead>
                <TableHead>Tag</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : slides.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No hay slides creados</TableCell></TableRow>
              ) : (
                slides.map((s, idx) => (
                  <TableRow
                    key={s.id}
                    draggable
                    onDragStart={() => setDragIdx(idx)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
                    onDragLeave={() => setDragOverIdx(null)}
                    onDrop={() => { if (dragIdx !== null) handleDrop(dragIdx, idx); setDragIdx(null); setDragOverIdx(null); }}
                    onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                    className={`transition-colors ${dragOverIdx === idx ? "bg-muted" : ""} ${dragIdx === idx ? "opacity-50" : ""}`}
                    style={{ cursor: "grab" }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        {s.image_url && <img src={s.image_url} alt={s.title} className="h-10 w-16 rounded object-cover" />}
                        <div>
                          <p className="font-medium">{s.title}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{s.subtitle}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-sm">{s.tag}</span></TableCell>
                    <TableCell>
                      {s.video_url ? (
                        <Badge variant="outline" className="gap-1"><Play className="h-3 w-3" />Video</Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1"><Image className="h-3 w-3" />Imagen</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.estado === "activo" ? "default" : "secondary"}>{s.estado}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id, s.title)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
