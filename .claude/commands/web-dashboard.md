---
description: Trabajar exclusivamente en Modo Web / Contenido público
---

# /web-dashboard — Foco en Panel Web

Acotá el trabajo al **Modo Web** del panel admin (`/admin/web/*`).

## Scope permitido

- `src/pages/admin/web/*` — WebDashboard, Contenido, Slides, Noticias, Ofertas, Calendario, Eventos, Atracciones, Actividades
- `src/components/admin/AdminSidebarWeb.tsx`
- `src/pages/admin/AdminContenido.tsx`, `AdminSlides.tsx`, `AdminEventos.tsx`, `AdminAtracciones.tsx`, `AdminActividades.tsx` (mientras sigan montados en `/admin/web/*`)
- Migraciones nuevas relacionadas con tablas web (`noticias`, `ofertas`, `calendario`, `contenido_web`) sólo si están en la fase autorizada.

## Scope prohibido (sin autorización explícita)

- ❌ Cualquier cosa en `/admin/sistema/*`
- ❌ `src/pages/staff/Scanner.tsx`
- ❌ Edge functions
- ❌ Migraciones cerradas
- ❌ Tablas financieras (`compras`, `codigos_qr`, `qr_validaciones`)

## Permisos por rol

- `admin` y `editor` acceden al Modo Web.
- Cualquier query/UI debe respetar `isAdminOrEditor`.

## Datos

- Sólo datos reales. Sin mocks.
- Las tablas `noticias`/`ofertas`/`calendario` se crearon en Fase 0 pero **no están en `types.ts` autogenerado**. Usar el patrón `supabase.from("noticias" as never)` (mismo cast que `qr_validaciones`).
- Lectura pública de tablas Web: el sitio público sólo ve contenido `publicado`/`activa`/vigente (RLS lo enforce).

## Reglas de salida

- Build verde al cerrar.
- No introducir lint nuevos.
- Reporte estándar (`docs/AI_WORKFLOW.md`).
