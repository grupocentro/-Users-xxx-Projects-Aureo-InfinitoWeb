# Base de Datos

Postgres gestionado en Supabase. Todas las tablas viven en el schema `public`.

## Enum

```sql
create type public.app_role as enum ('admin', 'editor', 'control_entradas');
```

## Tablas

### `profiles`
Datos extendidos del usuario (1:1 con `auth.users`).

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid (PK) | = auth.users.id |
| email | text | |
| nombre | text | |
| apellido | text | |
| whatsapp | text | |
| created_at / updated_at | timestamptz | |

**RLS**:
- `anon`: SELECT denegado explícitamente.
- Usuario: SELECT/UPDATE solo el propio (`auth.uid() = id`).
- Admin: SELECT todos.
- INSERT/DELETE bloqueado (el trigger `handle_new_user` crea el row).

### `user_roles`
Tabla separada de roles. **Nunca** guardar rol en `profiles`.

| Columna | Tipo |
|---|---|
| id | uuid (PK) |
| user_id | uuid |
| role | app_role |
| created_at | timestamptz |

**RLS**:
- `anon`: denegado.
- Usuario: ver el propio.
- Admin: CRUD completo.

### `atracciones`
Catálogo de atracciones del parque.

Campos: `nombre`, `descripcion`, `ubicacion`, `imagen_url`, `intensidad`, `edad_min`, `duracion`, `rating`, `reviews`, `tags` (jsonb), `badge`, `accent`, `orden`, `estado`.

**RLS**: lectura pública, escritura admin/editor.

### `actividades`
Tabla independiente de atracciones (eventos puntuales con fecha/hora).

Campos: `nombre`, `descripcion`, `ubicacion`, `imagen_url`, `fecha`, `hora`, `duracion`, `intensidad`, `rating`, `reviews`, `orden`, `estado`.

### `eventos`
Eventos especiales (fiestas, edición temática).

Campos: `nombre`, `tagline`, `descripcion`, `edicion`, `fecha`, `hora_inicio`, `hora_fin`, `precio`, `imagen_url`, `emoji`, `gradiente`, `estado`.

### `tipos_entrada`
Tipos de entrada al parque con precio diferenciado.

| Columna | Tipo | Notas |
|---|---|---|
| nombre | text | "General", "Niño", "VIP", etc. |
| precio_semana | numeric | Lun–Jue |
| precio_finde | numeric | Vie–Dom |
| features | jsonb | Lista de beneficios |
| emoji, tag | text | |
| highlight | boolean | Destacar visualmente |
| estado | text | activo/inactivo |

### `hero_slides`
Stories del Hero (estilo Instagram). CRUD + drag&drop ordering en `/admin/slides`.

Campos: `tag`, `title`, `subtitle`, `location`, `rating`, `image_url`, `video_url`, `accent`, `cta_text`, `orden`, `estado`.

### `contenido_web`
Textos editables del sitio (key/value).

| clave | tipo | valor |
|---|---|---|
| string única | text/html/image | contenido |

### `compras`
Cabecera de cada operación de compra.

| Columna | Tipo |
|---|---|
| id | uuid |
| user_id | uuid (auth.users) |
| tipo_entrada_id | uuid (nullable, FK lógico) |
| evento_id | uuid (nullable, FK lógico) |
| cantidad | int |
| total | numeric |
| estado_pago | text (`pendiente` / `aprobado` / `rechazado`) |
| mp_payment_id | text |

**RLS**:
- `anon`: denegado.
- Usuario: ver/insertar las propias.
- Admin: ver todas, actualizar.
- DELETE bloqueado.

### `codigos_qr`
Un row por entrada individual (si `compras.cantidad = 4`, hay 4 rows aquí).

| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | |
| compra_id | uuid | |
| uuid_code | uuid | **Lo que se imprime en el QR** |
| usado | boolean | default false |
| usado_at | timestamptz | |
| usado_por | uuid | id del staff que escaneó |

**RLS**:
- Usuario: ver los propios (vía join con `compras.user_id`).
- Staff (`control_entradas`): SELECT + UPDATE para validar.
- Admin: SELECT all + DELETE.
- INSERT admin/editor (en la práctica lo hace el webhook con service role).

## Funciones

### `has_role(_user_id uuid, _role app_role) returns boolean`
```sql
SECURITY DEFINER
STABLE
set search_path = public
```
Base de toda RLS. **Nunca** reemplazarla por subquery directa a `user_roles` (causa recursión).

### `handle_new_user()`
Trigger en `auth.users` AFTER INSERT.
- Inserta row en `profiles` con datos de `raw_user_meta_data`.
- Si el email es `davidcorreosl@gmail.com`, le asigna rol `admin` automáticamente.

## Storage

- Bucket `eventos` (público): imágenes subidas desde el admin.

## Reglas de migración

- Toda modificación de DB pasa por una migración SQL.
- Nunca editar `src/integrations/supabase/types.ts` (se regenera solo).
- Validaciones temporales (ej. `expire_at > now()`) → usar triggers, NUNCA CHECK constraints.
- Nunca crear triggers en schemas reservados (`auth`, `storage`, `realtime`, `supabase_functions`, `vault`).
