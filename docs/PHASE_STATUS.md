# PHASE_STATUS.md — Estado de fases del proyecto

> Última actualización: 2026-05-20 (post-Fase 5 + triple login + separación cliente/interno)

Este documento registra el estado real de cada fase del proyecto **Reorganización Admin Dual Mode** de Infinito Water Park (ahora **triple mode** tras la incorporación de Panel Sistemas).

## Cambios post-Fase 5 (out-of-cycle)

Después de cerrar Fase 5 se incorporaron dos features adicionales por autorización del usuario:

### Triple login con PIN gate (2026-05-20)
- `/login` rediseñado con PIN obligatorio previo y **expiración 60 segundos** sin login exitoso.
- Tres paneles visuales (Ticketera azul · Web turquesa · Sistemas violeta) en vez de dos.
- Listener `supabase.auth.onAuthStateChange` instalado en `main.tsx` que limpia el PIN al detectar `SIGNED_OUT`.
- Si el usuario llega a `/login` con sesión activa, redirige automáticamente a `/admin/seleccionar` sin pedir PIN.

### Renombre `/admin/sistema` → `/admin/ticketera`
- Por coherencia con el doble nombre "Sistemas" vs "Sistema": el panel financiero/operativo pasa a llamarse **Ticketera**.
- Archivos renombrados: `src/pages/admin/sistema/` → `ticketera/` (carpeta), `SistemaLayout.tsx` → `TicketeraLayout.tsx`, `SistemaDashboard.tsx` → `TicketeraDashboard.tsx`, `AdminSidebarSistema.tsx` → `AdminSidebarTicketera.tsx`.
- 7 redirects legacy nuevos: `/admin/sistema*` → `/admin/ticketera*`.

### Nuevo Panel Sistemas
- Ruta `/admin/sistemas` (plural) — admin-only.
- Layout `SistemasLayout.tsx`, dashboard `SistemasDashboard.tsx` con 6 módulos placeholder (Usuarios, Roles, Personal, Administración, Seguridad, Configuración).
- Sidebar dedicado `AdminSidebarSistemas.tsx` con tema violeta/índigo.
- Sin CRUDs reales todavía (decisión explícita del usuario para esta fase).
- `useAdminMode` extendido a `"web" | "ticketera" | "sistemas"` con normalización legacy `"sistema"` → `"ticketera"`.

### Separación Cliente / Interno (2026-05-20)
- **Login interno `/login`**: exclusivo para admin/editor/control_entradas. PIN obligatorio + triple panel + verificación de rol post-signIn.
- **Login cliente `/cliente/login`**: nueva ruta pública. Login simple sin PIN. Acepta `?redirect=<path>` con sanitización (bloquea rutas `/admin` y `/staff` como destino). Si el usuario tiene rol interno, muestra aviso sin signOut + atajo al login administrativo.
- **Registro cliente `/cliente/registro`**: nueva ruta pública. Reescrito en estética premium acuática. Post-registro redirige a `/cliente/login?just_registered=true`.
- **Legacy `/registro`**: redirige con `<Navigate replace>` a `/cliente/registro`.
- **Redirects públicos actualizados**: `Comprar.tsx`, `CompraExitosa.tsx`, `MiCuenta.tsx`, `ProximosEventos.tsx` ahora apuntan a `/cliente/login?redirect=<ruta_original>`.
- **`/login` interno**: si detecta sesión activa de un usuario sin rol interno, redirige a `/mi-cuenta` (antes lo mandaba al selector administrativo y se quedaba atrapado en `/`).
- **Sin migración nueva**: no se creó rol `cliente`. La ausencia de rol sigue representando al visitante.
- **Archivo huérfano**: `src/pages/Registro.tsx` viejo queda en disco pero ya no se importa desde ningún lado (la ruta `/registro` ahora redirige). Pendiente de eliminar en limpieza futura.

## Vista general

| Fase | Nombre | Estado | Cerrada |
|------|--------|--------|---------|
| 0 | Infraestructura BD + deps | ✅ Cerrada | 2026-05-20 |
| 1 | Selector premium + dual layout | ✅ Cerrada | 2026-05-20 |
| 2 | Modo Sistema completo | ✅ Cerrada | 2026-05-20 |
| 3 | Modo Web: CRUDs nuevos | ✅ Cerrada | 2026-05-20 |
| 4 | Web Analytics | ✅ Cerrada | 2026-05-20 |
| 5 | QA final + polish | ✅ Cerrada | 2026-05-20 |

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

**Estado**: ✅ Cerrada técnicamente.

### Entregado

