---
description: Trabajar exclusivamente en Modo Sistema / Ticketera
---

# /sistema-dashboard — Foco en Panel Ticketera

Acotá el trabajo al **Modo Sistema** del panel admin (`/admin/sistema/*`).

## Scope permitido

- `src/pages/admin/sistema/*` — SistemaDashboard, Ventas, Tickets, Entradas, Validaciones, Reportes, Usuarios
- `src/components/admin/AdminSidebarSistema.tsx`
- `src/components/admin/` (componentes reutilizables: MetricCard, ChartCard, StatusBadge, ExportButton, EmptyState, LoadingState, ErrorState, DateRangeFilter)
- `src/lib/export-csv.ts`, `src/lib/export-pdf.ts`, `src/lib/status-labels.ts`, `src/lib/date-range.ts`

## Scope prohibido (sin autorización explícita)

- ❌ `src/pages/staff/Scanner.tsx`
- ❌ `supabase/functions/create-payment/`
- ❌ `supabase/functions/webhook-mercadopago/`
- ❌ Migraciones cerradas (todas las anteriores a la fase actual)
- ❌ `src/pages/admin/web/*` (eso es `/web-dashboard`)
- ❌ Cualquier ruta legacy

## Permisos por rol

- Sólo `admin` accede al Modo Sistema. Validar guard `isAdmin` en cualquier componente nuevo.
- Editor no debe ver datos financieros.

## Datos

- Sólo datos reales de Supabase. **Sin mocks**.
- Cuando una métrica no se puede calcular → `<EmptyState>` real.
- Las queries deben respetar RLS (admin lee todo).

## Reglas de salida

- Si el trabajo toca código → al cerrar la fase, correr `npm run build` y verificar no se introduzcan lint nuevos.
- Reportar formato estándar (ver `docs/AI_WORKFLOW.md`).
