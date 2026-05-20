# Infinito Water Park — Web + Ticketera

Sitio web público mobile-first y plataforma de venta de entradas con pagos MercadoPago, QR únicos por entrada, panel administrativo y validación de acceso para staff.

**Producción**: https://infinito.grupocentro.digital

---

## Stack

- **Frontend**: React 18 · TypeScript 5 · Vite 5
- **UI**: Tailwind CSS v3 · shadcn/ui (Radix) · lucide-react
- **Estado / Data**: TanStack Query · React Router v6 · react-hook-form + zod
- **Backend**: Supabase (Postgres · Auth · Storage · Edge Functions)
- **Pagos**: MercadoPago (Checkout Pro)
- **QR**: `qr-scanner` (cámara) + `qrcode.react` (render)
- **Testing**: Vitest + Testing Library

---

## Instalación local

El proyecto usa **npm** con `package-lock.json` versionado.

```bash
npm install
npm run dev        # dev server en http://localhost:8080
npm run build      # build de producción a dist/
npm run lint
npm run test       # vitest run
```

---

## Variables de entorno

Copiar [`.env.example`](./.env.example) como `.env` y completar:

| Variable | Tipo | Destino |
|---|---|---|
| `VITE_SUPABASE_PROJECT_ID` | pública | frontend |
| `VITE_SUPABASE_URL` | pública | frontend |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | pública (anon key) | frontend |

Los **secrets server-side** (`MP_ACCESS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`) se configuran en **Supabase Dashboard → Edge Functions → Secrets**. Nunca van en `.env` del frontend.

---

## Documentación

Antes de modificar el código, leer en este orden:

- [CLAUDE.md](./CLAUDE.md) — Guía maestra del proyecto
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — Stack, estructura, decisiones
- [docs/DATABASE.md](./docs/DATABASE.md) — Esquema completo + RLS
- [docs/AUTH_AND_ROLES.md](./docs/AUTH_AND_ROLES.md) — Autenticación y RBAC
- [docs/TICKETING_FLOW.md](./docs/TICKETING_FLOW.md) — Compra → MP → QR → validación
- [docs/MERCADOPAGO.md](./docs/MERCADOPAGO.md) — Sandbox → Producción
- [docs/EDGE_FUNCTIONS.md](./docs/EDGE_FUNCTIONS.md) — Funciones serverless
- [docs/ADMIN_PANEL.md](./docs/ADMIN_PANEL.md) — Panel administrativo
- [docs/DESIGN_SYSTEM.md](./docs/DESIGN_SYSTEM.md) — Tokens, paleta water, componentes
- [docs/CONVENTIONS.md](./docs/CONVENTIONS.md) — Convenciones de código
- [docs/CREDENTIALS.md](./docs/CREDENTIALS.md) — Cuentas de prueba (no usar en producción)

---

## Características

- 🎟️ Compra online con calendario y precios diferenciados semana/finde
- 🎉 Compra directa de eventos
- 🔐 QR único por entrada (UUID v4) con validación atómica server-side y auditoría append-only
- 📱 Escáner para staff (cámara + ingreso manual) con vibración mobile
- 👥 RBAC (admin / editor / control_entradas)
- 📊 Dashboard administrativo con métricas en tiempo real
- 💳 MercadoPago integrado (actualmente Sandbox)
- 🎨 Estética mobile-first, paleta water, glassmorphism

---

## Estructura

```
src/
├── App.tsx                    Router principal
├── main.tsx                   Entry
├── index.css                  Tokens HSL + utilidades Tailwind
├── assets/                    Imágenes locales (logo, flamingo, fondos)
├── components/
│   ├── ui/                    Primitives shadcn (no editar)
│   ├── waterpark/             Sitio público
│   ├── admin/                 Sidebar admin
│   └── comprar/               Calendario de compra
├── hooks/                     useAuth, useUserRole, use-mobile, use-toast
├── integrations/supabase/     Cliente Supabase (autogenerado, no editar)
├── lib/utils.ts
├── pages/
│   ├── Index.tsx              Home pública
│   ├── Comprar.tsx, MiCuenta.tsx, CompraExitosa.tsx
│   ├── admin/                 Panel admin
│   ├── staff/Scanner.tsx
│   └── legal/                 Páginas legales
└── test/                      Vitest

supabase/
├── config.toml
├── functions/
│   ├── create-payment/        Crea preferencia MercadoPago
│   ├── webhook-mercadopago/   Recibe notificación de pago, genera QR
│   └── admin-create-user/     Crea usuarios desde el panel admin sin afectar sesión
└── migrations/                Esquema + RLS + triggers + RPC validar_qr
```

---

## Estado del proyecto

Activo y en desarrollo continuo. Antes de pasar a producción real:

1. **Aplicar migraciones SQL** pendientes en `supabase/migrations/` desde el SQL editor de Supabase.
2. **Desplegar edge functions** modificadas/nuevas en `supabase/functions/`.
3. **Cambiar `MP_ACCESS_TOKEN`** a token productivo de MercadoPago (hoy en Sandbox).
4. **Configurar webhook URL** en el dashboard de MercadoPago apuntando a `webhook-mercadopago`.
5. **Activar email confirmation** y captcha robusto si se permite registro público abierto.
6. **Subir asset OG** (`public/og-infinito.jpg`, 1200×630) para previews sociales.

---

## Deploy

- **Frontend**: cualquier host estático (Vercel, Cloudflare Pages, Netlify) que sirva `dist/` tras `npm run build`. Variables de entorno `VITE_*` deben estar configuradas en el dashboard del host.
- **Backend**: Supabase (Postgres + Auth + Edge Functions). El proyecto vive en `gmhiewleimbezmkfdutj.supabase.co`.
- **Dominio productivo**: https://infinito.grupocentro.digital
