# PROTECTED_AREAS.md — Zonas sensibles del proyecto

Zonas del código y la BD que **NO se tocan sin autorización explícita** del usuario. Estos bloqueos también están aplicados como `permissions.deny` en `.claude/settings.json` para defensa en profundidad.

## 1. Integraciones críticas — MercadoPago

| Archivo | Razón | Severidad |
|---------|-------|-----------|
| `supabase/functions/create-payment/index.ts` | Crea preferencias de pago. Validaciones de seguridad ya implementadas (cantidad, total, estado). | 🔴 Crítica |
| `supabase/functions/webhook-mercadopago/index.ts` | Recibe notificaciones de pago. Idempotencia, amount comparison, manejo de `payment_mismatch`. **x-signature pendiente — BLOQUEANTE para producción.** | 🔴 Crítica |

Cualquier cambio acá impacta directamente la facturación y la generación de QRs.

## 2. Scanner QR

| Archivo | Razón | Severidad |
|---------|-------|-----------|
| `src/pages/staff/Scanner.tsx` | Validación física en la puerta. Usa RPC `validar_qr`. Funcional, en producción. | 🔴 Crítica |

**Excepción autorizable**: cuando se decida en una fase futura mandar `_metadata` extendido (punto_acceso_id, device_type) a la RPC. Hasta entonces, no tocar.

## 3. RPC `validar_qr`

Funciones SQL:
- `validar_qr(_uuid_code text)` — wrapper backwards-compat.
- `validar_qr(_uuid_code text, _metadata jsonb)` — versión completa.

| Razón | Severidad |
|-------|-----------|
| Atomicidad garantizada por `FOR UPDATE OF q`. Cualquier modificación puede introducir race conditions en validación de tickets. | 🔴 Crítica |

Si se requiere extender (ej: enforcement de `fecha_invalida`), crear migración nueva con `CREATE OR REPLACE FUNCTION`. **Nunca modificar la migración cerrada de la RPC.**

## 4. Supabase Auth + RLS

| Archivo / Recurso | Razón | Severidad |
|-------------------|-------|-----------|
| `src/integrations/supabase/client.ts` | Configuración del cliente, claves públicas. | 🟠 Alta |
| `src/integrations/supabase/types.ts` | **Autogenerado**. Editar a mano genera divergencia con la BD. Usar `as never` cast en queries para tablas nuevas. | 🟠 Alta |
| `src/hooks/useAuth.ts` | Flujo de auth con Supabase. | 🟠 Alta |
| `src/hooks/useUserRole.ts` | Lectura de roles desde `user_roles`. Toma el de mayor prioridad si hay múltiples. | 🟠 Alta |
| Política RLS de `profiles` / `compras` / `user_roles` | Bloquea `anon` SELECT. **No modificar.** | 🔴 Crítica |
| Función `has_role(_user_id, _role)` | Base de toda autorización. **No modificar.** | 🔴 Crítica |

## 5. Edge function `admin-create-user`

| Archivo | Razón | Severidad |
|---------|-------|-----------|
| `supabase/functions/admin-create-user/index.ts` | Usa `service_role`. Valida `has_role(admin)` antes de operar. **Nunca exponer service_role al frontend.** | 🔴 Crítica |

## 6. Migraciones cerradas

Todas las migraciones cuya fecha sea anterior a la fase en curso están **cerradas** y no se pueden modificar:

| Fecha | Migración | Estado |
|-------|-----------|--------|
| 20260221 | Migraciones iniciales del schema | 🔒 Cerrada |
| 20260222 | Ajustes iniciales | 🔒 Cerrada |
| 20260518 | Pricing server-side + QR validación atómica | 🔒 Cerrada |
| 20260520 | Modo Web tablas + puntos_acceso + analytics | 🔒 Cerrada |

> Si se necesita modificar algo de la BD, **crear migración nueva** con timestamp posterior, nunca editar las existentes.

## 7. Variables de entorno

| Archivo | Razón | Severidad |
|---------|-------|-----------|
| `.env` | Contiene tokens reales (Supabase, MercadoPago). | 🔴 Crítica — gitignored |
| `.env.*` (excepto `.env.example`) | Variantes de entorno. | 🔴 Crítica |
| `.env.example` | Template público, sin valores reales. | 🟢 Editable |

## 8. Configuración Supabase

| Archivo | Excepción permitida |
|---------|---------------------|
| `supabase/config.toml` | Solo se pueden agregar/modificar bloques `[functions.<nombre>]` para nuevas edge functions. **No tocar settings de proyecto, auth, db, etc.** |

## 9. Rutas legacy

Las siguientes redirecciones deben mantenerse funcionando:

```
/admin                  → /admin/seleccionar
/admin/eventos          → /admin/web/eventos
/admin/atracciones      → /admin/web/atracciones
/admin/actividades      → /admin/web/actividades
/admin/slides           → /admin/web/slides
/admin/contenido        → /admin/web/contenido
/admin/ventas           → /admin/sistema/ventas
/admin/tickets          → /admin/sistema/tickets
/admin/entradas         → /admin/sistema/entradas
/admin/usuarios         → /admin/sistema/usuarios
```

**No remover ni alterar** sin autorización explícita. Externals pueden tener bookmarks o links a las rutas viejas.

## 10. Operaciones destructivas Bash

Bloqueadas en `.claude/settings.json`:

- `rm -rf *` — borrado recursivo.
- `git push --force*` — sobrescribe historia remota.
- `git reset --hard*` — descarta cambios locales sin posibilidad de recovery.

Si una de éstas es necesaria, el usuario debe autorizarla explícitamente caso por caso.

---

## Cómo agregar nuevas zonas protegidas

1. Documentar el archivo/recurso en este documento con razón y severidad.
2. Agregar entrada correspondiente en `.claude/settings.json` → `permissions.deny`.
3. Mencionar en `CLAUDE.md` sección 3 (Reglas inviolables).
4. Actualizar memorias persistentes si afecta el plan global.

## Cómo desproteger una zona temporalmente

Solo el usuario puede autorizarlo. Procedimiento:

1. Usuario indica explícitamente: `"Autorizo modificar <archivo> para <tarea X>"`.
2. Claude Code confirma la autorización antes de tocar el archivo.
3. Al terminar la fase, el bloqueo vuelve a estar activo (no se modifica `settings.json`).
