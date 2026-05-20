# Autenticación y Roles

## Métodos de autenticación

Sólo **email + contraseña** habilitado actualmente. El registro requiere captcha matemático del lado cliente (ver `mem://features/seguridad-registro-captcha`).

- **Confirmación de email**: deshabilitada (auto-confirm OFF en producción → habría que activarla si se quiere verificación).
- **HIBP password check**: no configurado.
- **Social login**: no habilitado.

## Hooks

### `useAuth()` — `src/hooks/useAuth.ts`
Retorna `{ user, session, loading, signOut }`. Usa `onAuthStateChange` + `getSession()` (orden correcto).

### `useUserRole()` — `src/hooks/useUserRole.ts`
Lee el rol desde `user_roles` y expone:
```ts
{
  role: 'admin' | 'editor' | 'control_entradas' | null,
  isAdmin, isEditor, isStaff, isAdminOrEditor,
  loading
}
```

## Roles (RBAC)

| Rol | Permisos |
|---|---|
| `admin` | Acceso total: dashboard, todos los CRUD, gestión de usuarios y roles, escáner QR |
| `editor` | CRUD de contenido (atracciones, eventos, slides, contenido_web, tipos_entrada). NO gestiona usuarios. |
| `control_entradas` | Sólo acceso a `/staff/scanner` para validar QR |

### Asignación
- `davidcorreosl@gmail.com` → admin automático vía trigger `handle_new_user`.
- Otros usuarios → manualmente desde `/admin/usuarios` (panel CRUD).

### Cómo se enforce
- **DB**: todas las RLS usan `has_role(auth.uid(), 'admin')` (función SECURITY DEFINER).
- **UI**: `useUserRole()` para mostrar/ocultar navegación y proteger rutas.

## Flujos UI

### Registro (`/registro`)
1. Captcha matemático obligatorio.
2. `supabase.auth.signUp({ email, password, options: { data: { nombre, apellido } } })`.
3. Trigger crea row en `profiles`.

### Login (`/login`)
- `supabase.auth.signInWithPassword`.
- Redirect a `/`.

### Reset password
- `/reset-password` debe existir como ruta pública.
- Llamada: `resetPasswordForEmail(email, { redirectTo: `${origin}/reset-password` })`.
- En esa página: `supabase.auth.updateUser({ password })`.

## Seguridad

- `anon` denegado en `profiles`, `compras`, `user_roles`.
- Nunca chequear rol desde localStorage / sessionStorage / hardcoded.
- Siempre usar `has_role()` en políticas RLS, nunca subqueries directas a `user_roles` (recursión).
