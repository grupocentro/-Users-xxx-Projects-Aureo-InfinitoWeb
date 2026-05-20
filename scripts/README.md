# scripts/ — herramientas operativas

Scripts one-shot que requieren credenciales sensibles (service_role) y se ejecutan localmente. **Ningún secreto vive en código** — los scripts toman los valores de variables de entorno temporales.

## setup-users.mjs

Bootstrap idempotente de los usuarios iniciales del sistema:

- `davidcorreosl@gmail.com` — superadmin
- `qr1@infinitowaterpark.com`, `qr2@infinitowaterpark.com`, `qr3@infinitowaterpark.com` — control_entradas

### Uso

```bash
# Desde la raíz del proyecto:
SUPABASE_URL="https://<project-ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
node scripts/setup-users.mjs
```

### Dónde obtener cada valor

- **`SUPABASE_URL`**: Supabase → Project Settings → API → "Project URL".
  (Si ya tenés `VITE_SUPABASE_URL` exportada en tu shell, el script también la acepta.)
- **`SUPABASE_SERVICE_ROLE_KEY`**: Supabase → Project Settings → API → "service_role" key.
  ⚠️ **NUNCA** lo guardes en `.env` del frontend ni en código. Sólo pasalo como env var al ejecutar este script.

### Qué hace el script

1. Para cada usuario:
   - Si no existe en `auth.users` → lo crea con `email_confirm: true` (puede loguearse inmediatamente).
   - Si ya existe → actualiza password (resetea al temporal) y `user_metadata`.
2. Verifica/inserta `profiles` con nombre/apellido/email (el trigger `handle_new_user` ya lo hace para usuarios nuevos; este paso es defensivo).
3. Hace `upsert` en `user_roles` con el rol correspondiente. Idempotente gracias al `UNIQUE(user_id, role)`.
4. Reporta el estado final por usuario y un resumen al cierre.

### Salida esperada

```
======================================================================
Infinito Water Park — Bootstrap de usuarios
======================================================================
URL:     https://xxx.supabase.co
Users:   4

✓ davidcorreosl@gmail.com               [created] roles=admin
✓ qr1@infinitowaterpark.com             [created] roles=control_entradas
✓ qr2@infinitowaterpark.com             [created] roles=control_entradas
✓ qr3@infinitowaterpark.com             [created] roles=control_entradas

======================================================================
Resumen
======================================================================
OK:     4/4
Errors: 0/4
```

### Re-ejecuciones

El script es **idempotente**: correrlo de nuevo simplemente actualiza passwords + metadata y deja los roles igual. Útil para resetear contraseñas temporales rápido.

### Después de correr

1. Ejecutá `scripts/verify-users.sql` en el SQL Editor de Supabase para confirmar el estado.
2. Probá login en `http://localhost:8080/login` con cada email.
3. Recordá a los usuarios cambiar su contraseña temporal después del primer login.

---

## verify-users.sql

Auditoría sólo-lectura del estado de los usuarios. Ejecutar en **Supabase → SQL Editor** después de correr `setup-users.mjs`.

Devuelve 7 queries:

1. Existencia en `auth.users` con `email_confirmed_at` y `last_sign_in_at`.
2. Presencia en `public.profiles`.
3. **Roles asignados en `public.user_roles`** (el más importante).
4. Sanity check de `has_role()` — la función que enforce todos los guards.
5. Usuarios sin rol (debería estar vacío).
6. Roles cruzados inesperados (debería estar vacío).
7. Totales del sistema.

---

## Reglas operativas

- ❌ **Nunca commitear el `service_role`** ni guardarlo en `.env`.
- ❌ **Nunca loguear passwords** (el script no lo hace; mantenelo así si lo extendés).
- ✅ Borrar el comando del historial de tu shell después de correr el script si la sesión queda persistida (`history -d N` en bash, `\rm ~/.zsh_history` extremo).
- ✅ Cambiar contraseñas temporales después del primer login.
- ✅ Si necesitás agregar más usuarios, extendé el array `USERS` en `setup-users.mjs` y re-corré.
