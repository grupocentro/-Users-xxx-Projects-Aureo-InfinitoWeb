import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, UserCog, Trash2, Loader2, Plus, Pencil, Lock } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

type AppRole = "admin" | "editor" | "control_entradas";

interface UserWithRole {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  created_at: string;
  role: AppRole | null;
  role_id: string | null;
}

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  editor: "Editor",
  control_entradas: "Control Entradas",
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: "destructive",
  editor: "default",
  control_entradas: "secondary",
};

const emptyUserForm = {
  email: "",
  nombre: "",
  apellido: "",
  password: "",
  role: "" as string,
};

export default function AdminUsuarios() {
  // Guard solo-admin: AdminLayout permite admin + editor, pero esta sección
  // operativamente sólo tiene sentido para admin (la edge function
  // admin-create-user devuelve 403 a editores, y user_roles RLS sólo deja
  // leer al admin → editor vería listados vacíos y errores silenciosos).
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "con_rol" | "sin_rol">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [form, setForm] = useState(emptyUserForm);
  const [editForm, setEditForm] = useState({ nombre: "", apellido: "", email: "", whatsapp: "" });
  const [formSaving, setFormSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const [profilesRes, rolesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
    ]);

    if (profilesRes.error || rolesRes.error) {
      toast.error("Error al cargar usuarios");
      setLoading(false);
      return;
    }

    const rolesMap = new Map(
      (rolesRes.data || []).map((r) => [r.user_id, { role: r.role as AppRole, id: r.id }])
    );

    const merged: UserWithRole[] = (profilesRes.data || []).map((p) => {
      const roleEntry = rolesMap.get(p.id);
      return {
        id: p.id,
        email: p.email,
        nombre: p.nombre,
        apellido: p.apellido,
        created_at: p.created_at,
        role: roleEntry?.role ?? null,
        role_id: roleEntry?.id ?? null,
      };
    });

    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => {
    // Sólo intentamos leer user_roles si somos admin (RLS lo bloquea para editor).
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const assignRole = async (userId: string, role: AppRole) => {
    setSaving(userId);
    const existing = users.find((u) => u.id === userId);

    if (existing?.role_id) {
      const { error } = await supabase.from("user_roles").update({ role }).eq("id", existing.role_id);
      if (error) { toast.error("Error al actualizar rol"); setSaving(null); return; }
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) { toast.error("Error al asignar rol"); setSaving(null); return; }
    }

    toast.success(`Rol "${ROLE_LABELS[role]}" asignado correctamente`);
    await fetchUsers();
    setSaving(null);
  };

  const removeRole = async (userId: string) => {
    const existing = users.find((u) => u.id === userId);
    if (!existing?.role_id) return;
    setSaving(userId);
    const { error } = await supabase.from("user_roles").delete().eq("id", existing.role_id);
    if (error) { toast.error("Error al quitar rol"); setSaving(null); return; }
    toast.success("Rol eliminado");
    await fetchUsers();
    setSaving(null);
  };

  const handleCreateUser = async () => {
    if (!form.email || !form.password || !form.nombre) {
      toast.error("Email, nombre y contraseña son obligatorios");
      return;
    }
    setFormSaving(true);

    // IMPORTANTE: ya NO usamos supabase.auth.signUp acá. signUp loguea
    // automáticamente al usuario recién creado, lo que desloguea al admin
    // que estaba operando el panel. La edge function admin-create-user usa
    // service_role del lado server y NO afecta la sesión del cliente.
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: {
        email: form.email,
        password: form.password,
        nombre: form.nombre,
        apellido: form.apellido,
        role: form.role || undefined,
      },
    });

    // FunctionsHttpError: el body de error vive en error.context.json()
    if (error) {
      let msg = error.message || "No se pudo crear el usuario";
      try {
        const ctx = (error as { context?: { json?: () => Promise<unknown> } }).context;
        if (ctx?.json) {
          const parsed = await ctx.json();
          if (parsed && typeof parsed === "object" && "error" in parsed) {
            msg = String((parsed as { error: unknown }).error);
          }
        }
      } catch { /* sin parse, usamos mensaje genérico */ }
      toast.error(msg);
      setFormSaving(false);
      return;
    }

    // Respuesta 2xx pero con error semántico en el body (caso defensivo)
    if (data && typeof data === "object" && "error" in data) {
      toast.error(String((data as { error: unknown }).error));
      setFormSaving(false);
      return;
    }

    if (data && typeof data === "object" && "warning" in data) {
      toast.success(String((data as { warning: unknown }).warning));
    } else {
      toast.success(`Usuario "${form.email}" creado`);
    }

    setDialogOpen(false);
    setForm(emptyUserForm);
    setFormSaving(false);
    // El usuario ya está creado y confirmado en server; refresh inmediato.
    await fetchUsers();
  };

  const openEdit = (u: UserWithRole) => {
    setEditingUser(u);
    setEditForm({ nombre: u.nombre, apellido: u.apellido, email: u.email, whatsapp: "" });
    setEditDialogOpen(true);
  };

  const handleEditUser = async () => {
    if (!editingUser) return;
    setFormSaving(true);
    const { error } = await supabase.from("profiles").update({
      nombre: editForm.nombre,
      apellido: editForm.apellido,
      email: editForm.email,
      ...(editForm.whatsapp ? { whatsapp: editForm.whatsapp } : {}),
    }).eq("id", editingUser.id);
    if (error) {
      toast.error("Error al actualizar perfil");
      setFormSaving(false);
      return;
    }
    toast.success("Perfil actualizado");
    setEditDialogOpen(false);
    setFormSaving(false);
    fetchUsers();
  };

  const handleDeleteUser = async (u: UserWithRole) => {
    if (!confirm(`¿Eliminar al usuario "${u.email}"? Se eliminará su perfil y rol. El usuario no podrá acceder más.`)) return;
    setSaving(u.id);
    // Remove role first, then profile
    if (u.role_id) {
      await supabase.from("user_roles").delete().eq("id", u.role_id);
    }
    const { error } = await supabase.from("profiles").delete().eq("id", u.id);
    if (error) {
      toast.error("Error al eliminar usuario: " + error.message);
      setSaving(null);
      return;
    }
    toast.success(`Usuario "${u.email}" eliminado`);
    setSaving(null);
    fetchUsers();
  };

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      const matchesSearch = !q || u.email.toLowerCase().includes(q) || u.nombre.toLowerCase().includes(q) || u.apellido.toLowerCase().includes(q);
      const matchesStatus = filterStatus === "all" || (filterStatus === "con_rol" && u.role !== null) || (filterStatus === "sin_rol" && u.role === null);
      const createdDate = u.created_at.slice(0, 10);
      const matchesFrom = !dateFrom || createdDate >= dateFrom;
      const matchesTo = !dateTo || createdDate <= dateTo;
      return matchesSearch && matchesStatus && matchesFrom && matchesTo;
    });
  }, [users, search, filterStatus, dateFrom, dateTo]);

  // Guard: esperar resolución del rol antes de decidir qué renderear.
  if (roleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Guard: editores ven mensaje claro en vez de un panel roto.
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
        <div className="border rounded-lg p-10 text-center bg-muted/30">
          <Lock className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <h2 className="text-lg font-semibold mb-1">No tenés permisos para gestionar usuarios</h2>
          <p className="text-sm text-muted-foreground">
            Esta sección está reservada para administradores.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{users.length} usuarios</Badge>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setForm(emptyUserForm)}><Plus className="mr-2 h-4 w-4" /> Crear Usuario</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Crear Usuario</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Email *</Label>
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="usuario@email.com" />
                </div>
                <div>
                  <Label>Contraseña *</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Nombre *</Label>
                    <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                  </div>
                  <div>
                    <Label>Apellido</Label>
                    <Input value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Rol (opcional)</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue placeholder="Sin rol" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="control_entradas">Control Entradas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleCreateUser} disabled={formSaving}>
                  {formSaving ? "Creando..." : "Crear Usuario"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Usuario</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Email</Label>
              <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nombre</Label>
                <Input value={editForm.nombre} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })} />
              </div>
              <div>
                <Label>Apellido</Label>
                <Input value={editForm.apellido} onChange={(e) => setEditForm({ ...editForm, apellido: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input value={editForm.whatsapp} onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })} placeholder="+54 11 1234 5678" />
            </div>
            <Button className="w-full" onClick={handleEditUser} disabled={formSaving}>
              {formSaving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/30">
        <div className="space-y-1">
          <Label>Buscar</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Email, nombre..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Estado</Label>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="con_rol">Con rol asignado</SelectItem>
              <SelectItem value="sin_rol">Pendiente (sin rol)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Desde</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Hasta</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">Mostrando {filtered.length} de {users.length} usuarios</p>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead>Rol actual</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No se encontraron usuarios</TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nombre} {u.apellido}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(u.created_at).toLocaleDateString("es-AR")}</TableCell>
                    <TableCell>
                      {u.role ? (
                        <Badge variant={ROLE_COLORS[u.role] as any}>{ROLE_LABELS[u.role]}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Sin rol</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {saving === u.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Select value="" onValueChange={(role) => assignRole(u.id, role as AppRole)}>
                              <SelectTrigger className="w-[140px] h-8 text-xs">
                                <div className="flex items-center gap-1">
                                  <UserCog className="h-3 w-3" />
                                  <span>Asignar rol</span>
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="editor">Editor</SelectItem>
                                <SelectItem value="control_entradas">Control Entradas</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {u.role && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeRole(u.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteUser(u)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
