# ROLE_MATRIX.md — Matriz de roles y accesos

Sistema de 3 roles + 1 superadmin del proyecto Infinito Water Park.

## Roles definidos

| Rol | Tabla `user_roles.role` | Descripción |
|-----|--------------------------|-------------|
| `admin` | `'admin'` | Acceso completo a Web y Sistema. Puede crear usuarios y asignar roles. |
| `editor` | `'editor'` | Acceso al Panel Web (contenido público). Sin acceso a operaciones financieras. |
| `staff` / `control_entradas` | `'control_entradas'` | Validación de QR en la puerta del parque. |
| **superadmin** | (rol `admin` + email reservado) | `davidcorreosl@gmail.com` — asignación automática al registrarse, vía trigger `handle_new_user()`. |

## Cómo se asignan los roles

- Trigger `handle_new_user()` en `auth.users` crea automáticamente `profiles` para todo nuevo usuario.
- Si el email es `davidcorreosl@gmail.com`, el trigger también inserta `user_roles(user_id, role='admin')`.
- Otros roles se asignan manualmente desde `/admin/ticketera/usuarios` (admin-only) usando la edge function `admin-create-user` o el panel de gestión.

## Matriz de acceso por ruta

| Ruta | `admin` | `editor` | `control_entradas` | Sin rol | Anon |
|------|:-------:|:--------:|:------------------:|:-------:|:----:|
| `/` (home) | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/eventos`, `/comprar`, públicas | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/login`, `/registro`, `/reset-password` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/mi-cuenta` | ✅ | ✅ | ✅ | ✅ (sólo propio) | ❌ |
| `/admin/seleccionar` | ✅ | ✅ | ↪ bypass `/staff/scanner` | ↪ `/` | ❌ |
| `/admin/web/*` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `/admin/ticketera/*` | ✅ | ❌ ↪ selector | ❌ | ❌ | ❌ |
| `/admin/sistemas/*` | ✅ | ❌ ↪ selector | ❌ | ❌ | ❌ |
| `/staff/scanner` | ✅ | ❌ | ✅ | ❌ | ❌ |
| `/admin/sistema/*` (legacy) | ↪ `/admin/ticketera/*` | ↪ idem | ↪ idem | ↪ idem | ↪ idem |

Leyenda: ✅ acceso, ❌ denegado, ↪ redirect.

## Matriz de acceso por funcionalidad

| Funcionalidad | `admin` | `editor` | `control_entradas` |
|---------------|:-------:|:--------:|:------------------:|
| **PANEL WEB** | | | |
| Editar contenido_web | ✅ | ✅ | ❌ |
| CRUD eventos / atracciones / actividades | ✅ | ✅ | ❌ |
| CRUD hero_slides | ✅ | ✅ | ❌ |
| CRUD noticias / ofertas / calendario | ✅ | ✅ | ❌ |
| Ver dashboard Web (counts de contenido) | ✅ | ✅ | ❌ |
| Ver analytics web (futuro Fase 4) | ✅ | ✅ | ❌ |
| **PANEL TICKETERA** | | | |
| Ver TicketeraDashboard (KPIs financieros) | ✅ | ❌ | ❌ |
| Ver ventas / compras (todos los estados) | ✅ | ❌ | ❌ |
| Ver tickets QR (emitidos / usados) | ✅ | ❌ | ❌ |
| Ver historial de validaciones | ✅ | ❌ | ❌ |
| Ver reportes operativos + exports | ✅ | ❌ | ❌ |
| CRUD tipos de entrada / precios | ✅ | ❌ | ❌ |
| **PANEL SISTEMAS (admin-only)** | | | |
| Ver SistemasDashboard (placeholders) | ✅ | ❌ | ❌ |
| Acceder a módulos Usuarios/Roles/Personal/Administración/Seguridad/Configuración | ✅ | ❌ | ❌ |
| **OPERATIVO** | | | |
| Escanear QR | ✅ | ❌ | ✅ |
| Validar entradas (RPC validar_qr) | ✅ | ❌ | ✅ |
| **GESTIÓN DE USUARIOS** | | | |
| Listar usuarios | ✅ | ❌ | ❌ |
| Crear usuarios (vía edge function) | ✅ | ❌ | ❌ |
| Asignar/cambiar roles | ✅ | ❌ | ❌ |
| Editar perfil propio | ✅ | ✅ | ✅ |

## Cómo se hace el chequeo de roles

### En el cliente (UI)

```ts
import { useUserRole } from "@/hooks/useUserRole";

const { isAdmin, isAdminOrEditor, isStaff } = useUserRole();
```

- `useUserRole()` lee `user_roles` (no `profiles`, no localStorage).
- Si el usuario tiene múltiples roles, devuelve el de **mayor prioridad** (`admin` > `editor` > `control_entradas`).
- Los Layouts (`WebLayout`, `SistemaLayout`) hacen el guard y redirigen si no corresponde.

### En la BD (RLS)

```sql
-- Patrón estándar
CREATE POLICY "Admin/editor escriben noticias" ON public.noticias
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
```

- Función `has_role(_user_id, _role)` SECURITY DEFINER — base de toda autorización.
- **Nunca** chequear roles desde `profiles` ni desde valores en el cliente.

### En edge functions

```ts
// Patrón en admin-create-user
const { data: isAdminRow } = await supabaseAdminClient.rpc("has_role", {
  _user_id: caller.id,
  _role: "admin"
});
if (!isAdminRow) return new Response("Forbidden", { status: 403 });
```

## Gestión de roles desde el panel

- **Crear usuario**: solo desde `/admin/ticketera/usuarios` (admin-only). Llama a edge function `admin-create-user` que usa `service_role` server-side.
- **Asignar rol**: misma página, dropdown de roles.
- **Cambiar rol**: requiere ser admin. No se puede cambiar el rol propio si sos el único admin (guard pendiente para Fase 5).

## Edge cases

- **Usuario con múltiples roles**: la tabla `user_roles` tiene `UNIQUE(user_id, role)`, no `UNIQUE(user_id)` — un usuario puede tener varios. `useUserRole` toma el de mayor prioridad.
- **Superadmin se queda sin rol**: el trigger `handle_new_user()` reasigna `admin` a `davidcorreosl@gmail.com` cada vez que se registra. Si por error se elimina su fila en `user_roles`, basta con re-registrarse (no práctico) o insertar manualmente vía SQL editor de Supabase.
- **Rol eliminado mientras está logueado**: la próxima recarga de `useUserRole` lo deja sin acceso al panel. El AdminLayout lo redirige.

## Antipatrones

- ❌ Chequear rol desde `profiles.email == 'davidcorreosl@gmail.com'` para bypass.
- ❌ Guardar rol en `localStorage` y confiar en él.
- ❌ Mostrar UI con datos sensibles asumiendo el rol y dejar que RLS los bloquee silenciosamente. Si la UI requiere admin → guard explícito.
- ❌ Asignar `admin` desde el frontend (siempre vía edge function con `service_role`).
