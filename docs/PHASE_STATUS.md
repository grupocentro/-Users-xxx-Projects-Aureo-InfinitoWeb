# PHASE_STATUS.md — Estado de fases del proyecto

> Última actualización: 2026-05-20 (post-Fase 4)

Este documento registra el estado real de cada fase del proyecto **Reorganización Admin Dual Mode** de Infinito Water Park.

## Vista general

| Fase | Nombre | Estado | Cerrada |
|------|--------|--------|---------|
| 0 | Infraestructura BD + deps | ✅ Cerrada | 2026-05-20 |
| 1 | Selector premium + dual layout | ✅ Cerrada | 2026-05-20 |
| 2 | Modo Sistema completo | ✅ Cerrada | 2026-05-20 |
| 3 | Modo Web: CRUDs nuevos | ✅ Cerrada | 2026-05-20 |
| 4 | Web Analytics | ✅ Cerrada | 2026-05-20 |
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

**Estado**: ✅ Cerrada técnicamente.

### Entregado

- 2 archivos nuevos:
  - `src/lib/analytics.ts` — helper privacy-first con `trackEvent`, `fireAndForget`. Sesión anónima UUID v4 en localStorage con expiración por 30min de inactividad. Detección device/browser/referrer. INSERT silent-fail con try/catch a `web_analytics_events`. NO se envía email, nombre, teléfono, IP ni user_id.
  - `src/pages/admin/web/Analytics.tsx` — dashboard con 9 KPIs, 4 gráficos (visitas por día, device pie, top páginas barras horizontales, ranking implícito en tablas), 4 tablas (top páginas, top botones, origen del tráfico, actividad reciente últimos 50). Filtro DateRange (hoy/7d/30d/mes/custom).
- 9 archivos modificados:
  - Páginas instrumentadas: `Index.tsx`, `Eventos.tsx`, `Comprar.tsx` (page_view).
  - Componentes instrumentados: `WhatsAppButton.tsx`, `Footer.tsx`, `MapaSection.tsx`, `EntradasSection.tsx`, `ProximosEventos.tsx`.
  - Navegación: `App.tsx`, `AdminSidebarWeb.tsx`, `WebDashboard.tsx`.

### Eventos disparándose en producción

| Tipo | Disparadores actuales |
|------|-----------------------|
| `page_view` | Index · Eventos · Comprar (mount) |
| `whatsapp_click` | WhatsAppButton flotante · Footer phone link |
| `contacto_click` | Footer CTA "Escribinos" |
| `mapa_click` | MapaSection info card · MapaSection CTA principal |
| `comprar_entrada_click` | EntradasSection mobile · EntradasSection desktop · EventDetailSheet "Comprar" |
| `evento_click` | EventCard de ProximosEventos |

### Bundle (post-Fase 4)

- Bundle inicial: **653.42 kB** (gzip 189.72 kB) — +2.8 kB vs Fase 3 (helper analytics minúsculo, casi todo lazy).
- Analytics page lazy: **13.88 kB**.

### Decisiones tomadas

- Sesiones únicas se calculan en cliente como `new Set(session_id)` sobre los eventos del período (límite 5000).
- Origen del tráfico se agrupa en cliente (Directo / Interno / Google / Instagram / Facebook / Twitter/X / Otros) para legibilidad.
- Si tracking falla por cualquier razón → `console.warn` y la UX sigue normal.
- `trackEvent` retorna `Promise<void>` que **nunca throws** (silent fail garantizado).

### Pendientes menores conocidos

- ℹ️ `banner_click` / `slide_click` / `oferta_click` están en el type union de eventos pero no tienen disparadores aún. Se activarán cuando los hero slides y ofertas se rendericen en el sitio público (hoy sólo existen en admin).
- ℹ️ `button_click` genérico disponible vía helper pero sin disparadores explícitos en el sitio público todavía.
- ℹ️ Para volúmenes > 5000 eventos en un período, el dashboard muestra una nota al pie. Mitigación futura: paginar o usar agregaciones server-side.

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
- **Eventos analytics sin disparadores aún** (`banner_click`, `slide_click`, `oferta_click`): tipos declarados en `analytics.ts` y soportados por el dashboard, pero los elementos correspondientes aún no se renderizan en el sitio público. Instrumentar cuando se conecten al home/landing.

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
