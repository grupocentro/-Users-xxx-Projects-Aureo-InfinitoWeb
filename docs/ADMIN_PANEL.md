# Panel Administrativo (`/admin`)

Protegido por `useUserRole().isAdminOrEditor`. Layout en `src/pages/admin/AdminLayout.tsx` con sidebar (`src/components/admin/AdminSidebar.tsx`).

## Secciones

### `/admin` — Dashboard
`AdminDashboard.tsx` — Métricas en tiempo real:
- Total de ventas, ingresos, tickets usados/sin usar.
- Gráficos de evolución diaria.
- Listados rápidos de últimas compras.

### `/admin/eventos`
CRUD de tabla `eventos`. Subida de imagen a bucket `eventos`. Campos visuales: emoji, gradiente, edición temática.

### `/admin/atracciones`
CRUD de `atracciones`. Tags como chips, control de intensidad, edad mínima, rating.

### `/admin/actividades`
CRUD de `actividades` (independiente de atracciones). Tarjetas con bordes 20px en el frontend.

### `/admin/entradas`
CRUD de `tipos_entrada`. Precios diferenciados semana/finde, lista de features (jsonb), highlight visual.

### `/admin/ventas`
Vista de compras (`compras` + join con `profiles` y `tipos_entrada`).

### `/admin/contenido`
Edita pares clave/valor de `contenido_web` (textos reutilizables del sitio).

### `/admin/slides`
CRUD de `hero_slides` con **drag&drop ordering**. Soporta imagen o video. Cada slide es una "story" del Hero.

### `/admin/usuarios` (solo admin)
- Lista todos los `profiles` con su rol.
- Cambiar rol de un usuario (`admin` / `editor` / `control_entradas` / sin rol).
- **Eliminar usuario**: borra `profiles` pero NO la cuenta de `auth.users` (limitación deliberada).

### `/admin/tickets`
Monitoreo de QR vendidos y escaneados. Tabs: Todos / Parque / Eventos. Ver `docs/TICKETING_FLOW.md` paso 6.

## Reglas de UI

- Mantener consistencia con la estética water (no introducir paletas nuevas en admin).
- Tablas con shadcn `Table`. Forms con `react-hook-form` + `zod`.
- Loaders y toasts en cada operación CRUD.
- Confirm dialog (`AlertDialog`) en cualquier acción destructiva.
