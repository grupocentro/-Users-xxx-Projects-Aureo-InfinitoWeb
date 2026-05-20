# CLAUDE.md — Guía maestra para Claude Code

> Este archivo es el punto de entrada para asistentes de IA (Claude Code, Cursor, etc.).
> Leelo primero. Después consultá `docs/` según la tarea.

---

## 1. Resumen del proyecto

**Infinito Water Park** — Sitio web + plataforma de venta de entradas con QR para un parque acuático en Argentina.

- **Dominio productivo**: https://infinito.grupocentro.digital
- **Stack**: React 18 + Vite 5 + TypeScript 5 + Tailwind v3 + shadcn/ui + Supabase (Auth + Postgres + Storage + Edge Functions) + MercadoPago (actualmente Sandbox).
- **Entorno de trabajo**: desarrollo local con VS Code / Claude Code. Gestor de paquetes: npm (`package-lock.json` versionado).
- **Idioma**: Español (Argentina). Toda la UI y los mensajes deben estar en español rioplatense.

## 2. Características principales

1. **Sitio público** con secciones: Hero (stories estilo Instagram), Atracciones, Entradas, Mapa, Eventos, Galería.
2. **Compra online de entradas** (`/comprar`) con calendario (febrero 2026) y precios diferenciados semana/finde.
3. **Compra directa de eventos** (sin calendario, sin opción de menores).
4. **Generación de códigos QR únicos** por entrada tras pago aprobado por MercadoPago.
5. **Panel "Mi Cuenta"** (`/mi-cuenta`) donde el cliente ve sus QR y los puede compartir por WhatsApp.
6. **Escáner QR Staff** (`/staff/scanner`) con validación en tiempo real (3 estados: válido / ya usado / inválido).
7. **Panel admin** (`/admin`) con dashboard de métricas, CRUD de contenido, gestión de usuarios y roles, control de tickets.

## 3. Reglas inviolables

- **Diseño**: estética app móvil, paleta water (azul/aqua/blanco), glassmorphism, border-radius 28px, bordes blancos de 5px. Usar SIEMPRE tokens semánticos de `index.css` y `tailwind.config.ts`, NUNCA colores hardcodeados (`text-white`, `bg-blue-500`) en componentes.
- **Assets**: usar imágenes/videos oficiales de infinitowaterpark.com siempre que sea posible.
- **Conversión**: priorizar compra directa a `/comprar`. NO crear links de consulta por WhatsApp para tickets.
- **Roles**: 3 niveles (`admin`, `editor`, `control_entradas`) en tabla `user_roles`, protegidos vía función `has_role()` SECURITY DEFINER. Nunca chequear rol desde localStorage ni desde la tabla `profiles`.
- **Seguridad**: acceso `anon` está explícitamente denegado en `profiles`, `compras`, `user_roles`.
- **No editar nunca**:
  - `src/integrations/supabase/client.ts`
  - `src/integrations/supabase/types.ts`
  - `.env`
  - `supabase/config.toml` (solo bloques de funciones, no settings de proyecto)

## 4. Mapa de rutas

> **Importante**: a partir de la Fase 1 el panel admin opera en doble modo (`/admin/web/*` y `/admin/sistema/*`) con un selector intermedio. Las rutas viejas siguen funcionando vía `<Navigate replace>`.

```
/                              Home
/eventos                       Listado de eventos
/login                         Login premium
/registro                      Registro (con captcha matemático)
/reset-password                Recuperar contraseña
/comprar                       Calendario + compra parque o evento
/compra-exitosa                Confirmación post-pago
/mi-cuenta                     Mis tickets (QR + WhatsApp)

/staff/scanner                 Escáner QR (rol control_entradas/admin)

/admin/seleccionar             Selector premium post-login (cards Web/Sistema)

/admin/web                     WebLayout (admin + editor)
  ├─ /admin/web                WebDashboard (counts de contenido)
  ├─ /admin/web/contenido
  ├─ /admin/web/slides
  ├─ /admin/web/noticias       (Fase 3)
  ├─ /admin/web/ofertas        (Fase 3)
  ├─ /admin/web/calendario     (Fase 3)
  ├─ /admin/web/eventos
  ├─ /admin/web/atracciones
  └─ /admin/web/actividades

/admin/sistema                 SistemaLayout (admin)
  ├─ /admin/sistema            SistemaDashboard (25+ KPIs, 8 gráficos)
  ├─ /admin/sistema/ventas
  ├─ /admin/sistema/tickets
  ├─ /admin/sistema/entradas
  ├─ /admin/sistema/validaciones (historial QR completo)
  ├─ /admin/sistema/reportes   (CSV + PDF)
  └─ /admin/sistema/usuarios

# Legacy → redirect (no romper)
/admin             → /admin/seleccionar
/admin/eventos     → /admin/web/eventos      (idem atracciones/actividades/slides/contenido)
/admin/ventas      → /admin/sistema/ventas    (idem tickets/entradas/usuarios)

/aviso-legal, /reglamento, /preguntas-frecuentes,
/terminos-y-condiciones, /politicas-de-privacidad
```

