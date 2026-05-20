# Convenciones

## Idioma
- **Toda UI, toast, label, mensaje de error**: español rioplatense (vos, no tú).
- Código, comentarios técnicos, nombres de variables: inglés.

## Naming
- Componentes React: `PascalCase.tsx`.
- Hooks: `useCamelCase.ts`.
- Tablas DB: `snake_case` plural (`compras`, `codigos_qr`).
- Columnas DB: `snake_case`.
- Edge functions: `kebab-case` (`create-payment`).

## Estructura de componentes
- Componentes de página → `src/pages/`.
- Componentes reutilizables del sitio público → `src/components/waterpark/`.
- Componentes del admin → `src/pages/admin/` y `src/components/admin/`.
- Primitives shadcn → `src/components/ui/` (NO editar).

## Imports
```tsx
// 1. React
import { useState } from "react";
// 2. Libs externas
import { motion } from "framer-motion";
// 3. Internos con alias @
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
// 4. Assets
import logo from "@/assets/infinito-logo.png";
```

## Estilos
- Tailwind para todo lo que sea posible.
- Style inline SOLO para valores dinámicos (gradientes, transforms calculados).
- Nunca colores literales. Siempre tokens CSS HSL.

## Forms
- `react-hook-form` + `zod`.
- Errores en español.

## Data fetching
- TanStack Query (`useQuery`, `useMutation`).
- Invalidar queries tras mutación.
- Toast en `onSuccess` y `onError`.

## RLS
- Toda tabla nueva → habilitar RLS + escribir políticas explícitas para SELECT/INSERT/UPDATE/DELETE.
- Denegar `anon` explícitamente si la tabla tiene datos sensibles.

## Edge functions
- Validar input con zod.
- CORS en TODAS las respuestas (incluso errores).
- Try/catch con log.
- Idempotencia en webhooks.

## Commits / GitHub
- Commits manuales y controlados (sin sync automático con herramientas externas).
- Avanzar por bloques chicos y revisables, no por refactors masivos mezclados con fixes críticos.
- Antes de empezar un bloque: `git pull` para evitar conflictos con trabajo de otros colaboradores.
- Un commit por bloque lógico, con mensaje claro de qué cambió y por qué.

## Testing
- Vitest configurado (`bunx vitest run`).
- Tests en `src/test/`.
- No es obligatorio para cada cambio pero se valora.

## Performance
- Lazy load de imágenes con `loading="lazy"`.
- Code splitting por rutas (React Router lo hace automático con `lazy()`).
- Evitar re-renders: `useMemo`, `useCallback` cuando aplique.

## SEO
- `<title>` < 60 chars con keyword.
- Meta description < 160 chars.
- Single `<h1>` por página.
- HTML semántico (`<header>`, `<main>`, `<section>`, `<footer>`).
- Alt text en imágenes.
- Canonical tags.
- Viewport responsivo.
