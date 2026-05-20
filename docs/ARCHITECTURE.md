# Arquitectura

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite 5 + TypeScript 5 |
| Estilos | Tailwind CSS v3 + shadcn/ui (Radix) |
| Estado server | TanStack Query v5 |
| Routing | react-router-dom v6 |
| Animaciones | framer-motion |
| Iconos | lucide-react |
| Forms | react-hook-form + zod |
| Backend (BaaS) | Supabase (Auth, Postgres, Storage, Edge Functions) |
| Pagos | MercadoPago (Sandbox actualmente) |
| QR | `qrcode.react` (generación) + `qr-scanner` (escaneo) |
| Hosting frontend | Cualquier host estático (Vercel / Cloudflare Pages / Netlify) sirviendo `dist/` |
| Hosting backend | Supabase (proyecto Postgres + Edge Functions) |
| Build / dev | Vite + npm |

## Estructura de carpetas

```
src/
├── App.tsx                    # Router principal
├── main.tsx                   # Entry
├── index.css                  # Tokens HSL + utilidades
├── assets/                    # Imágenes locales (logo, flamingo, etc.)
├── components/
│   ├── ui/                    # shadcn primitives (NO editar)
│   ├── waterpark/             # Componentes del sitio público
│   ├── admin/                 # Sidebar admin
│   ├── comprar/               # Calendario de compra
│   └── eventos/               # Listado eventos
├── hooks/
│   ├── useAuth.ts             # Sesión Supabase
│   ├── useUserRole.ts         # Rol del usuario
│   ├── use-toast.ts
│   └── use-mobile.tsx
├── integrations/supabase/
│   ├── client.ts              # NO editar (autogenerado)
│   └── types.ts               # NO editar (autogenerado)
├── lib/utils.ts               # cn() helper
├── pages/
│   ├── Index.tsx              # Home (compone secciones de waterpark/)
│   ├── Comprar.tsx, MiCuenta.tsx, etc.
│   ├── admin/                 # Panel admin
│   ├── staff/Scanner.tsx
│   └── legal/                 # Páginas legales
└── test/                      # Vitest

supabase/
├── config.toml                # SOLO bloques [functions.*]
└── functions/
    ├── create-payment/index.ts
    └── webhook-mercadopago/index.ts
```

## Decisiones clave

- **Tokens HSL siempre**: nunca colores Tailwind hardcodeados en componentes. Toda paleta vive en `index.css` (`:root { --water-500: 199 89% 48%; }`) y se referencia con `hsl(var(--water-500))`.
- **Roles separados de profiles**: tabla `user_roles` aparte para evitar escalada de privilegios.
- **RLS en toda tabla pública**: ninguna tabla con datos sensibles permite acceso `anon`.
- **Edge functions con `verify_jwt = false`** declarado explícitamente en `supabase/config.toml`; cada función valida el bearer del caller adentro cuando corresponde (patrón usado en `create-payment` y `admin-create-user`).
- **Idempotencia en webhook MP**: chequeo por `mp_payment_id` antes de generar QR para evitar duplicados.
- **Repositorio independiente**: desarrollo local con `git` estándar. Sin sync automático con herramientas externas.

## Flujo de datos

```text
Cliente compra        Webhook MP                  Cliente ve QR
─────────────         ──────────                  ─────────────
Comprar.tsx           webhook-mercadopago         MiCuenta.tsx
   │                       │                            │
   ├─► create-payment ──► MercadoPago                   │
   │                       │                            │
   │                       ├─► UPDATE compras           │
   │                       └─► INSERT codigos_qr ◄──────┤
   │                                                    │
   └─► /compra-exitosa ─────────────────────────────────┘

Staff valida          Admin monitorea
────────────          ───────────────
Scanner.tsx           AdminTickets.tsx
   │                       │
   ├─► SELECT codigos_qr   ├─► SELECT compras + qr
   └─► UPDATE usado=true   └─► Métricas en tiempo real
```
