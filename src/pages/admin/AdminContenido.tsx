import { useEffect, useMemo, useState } from "react";
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
import { Plus, Pencil, Trash2, FileText, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

import { LoadingState } from "@/components/admin/LoadingState";
import { ErrorState } from "@/components/admin/ErrorState";
import { EmptyState } from "@/components/admin/EmptyState";

// =============================================================================
// contenido_web: tabla key-value libre (clave UNIQUE, valor texto, tipo texto)
// No tiene estado publicado/borrador en el schema actual — no inventamos campos.
// =============================================================================
interface ContenidoRow {
  id: string;
  clave: string;
  valor: string;
  tipo: string;
  created_at: string;
  updated_at: string;
}

// Tipos sugeridos. El usuario puede tipear cualquier otro valor.
const TIPOS_SUGERIDOS = ["text", "html", "url", "number", "json", "markdown"] as const;

const emptyForm = { clave: "", valor: "", tipo: "text" };

export default function AdminContenido() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ContenidoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [search, setSearch] = useState("");

  const fetchRows = async () => {
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase
      .from("contenido_web")
      .select("*")
      .order("clave", { ascending: true });
    if (err) {
      console.error("contenido_web error:", err);
      setError(true);
    } else {
      setRows((data ?? []) as ContenidoRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, []);

  const tiposUnicos = useMemo(() => {
    const set = new Set<string>(TIPOS_SUGERIDOS);
    rows.forEach((r) => set.add(r.tipo));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filtroTipo !== "todos" && r.tipo !== filtroTipo) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!r.clave.toLowerCase().includes(q) && !r.valor.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [rows, filtroTipo, search]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row: ContenidoRow) => {
    setEditingId(row.id);
    setForm({ clave: row.clave, valor: row.valor, tipo: row.tipo });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const clave = form.clave.trim();
    if (!clave) {
      toast({ title: "Error", description: "La clave es obligatoria.", variant: "destructive" });
      return;
    }
    if (!/^[a-z0-9_.-]+$/i.test(clave)) {
      toast({
        title: "Clave inválida",
        description: "Sólo letras, números, guión, guión bajo y punto.",
        variant: "destructive",
      });
      return;
    }
    const tipo = form.tipo.trim() || "text";

    setSaving(true);
    if (editingId) {
      const { error: err } = await supabase
        .from("contenido_web")
        .update({ clave, valor: form.valor, tipo, updated_at: new Date().toISOString() })
        .eq("id", editingId);
      if (err) {
        toast({ title: "Error al actualizar", description: err.message, variant: "destructive" });
      } else {
        toast({ title: "Contenido actualizado ✅" });
        setDialogOpen(false);
        fetchRows();
      }
    } else {
      const { error: err } = await supabase
        .from("contenido_web")
        .insert({ clave, valor: form.valor, tipo });
      if (err) {
        const msg = err.code === "23505" ? "Ya existe una entrada con esa clave." : err.message;
        toast({ title: "Error al crear", description: msg, variant: "destructive" });
      } else {
        toast({ title: "Contenido creado ✅" });
        setDialogOpen(false);
        fetchRows();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (row: ContenidoRow) => {
    if (!confirm(`¿Eliminar contenido "${row.clave}"? Esta acción no se puede deshacer.`)) return;
    const { error: err } = await supabase.from("contenido_web").delete().eq("id", row.id);
    if (err) {
      toast({ title: "Error al eliminar", description: err.message, variant: "destructive" });
    } else {
      toast({ title: "Contenido eliminado" });
      fetchRows();
    }
  };

  if (loading) return <LoadingState message="Cargando contenido..." />;
  if (error)   return <ErrorState onRetry={fetchRows} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-water-800">Contenido editable</h1>
          <p className="mt-1 text-sm text-app-muted">
            Textos, URLs y configuraciones del sitio público.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 rounded-xl bg-gradient-to-r from-water-500 to-water-700 text-white">
          <Plus className="h-4 w-4" /> Nuevo contenido
        </Button>
      </div>

      <Card className="border-water-100">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="grow">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-app-muted">Buscar</Label>
            <Input
              placeholder="Filtrar por clave o valor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-1.5 h-9 rounded-xl"
            />
          </div>
          <div>
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-app-muted">Tipo</Label>
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="mt-1.5 h-9 w-[160px] rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {tiposUnicos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-water-100">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              variant="inline"
              icon={FileText}
              title="No hay contenido para mostrar"
              description={rows.length === 0
                ? "Creá tu primer contenido editable desde el botón superior."
                : "Probá ajustar los filtros."}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Clave</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="hidden md:table-cell">Actualizado</TableHead>
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.clave}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-[10px]">{r.tipo}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate text-sm text-app-muted">{r.valor || "—"}</TableCell>
                    <TableCell className="hidden text-xs text-app-muted md:table-cell">
                      {format(parseISO(r.updated_at), "dd/MM/yy HH:mm", { locale: es })}
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-app-muted">
        Total: {rows.length} contenidos · Mostrando {filtered.length}
      </p>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar contenido" : "Nuevo contenido"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Clave (única) *</Label>
              <Input
                value={form.clave}
                onChange={(e) => setForm({ ...form, clave: e.target.value })}
                placeholder="ej: hero.titulo, contacto.email"
                className="mt-1.5 font-mono text-sm"
                disabled={!!editingId}
              />
              {editingId && <p className="mt-1 text-[11px] text-app-muted">La clave no se puede cambiar (es UNIQUE).</p>}
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_SUGERIDOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor</Label>
              <Textarea
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                rows={8}
                className="mt-1.5 font-mono text-sm"
                placeholder="Contenido del campo"
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
