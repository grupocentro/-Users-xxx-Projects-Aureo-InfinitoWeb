# PHASE_STATUS.md — Estado de fases del proyecto

> Última actualización: 2026-05-20

Este documento registra el estado real de cada fase del proyecto **Reorganización Admin Dual Mode** de Infinito Water Park.

## Vista general

| Fase | Nombre | Estado | Cerrada |
|------|--------|--------|---------|
| 0 | Infraestructura BD + deps | ✅ Cerrada | 2026-05-20 |
| 1 | Selector premium + dual layout | ✅ Cerrada | 2026-05-20 |
| 2 | Modo Sistema completo | ✅ Cerrada | 2026-05-20 |
| 3 | Modo Web: CRUDs nuevos | ⏳ Pendiente de autorización | — |
| 4 | Web Analytics | ⏳ Pendiente de autorización | — |
| 5 | QA final + polish | ⏳ Pendiente de autorización | — |

> El estado de "cerrada" refleja la realidad técnica (build verde y código mergeado). La aprobación operativa final (deploy producción + QA en runtime) es una etapa posterior independiente.

---

## Fase 0 — Infraestructura BD + dependencias

**Estado**: ✅ Cerrada técnicamente.

### Entregado

- 3 migraciones SQL nuevas:
  - `20260520120000_modo_web_tablas.sql` — `noticias`, `ofertas`, `calendario` + helper `set_updated_at()`.
  - `20260520120100_puntos_acceso_y_validar_qr_v2.sql` — tabla `puntos_acceso` seedeada + `validar_qr(text, jsonb)` con wrapper backwards-compat.
  - `20260520120200_web_analytics_events.sql` — tabla append-only con trigger de sanitización PII.
- Dependencias npm: `papaparse@5.5.3`, `jspdf@2.5.2`, `jspdf-autotable@3.8.4`, `@types/papaparse@5.5.2`.
- Memorias persistidas en `~/.claude/projects/.../memory/`.

### Observaciones

- ⚠️ Vulnerabilidad `dompurify` (moderate XSS) transitiva de jspdf. No nos afecta (no usamos HTML embebido).
- Migraciones aplicadas en Supabase requieren confirmación operativa del usuario.

---

## Fase 1 — Selector premium + dual layout

**Estado**: ✅ Cerrada técnicamente.

### Entregado

- 12 archivos nuevos: hook `useAdminMode`, sidebars Web/Sistema, ModeSwitcher, PhasePlaceholder, AdminSelector, WebLayout/SistemaLayout, dashboards intermedios.
- Rediseño de `Login.tsx` con estética premium acuática.
- Reorganización completa de rutas en `App.tsx`:
  - Nuevas: `/admin/seleccionar`, `/admin/web/*`, `/admin/sistema/*`.
  - Legacy: redirects con `<Navigate replace>` para 10 rutas viejas.

### Permisos por rol

- `admin`: ambas cards habilitadas.
- `editor`: solo Web habilitada (Sistema con badge "Solo admin").
- `control_entradas`: bypass directo a `/staff/scanner`.
- Sin rol: redirect a `/`.

### Persistencia

- Modo persistido en `localStorage['infinito-admin-mode']` con sync entre tabs.

---

## Fase 2 — Modo Sistema completo

**Estado**: ✅ Cerrada técnicamente.

### Entregado

- 15 archivos nuevos:
  - Utilities: `src/lib/export-csv.ts`, `export-pdf.ts`, `date-range.ts`, `status-labels.ts`.
  - Componentes reutilizables (`src/components/admin/`): `MetricCard`, `ChartCard`, `DateRangeFilter`, `StatusBadge`, `ExportButton`, `EmptyState`, `LoadingState`, `ErrorState`.
  - Páginas (`src/pages/admin/sistema/`): `SistemaDashboard` (25+ KPIs, 8 gráficos, filtros), `Validaciones` (historial QR con 6 filtros + 4 gráficos + tabla expandible), `Reportes` (5 tabs con 9 reportes y export individual).
- 3 archivos modificados:
  - `AdminVentas.tsx`, `AdminTickets.tsx` — agregado `ExportButton`.
  - `App.tsx` — code-splitting completo con `lazy()` + `Suspense`.

### Bundle (code-splitting)

- Bundle inicial: **650 KB** (gzip 188 KB) — bajó de 1348 KB → 650 KB (−52%).
- jsPDF, recharts, autotable se cargan on-demand.

### Pendientes menores conocidos

- ⚠️ `punto_acceso` y `device_type` aparecen "—" en validaciones hasta que `Scanner.tsx` empiece a mandar el `_metadata` extendido. La RPC está lista para recibirlo.
- ⚠️ Bundle chunk `index` sigue > 500 KB (warning, no error). Mitigación posible en Fase 5.

---

## Fase 3 — Modo Web: CRUDs nuevos

**Estado**: ⏳ Pendiente de autorización.

### Alcance esperado

- Implementar CRUD funcional sobre tablas ya creadas en Fase 0:
  - `src/pages/admin/AdminContenido.tsx` — reemplazar placeholder con CRUD sobre `contenido_web`.
  - `src/pages/admin/web/Noticias.tsx` — CRUD sobre `noticias` (drag&drop orden, upload imagen).
  - `src/pages/admin/web/Ofertas.tsx` — CRUD sobre `ofertas` con vigencia y descuento.
  - `src/pages/admin/web/Calendario.tsx` — vista calendario con CRUD de etiquetas y modificadores de precio.
- Refactor opcional: hook `useCrudAdmin<T>` para reducir duplicación entre CRUDs.

### Pre-requisitos

- ✅ Tablas BD ya creadas (Fase 0).
- ✅ Sidebars Web con items mapeados (Fase 1).
- ✅ Placeholders existentes (Fase 1).

---

## Fase 4 — Web Analytics

**Estado**: ⏳ Pendiente de autorización.

### Alcance esperado

- Helper `src/lib/analytics.ts` con `trackEvent(type, payload)`.
- Instrumentación de páginas públicas (`Index`, `Comprar`, `Eventos`, Hero CTAs, etc).
- Nueva página `src/pages/admin/web/Analytics.tsx` con KPIs visitas, top páginas, top botones, mobile vs desktop.
- Detección de dispositivo y origen en cliente.
- Session ID anónimo (UUID v4) con expiración 30min en localStorage.

### Pre-requisitos

- ✅ Tabla `web_analytics_events` ya creada (Fase 0).
- ✅ Trigger de sanitización PII activo (Fase 0).
- ✅ RLS configurada (INSERT público, SELECT admin/editor).

---

## Fase 5 — QA final + polish

**Estado**: ⏳ Pendiente de autorización.

### Alcance esperado

- Code-splitting adicional para reducir bundle inicial < 500 KB.
- Empty states, loaders y transitions consistentes en todas las páginas admin.
- Verificación responsive mobile/tablet/desktop.
- Pruebas manuales del flujo completo (login → selector → modos → CRUDs → exports).
- Type check + lint final.
- Eliminación de archivos huérfanos (`AdminLayout.tsx` viejo, `AdminSidebar.tsx` viejo).

---

## Cómo actualizar este documento

Cada vez que una fase cambia de estado:

1. Actualizar la tabla "Vista general".
2. Mover la fase a la sección correcta (cerrada / en curso / pendiente).
3. Completar el bloque "Entregado" con archivos y métricas reales.
4. Listar "Pendientes menores conocidos" honestamente.
5. Actualizar fecha "Última actualización" arriba del documento.

> **No marcar una fase como cerrada si el build no pasa**. La cerrazón es verificable.