- **Bundle optimizado**: agregado `manualChunks` en `vite.config.ts` separando 6 vendors pesados (react, supabase, tanstack, forms, dates, icons). Bundle inicial (entry `index.js`) bajó de **653 kB → 247 kB** (gzip 189 → 71 kB). Sin warning de Vite por chunks > 500 kB.
- **Archivos huérfanos eliminados**: `src/pages/admin/AdminLayout.tsx`, `src/components/admin/AdminSidebar.tsx`, `src/pages/admin/AdminDashboard.tsx` (los 3 confirmados sin imports activos antes de borrar).
- **AdminUsuarios.tsx**: comentario interno actualizado (mencionaba `AdminLayout` que ya no existe).
- **QA funcional**: 15 rutas pedidas verificadas en `App.tsx` + 10 redirects legacy intactos.
- **QA roles**: guards verificados en `WebLayout`, `SistemaLayout`, `AdminSelector`, `Scanner`. Matriz de roles confirmada (admin → ambos paneles, editor → sólo Web, control_entradas → bypass scanner, sin rol → home).
- **QA botones**: grep confirma sin handlers vacíos (`onClick={() => {}}`), sin botones decorativos sin acción, sin TODOs/FIXMEs en src.

### Bundle final (gzip entre paréntesis)

| Chunk | Tamaño | Cuándo se carga |
|-------|--------|-----------------|
| **`index` (entry)** | **246.69 kB** (71.48 kB) | Primer paint |
| `vendor-react` | 157.33 kB (51.55 kB) | Primer paint (requerido por entry) |
| `vendor-supabase` | 173.69 kB (45.84 kB) | Primera query Supabase |
| `vendor-dates` | 62.74 kB (18.38 kB) | Cuando se importa date-fns/react-day-picker |
| `vendor-icons` | 43.71 kB (9.99 kB) | Idem (compartido) |
| `vendor-tanstack` | 27.44 kB (8.60 kB) | Provider del root |
| `ChartCard` (recharts) | 374.19 kB (103.51 kB) | Sólo dashboards admin |
| `jspdf` + `html2canvas` | ~560 kB combinados | Sólo al hacer export PDF |

Primer paint útil del sitio público: ~404 kB (entry + vendor-react) = ~122 kB gzip. Antes de Fase 5 eran 653 kB / 189 kB gzip.

### QA técnico final

| Check | Resultado |
|-------|-----------|
| `npm run build` | ✅ Pasa en 2.88s |
| `npm run lint` | ⚠️ 25 problemas (15 errors, 10 warnings) — **idéntico al baseline**. No introducimos lint nuevo. |
| Archivos huérfanos | ✅ Eliminados los 3 confirmados |
| Bundle inicial < 500 kB | ✅ 247 kB |
| Sin handlers vacíos | ✅ |
| Sin TODOs/FIXMEs | ✅ |

### QA visual (limitación)

Verificación técnica completa. **QA visual en browser real (responsive mobile/tablet/desktop, flujos completos de login → selector → CRUDs → exports → scanner)** requiere ejecución manual del usuario sobre el dev server. No se puede certificar desde código.

### Pendientes que NO se resolvieron en Fase 5 (según autorización)

- 🔴 **x-signature MercadoPago** — declarado como NO resuelve en esta fase, documentado.
- 🟠 Selector visual `punto_acceso_id` en Scanner.
- 🟠 `precio_modificador` calendario → `/comprar`.
- ℹ️ `banner_click` / `slide_click` / `oferta_click` analytics — sin disparadores hasta que esos elementos estén en sitio público.

---

## Pendientes globales del proyecto (no específicos de una fase)

### ✅ Resuelto — x-signature MercadoPago (2026-05-20)
- **Verificación HMAC SHA-256 de `x-signature` implementada** en `webhook-mercadopago/index.ts` con anti-replay de ±5 minutos sobre `ts`.
- Helper `verifyMpSignature(paymentId, signatureHeader, requestIdHeader)` puro.
- Comparación timing-safe del hash (XOR + máscara, sin `===` directo).
- Modo gradual: si `MP_WEBHOOK_SECRET` no está cargado en Supabase Secrets, se loguea warning y se acepta (compat para el deploy). Una vez cargado el secret, la validación es estricta y cualquier firma inválida o `ts` fuera de ventana devuelve 401.
- **Pendiente operativo del usuario**: cargar `MP_WEBHOOK_SECRET` en Supabase Secrets antes del deploy productivo. La clave se obtiene en MP Dashboard → Tus integraciones → Webhooks → Configurar notificaciones → Clave secreta.

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
