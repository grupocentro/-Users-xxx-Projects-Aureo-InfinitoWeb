---
description: Auditoría previa antes de modificar — detectar archivos sensibles y alcance permitido
---

# /no-romper — Auditoría previa a cambios

Antes de tocar el código, hacé un chequeo defensivo. **No modificar nada en este comando**, sólo reportar.

## 1. Detectar archivos sensibles en el alcance propuesto

Si la tarea propuesta toca alguno de estos paths, **DETENER** y pedir autorización explícita:

### Zonas críticas (ver `docs/PROTECTED_AREAS.md`)

- ❌ `src/pages/staff/Scanner.tsx` — Scanner QR, lógica de validación física
- ❌ `supabase/functions/create-payment/` — integración MercadoPago
- ❌ `supabase/functions/webhook-mercadopago/` — recepción de pagos
- ❌ `supabase/functions/admin-create-user/` — uso de service_role
- ❌ `src/integrations/supabase/client.ts`
- ❌ `src/integrations/supabase/types.ts` — autogenerado, no editar a mano
- ❌ `.env`, `.env.*` (excepto `.env.example`)
- ❌ `supabase/config.toml` (excepto bloques `[functions.*]`)
- ❌ **Migraciones cerradas**: cualquier archivo en `supabase/migrations/` cuya fecha sea anterior a la fase en curso (ver `docs/PHASE_STATUS.md`).

### Zonas semi-sensibles (revisar antes de tocar)

- ⚠️ `src/App.tsx` — router central. Cambios deben preservar rutas legacy con `<Navigate replace>`.
- ⚠️ `src/hooks/useAuth.ts`, `src/hooks/useUserRole.ts` — flujo de auth crítico.
- ⚠️ `src/components/admin/*` reutilizables — un cambio impacta todas las páginas que los usan.
- ⚠️ `package.json` / `package-lock.json` — sólo si se autorizó instalar deps.

## 2. Verificar fase autorizada

Releer `docs/PHASE_STATUS.md` y confirmar:
- ¿Cuál es la fase en curso?
- ¿La tarea propuesta está dentro del scope autorizado?
- Si no está claro → **pedir confirmación al usuario** antes de empezar.

## 3. Verificar reglas inviolables

Releer `CLAUDE.md` sección 3 y sección 10. Mencionar cualquier regla que la tarea propuesta podría violar.

## 4. Detectar cambios en cadena

Si la tarea modifica un archivo, identificar quién lo importa para evitar romper consumidores:
- `grep -rE "from .*<archivo>" src/`

## Formato de salida

```
## Auditoría /no-romper para tarea: <descripción>

### Archivos en scope propuesto
- ...

### Bloqueos detectados (❌)
- ...

### Riesgos (⚠️)
- ...

### Veredicto
[ ✅ Seguro proceder | ⚠️ Necesita confirmación | ❌ Detener y autorizar primero ]
```

## Regla de oro

> "Medir dos veces, cortar una." Mejor pausar 30 segundos antes de tocar Scanner que pasar 30 minutos arreglando lo que se rompió.
