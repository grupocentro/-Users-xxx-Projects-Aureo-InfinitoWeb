# PHASE_STATUS.md — Estado de fases del proyecto

> Última actualización: 2026-05-20 (post-Fase 3)

Este documento registra el estado real de cada fase del proyecto **Reorganización Admin Dual Mode** de Infinito Water Park.

## Vista general

| Fase | Nombre | Estado | Cerrada |
|------|--------|--------|---------|
| 0 | Infraestructura BD + deps | ✅ Cerrada | 2026-05-20 |
| 1 | Selector premium + dual layout | ✅ Cerrada | 2026-05-20 |
| 2 | Modo Sistema completo | ✅ Cerrada | 2026-05-20 |
| 3 | Modo Web: CRUDs nuevos | ✅ Cerrada | 2026-05-20 |
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

**Estado**: ✅ Cerrada técnicamente.

### Entregado

- 5 archivos reescritos/extendidos:
  - `src/pages/admin/AdminContenido.tsx` — CRUD key-value sobre `contenido_web` con búsqueda y filtro por tipo. Detecta UNIQUE violation con mensaje claro.
  - `src/pages/admin/web/Noticias.tsx` — CRUD completo con upload de imagen (bucket `eventos/noticias/`), estados borrador/publicado/archivado, filtro y reorden subir/bajar swap.
  - `src/pages/admin/web/Ofertas.tsx` — CRUD con descuento %, vigencia (calculada en cliente: vigente/futura/vencida/sin_vigencia), doble filtro independiente, validación `vigencia_desde ≤ vigencia_hasta`.
  - `src/pages/admin/web/Calendario.tsx` — CRUD por fecha (UNIQUE) con 6 colores preset + hex libre, modificador de precio numérico libre, filtro futuro/pasado/todos.
  - `src/pages/admin/web/WebDashboard.tsx` — extendido con 8 KPIs reales en 2 secciones (Contenido publicado / Catálogo) + lista de próximos 5 días especiales + grid de 8 accesos rápidos premium.

### Bundle (post-Fase 3)

- Bundle inicial: **650.63 kB** (gzip 188.58 kB) — sin inflar vs Fase 2.
- Cada CRUD lazy-loaded: AdminContenido 6.97 kB · WebDashboard 6.67 kB · Calendario 8.95 kB · Noticias 10.59 kB · Ofertas 12.13 kB.

### Decisiones tomadas

- ⚠️ **No se agregó campo `estado`** a `contenido_web` (el schema actual es key-value y no lo tiene). No inventamos campos.
- ⚠️ **`punto_acceso_id` queda en `null`** en Scanner hasta que se implemente un selector visual (Scanner ya envía `_metadata` desde el mini-ajuste pre-Fase 3, pero sin punto seleccionado).
- ⚠️ **`precio_modificador` del calendario se persiste pero no se aplica al flujo `/comprar`** todavía. La conexión con pricing dinámico es trabajo de una fase futura.

### Pendientes menores conocidos

- ℹ️ Reorden de noticias es subir/bajar swap (mismo patrón vecino-a-vecino). Drag-and-drop real queda como mejora opcional.
- ℹ️ Bucket `eventos` se reutiliza para imágenes de noticias y ofertas con prefijos. Si se quiere separar, requiere migración de bucket.

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

## Pendientes globales del proyecto (no específicos de una fase)

### 🔴 Crítico — BLOQUEANTE para producción
- **x-signature MercadoPago**: el webhook `webhook-mercadopago/index.ts` valida amount comparison e idempotencia, pero **no verifica la firma HMAC** del payload entrante. Cualquiera con el `payment_id` puede forzar reverificación. Requiere implementar verificación HMAC con `MP_WEBHOOK_SECRET` cargado en Supabase Secrets. **No autorizar deploy productivo sin esto.**

### 🟠 Pendientes menores
- **Selector visual de `punto_acceso_id` en Scanner**: la RPC `validar_qr(text, jsonb)` y el frontend ya soportan metadata extra. Falta UI en `Scanner.tsx` para que el operador seleccione el punto antes de escanear. Sin esto, las validaciones registran `punto_acceso_id: null` en `qr_validaciones.metadata`.
- **`precio_modificador` del calendario sin conectar a `/comprar`**: el campo se persiste en la tabla `calendario` (Fase 0 + CRUD Fase 3) pero el flujo de compra no lo lee. Conectarlo requiere ajustar `Comprar.tsx` y posiblemente la función SQL `calcular_total_compra()`. Pendiente de definición de fase.

### ℹ️ Informativos
- Vulnerabilidad transitiva `dompurify` (XSS, moderate) vía jspdf. No nos afecta (sólo usamos `autoTable` con datos tabulares, sin HTML embebido). Mitigable con upgrade a `jspdf@4.x` cuando sea estable.
- Bundle inicial 650 kB sigue arriba del warning de Vite (500 kB). Mitigación pendiente para Fase 5 (code-splitting adicional + manualChunks).

---

## Cómo actualizar este documento

Cada vez que una fase cambia de estado:

1. Actualizar la tabla "Vista general".
2. Mover la fase a la sección correcta (cerrada / en curso / pendiente).
3. Completar el bloque "Entregado" con archivos y métricas reales.
4. Listar "Pendientes menores conocidos" honestamente.
5. Actualizar fecha "Última actualización" arriba del documento.

> **No marcar una fase como cerrada si el build no pasa**. La cerrazón es verificable.