## 5. Base de datos (resumen)

Tablas en `public`: `profiles`, `user_roles`, `atracciones`, `actividades`, `eventos`, `tipos_entrada`, `hero_slides`, `contenido_web`, `compras`, `codigos_qr`.

Detalle completo y RLS → `docs/DATABASE.md`.

Funciones SQL:
- `has_role(_user_id uuid, _role app_role) returns boolean` — SECURITY DEFINER, base de toda autorización.
- `handle_new_user()` — trigger en `auth.users` que crea `profiles` y asigna rol admin a `davidcorreosl@gmail.com`.

Storage buckets: `eventos` (público).

## 6. Edge Functions

- `create-payment` — crea preferencia MercadoPago.
- `webhook-mercadopago` — recibe notificación de pago, verifica idempotencia, marca `compras.estado_pago='aprobado'` y genera N `codigos_qr` (uno por entrada).

Detalle → `docs/EDGE_FUNCTIONS.md`.

## 7. Cuentas de prueba

Ver `docs/CREDENTIALS.md` (NO commitear credenciales reales fuera de ese archivo).

## 8. Documentos detallados

| Archivo | Contenido |
|---|---|
| `docs/ARCHITECTURE.md` | Arquitectura general, stack, decisiones |
| `docs/DATABASE.md` | Esquema completo + RLS por tabla |
| `docs/AUTH_AND_ROLES.md` | Flujo de auth y RBAC |
| `docs/TICKETING_FLOW.md` | Flujo end-to-end de compra y validación QR |
| `docs/ADMIN_PANEL.md` | Cada sección del panel admin |
| `docs/DESIGN_SYSTEM.md` | Tokens, paleta water, glassmorphism, componentes |
| `docs/EDGE_FUNCTIONS.md` | Detalle de cada edge function |
| `docs/CREDENTIALS.md` | Cuentas de prueba Admin/Staff |
| `docs/MERCADOPAGO.md` | Integración Sandbox → Producción |
| `docs/CONVENTIONS.md` | Convenciones de código y commits |
| `docs/AI_WORKFLOW.md` | **Cómo trabaja Claude Code en este repo (fases, comandos, reportes)** |
| `docs/PHASE_STATUS.md` | **Estado actual de cada fase del proyecto admin dual mode** |
| `docs/PROTECTED_AREAS.md` | **Zonas sensibles que NO se tocan sin autorización explícita** |
| `docs/ROLE_MATRIX.md` | **Matriz de roles y accesos por panel** |

## 9. Workflow recomendado para IA

1. Leer `CLAUDE.md` + `docs/PHASE_STATUS.md` + `docs/PROTECTED_AREAS.md` antes de tocar nada.
2. Verificar tokens de diseño antes de tocar estilos.
3. Para cambios de DB → migración SQL nueva (no editar tipos a mano, no tocar migraciones cerradas).
4. Para auth/roles → usar `has_role()` en RLS, nunca lógica cliente.
5. **Trabajar por fases**: cada fase requiere autorización explícita del usuario antes de empezar.
6. **Ejecutar `npm run build`** al cerrar cada fase. Si rompe el build, la fase no está cerrada.
7. Mantener rutas legacy con `<Navigate replace>` — nunca romper bookmarks externos.
8. No usar datos mock: si una métrica no tiene data, mostrar `EmptyState` real, nunca inventar.

## 10. Trabajo por fases — reglas inviolables

- **Una fase a la vez**. No mezclar scopes.
- **Esperar autorización explícita** del usuario antes de empezar cada fase (patrón "Autorizo Fase X").
- **No tocar zonas protegidas** sin permiso (ver `docs/PROTECTED_AREAS.md`):
  - Scanner QR (`src/pages/staff/Scanner.tsx`)
  - Edge functions de MercadoPago (`supabase/functions/create-payment/`, `webhook-mercadopago/`)
  - Migraciones cerradas (todas las anteriores a la fase autorizada)
  - `src/integrations/supabase/client.ts` y `types.ts`
  - `.env`
- **Respetar Fase 0, 1 y 2 cerradas**. No reescribir lo que ya quedó verde en build.
- **No introducir lint nuevo**. El conteo de Fase 2 es 25 problemas (15 errors + 10 warnings) — todos preexistentes. Si se agregan más, hay que justificarlos o eliminarlos.
- **Reportar al cerrar cada fase** con el formato definido en `docs/AI_WORKFLOW.md`.

## 11. Workspace Claude Code

- **Comandos slash**: ver `.claude/commands/` (fase-check, sistema-dashboard, web-dashboard, qa-infinito, supabase-check, no-romper).
- **Skills**: ver `.claude/skills/` (infinito-product, infinito-supabase, infinito-ui-premium, infinito-qa).
- **Permisos**: ver `.claude/settings.json` — incluye `deny` de archivos sensibles.
