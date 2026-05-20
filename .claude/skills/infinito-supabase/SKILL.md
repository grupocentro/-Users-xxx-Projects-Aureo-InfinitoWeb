---
name: infinito-supabase
description: Reglas de Supabase para Infinito Water Park. Activar cuando se trabaja con migraciones SQL, RLS, RPC, edge functions, queries del cliente, o cualquier interacción con la BD.
---

# Infinito Supabase — Reglas y patrones

## Archivos prohibidos

- ❌ `src/integrations/supabase/types.ts` — autogenerado. No editar a mano. Para tablas nuevas: cast `as never` en queries (`supabase.from("noticias" as never)`).
- ❌ `src/integrations/supabase/client.ts`.
- ❌ Migraciones cerradas: cualquier archivo en `supabase/migrations/` cuya fecha sea anterior a la fase actual.
- ❌ `supabase/config.toml` excepto bloques `[functions.*]`.
- ❌ `.env` y `.env.*` (excepto `.env.example`).

## Convenciones de migraciones

- Timestamp formato `YYYYMMDDHHMMSS_descripcion.sql`.
- Aditivas siempre: `CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `ALTER ... IF NOT EXISTS`.
- RLS **siempre habilitada** en tablas de `public.*`: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
- Índices explícitos para columnas que se filtran o ordenan en queries comunes.
- Comentarios al inicio explicando qué resuelve la migración.

## Reglas de RLS

| Tabla | SELECT anon | SELECT auth | Escritura |
|-------|-------------|-------------|-----------|
| `profiles` | ❌ | sólo propio + admin | sólo propio + admin |
| `user_roles` | ❌ | sólo propio | sólo admin |
| `compras` | ❌ | sólo propio + admin | sólo backend |
| `codigos_qr` | ❌ | sólo del comprador + admin | sólo backend |
| `qr_validaciones` | ❌ | admin + control_entradas | nadie (append-only via RPC) |
| `puntos_acceso` | ❌ | todo authenticated | sólo admin |
| `noticias`/`ofertas` | ✅ si `publicado`/`activa` vigente | admin/editor ven todo | admin/editor |
| `calendario` | ✅ todo | ✅ | admin/editor |
| `web_analytics_events` | ✅ INSERT (no SELECT) | INSERT + SELECT admin/editor | INSERT pública, sin UPDATE/DELETE |
| `contenido_web`, `hero_slides`, `eventos`, `atracciones`, `actividades`, `tipos_entrada` | ✅ lectura | ✅ | admin/editor |

## RPC / Functions SECURITY DEFINER

- `has_role(_user_id uuid, _role app_role) returns boolean` — base de TODA autorización.
  - Usar en RLS: `USING (public.has_role(auth.uid(), 'admin'))`.
  - **Nunca** chequear roles desde `profiles` o localStorage.

- `validar_qr(_uuid_code text)` — wrapper backwards-compat (delega a la versión de 2 args).
- `validar_qr(_uuid_code text, _metadata jsonb)` — versión completa. El cliente puede mandar `{ punto_acceso_id, punto_acceso, device_type, user_agent }`. Atomic via `FOR UPDATE OF q` (row lock).

- `calcular_total_compra()` + triggers `trg_compras_set_total`, `trg_compras_guard_estado` — pricing server-side. El cliente nunca decide `total`.

- `handle_new_user()` — trigger en `auth.users` que crea `profiles` y asigna rol admin a `davidcorreosl@gmail.com`.

- `set_updated_at()` — helper para triggers BEFORE UPDATE.

- `sanitize_web_analytics_metadata()` — defensa en profundidad sobre INSERT en `web_analytics_events`. Remueve campos PII.

## Edge functions

- `create-payment` — valida cantidad [1,100], total > 0, estado_pago='pendiente'. Crea preferencia MP. **No tocar sin autorización**.
- `webhook-mercadopago` — verifica idempotencia, compara amounts (`Math.abs(paid - total) < 0.01`), marca `aprobado` o `payment_mismatch`. ⚠️ **x-signature pendiente** (BLOQUEANTE para producción).
- `admin-create-user` — usa `service_role` server-side. Valida `has_role(admin)` del caller antes de operar. **Nunca exponer service_role al frontend.**

## Patrones de query desde el cliente

```ts
// ✅ Correcto: cast as never para tablas nuevas
const { data, error } = await supabase
  .from("qr_validaciones" as never)
  .select("id, resultado, created_at")
  .gte("created_at", fromIso);

// ✅ Correcto: respetar RLS — admin lee todo, otros ven lo propio
// (las políticas de la BD hacen el filtrado, no el cliente)

// ❌ INCORRECTO: no agregar .eq("user_id", currentUser) cuando RLS ya lo hace
// (redundante y oculta bugs de RLS)
```

## Storage

- Bucket `eventos` (público) — imágenes de eventos.

## Antipatrones críticos

1. ❌ **Service role en frontend**. Sólo en edge functions.
2. ❌ **Chequear roles en cliente sin validar en BD**. Cliente puede mentir.
3. ❌ **Confiar en query params como fuente de verdad** (ej: `?status=success` no implica que el pago se aprobó).
4. ❌ **Mockear datos**. Si no hay data, `EmptyState`.
5. ❌ **Editar `types.ts` a mano**.
6. ❌ **Tocar migraciones cerradas**.
