---
description: Revisar migraciones, RLS, RPC, tablas y queries de Supabase
---

# /supabase-check — Auditoría Supabase

Inventario rápido del estado de la base de datos del proyecto Infinito Water Park.

## 1. Migraciones aplicadas

Listar `supabase/migrations/` por fecha. Indicar:
- Cuáles son **cerradas** (no se tocan): toda fecha anterior a la fase en curso.
- Cuáles son **abiertas** (modificables sólo si la fase actual lo autoriza).
- Detectar gaps (timestamps no consecutivos pueden indicar conflictos).

## 2. Tablas (resumen)

Listar las tablas en `public` con:
- Si están en `types.ts` autogenerado o no (las nuevas requieren `as never` cast).
- Estado de RLS (debe estar **siempre habilitado** en `public.*`).

Tablas esperadas al cierre de Fase 2:
- `profiles`, `user_roles`
- `atracciones`, `actividades`, `eventos`, `tipos_entrada`, `hero_slides`, `contenido_web`
- `compras`, `codigos_qr`
- `qr_validaciones` (append-only)
- `noticias`, `ofertas`, `calendario` (Fase 0, sin UI todavía)
- `puntos_acceso` (Fase 0, seedeado con 4 puntos)
- `web_analytics_events` (Fase 0, append-only)

## 3. RLS por tabla

Revisar políticas críticas:
- ✅ `compras`, `codigos_qr`, `qr_validaciones`, `profiles`, `user_roles`, `web_analytics_events`: **denegar `anon`** para SELECT (excepto INSERT público en analytics).
- ✅ `noticias`, `ofertas`: lectura pública sólo si `estado='publicado'`/`'activa'` + vigencia.
- ✅ `calendario`: lectura pública total.
- ✅ Escritura: solo admin/editor según corresponda.

## 4. RPC / Functions SECURITY DEFINER

Revisar:
- `has_role(_user_id uuid, _role app_role) returns boolean` — base de toda autorización.
- `handle_new_user()` — trigger en `auth.users`.
- `validar_qr(_uuid_code text)` — wrapper backwards-compat.
- `validar_qr(_uuid_code text, _metadata jsonb)` — versión completa con metadata extra del cliente.
- `calcular_total_compra()` + triggers de pricing server-side (Fase pricing).
- `set_updated_at()` — helper reutilizable.
- `sanitize_web_analytics_metadata()` — defensa en profundidad sobre `web_analytics_events`.

## 5. Edge functions

- `create-payment` — crea preferencia MercadoPago.
- `webhook-mercadopago` — recibe notificación, marca compra `aprobado`, genera QRs.
- `admin-create-user` — crea usuarios con service_role (verifica `has_role(admin)` del caller).

**No modificar** sin autorización explícita. Ver `docs/PROTECTED_AREAS.md`.

## 6. Storage buckets

- `eventos` (público).

## 7. Detección de problemas comunes

- Migraciones con timestamp duplicado.
- Tablas sin RLS habilitado en `public`.
- Políticas RLS que permiten lectura/escritura a `anon` accidentalmente.
- RPC sin `SET search_path = public` (riesgo de search path injection).
- Service role usado en frontend (NUNCA).

## Formato de salida

Tabla por sección con estado ✅ / ⚠️ / ❌. Al final, si hay riesgos: listarlos con severidad.
