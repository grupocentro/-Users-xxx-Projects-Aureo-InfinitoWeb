import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Pencil, Trash2, X } from "lucide-react";

type FeatureItem = string | { icon?: string; text?: string };

type TipoEntrada = {
  id: string;
  nombre: string;
  emoji: string | null;
  tag: string | null;
  features: FeatureItem[];
  precio_semana: number;
  precio_finde: number;
  highlight: boolean | null;
  estado: string;
};

const getFeatureLabel = (f: FeatureItem): string => {
  if (typeof f === "string") return f;
  return [f.icon, f.text].filter(Boolean).join(" ");
};

const emptyForm = {
  nombre: "",
  emoji: "🎟️",
  tag: "",
  precio_semana: 0,
  precio_finde: 0,
  features: [] as FeatureItem[],
  highlight: false,
  estado: "activo",
};

export default function AdminEntradas() {
  const { toast } = useToast();
  const [entradas, setEntradas] = useState<TipoEntrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [newFeature, setNewFeature] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchEntradas = async () => {
    const { data } = await supabase
      .from("tipos_entrada")
      .select("*")
      .order("precio_semana", { ascending: true });
    if (data) {
      setEntradas(
        data.map((e) => ({
          ...e,
          features: Array.isArray(e.features) ? (e.features as string[]) : [],
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEntradas();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setNewFeature("");
    setDialogOpen(true);
  };

  const openEdit = (entrada: TipoEntrada) => {
    setEditingId(entrada.id);
    setForm({
      nombre: entrada.nombre,
      emoji: entrada.emoji || "🎟️",
      tag: entrada.tag || "",
      precio_semana: entrada.precio_semana,
      precio_finde: entrada.precio_finde,
      features: entrada.features,
      highlight: entrada.highlight || false,
      estado: entrada.estado,
    });
    setNewFeature("");
    setDialogOpen(true);
  };

  const addFeature = () => {
    const f = newFeature.trim();
    if (f && !form.features.some(feat => getFeatureLabel(feat) === f)) {
      setForm({ ...form, features: [...form.features, f] });
      setNewFeature("");
    }
  };

  const removeFeature = (idx: number) => {
    setForm({ ...form, features: form.features.filter((_, i) => i !== idx) });
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      toast({ title: "Error", description: "El nombre es obligatorio.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      nombre: form.nombre.trim(),
      emoji: form.emoji || null,
      tag: form.tag || null,
      precio_semana: form.precio_semana,
      precio_finde: form.precio_finde,
      features: form.features,
      highlight: form.highlight,
      estado: form.estado,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("tipos_entrada").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("tipos_entrada").insert(payload));
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Actualizado" : "Creado", description: `Entrada "${form.nombre}" guardada.` });
      setDialogOpen(false);
      fetchEntradas();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    const { error } = await supabase.from("tipos_entrada").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Eliminado", description: `"${nombre}" fue eliminado.` });
      fetchEntradas();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestión de Entradas</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Nueva Entrada
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Entrada" : "Nueva Entrada"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-[60px_1fr] gap-3">
                <div>
                  <Label>Emoji</Label>
                  <Input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className="text-center text-xl" />
                </div>
                <div>
                  <Label>Nombre *</Label>
                  <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: General, VIP" />
                </div>
              </div>
              <div>
                <Label>Tag / subtítulo</Label>
                <Input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="Ej: Acceso básico" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Precio Semana ($)</Label>
                  <Input type="number" value={form.precio_semana} onChange={(e) => setForm({ ...form, precio_semana: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Precio Finde ($)</Label>
                  <Input type="number" value={form.precio_finde} onChange={(e) => setForm({ ...form, precio_finde: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>Features incluidas</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    placeholder="Ej: Fast Pass Incluido"
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addFeature}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.features.map((f, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      {getFeatureLabel(f)}
                      <button onClick={() => removeFeature(i)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 items-end">
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
                <div className="flex items-center gap-2 pb-1">
                  <Switch checked={form.highlight} onCheckedChange={(v) => setForm({ ...form, highlight: v })} />
                  <Label>Destacar</Label>
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
                <TableHead>Entrada</TableHead>
                <TableHead className="text-right">Semana</TableHead>
                <TableHead className="text-right">Finde</TableHead>
                <TableHead>Features</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : entradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No hay entradas creadas
                  </TableCell>
                </TableRow>
              ) : (
                entradas.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{e.emoji || "🎟️"}</span>
                        <div>
                          <p className="font-medium">{e.nombre}</p>
                          {e.tag && <p className="text-xs text-muted-foreground">{e.tag}</p>}
                        </div>
                        {e.highlight && <Badge variant="default" className="text-xs">⭐</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${e.precio_semana.toLocaleString("es-AR")}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ${e.precio_finde.toLocaleString("es-AR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {e.features.slice(0, 3).map((f, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{getFeatureLabel(f)}</Badge>
                        ))}
                        {e.features.length > 3 && (
                          <Badge variant="outline" className="text-xs">+{e.features.length - 3}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={e.estado === "activo" ? "default" : "secondary"}>
                        {e.estado}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(e)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id, e.nombre)}>
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
