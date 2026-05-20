# AI_WORKFLOW.md — Cómo trabaja Claude Code en este repo

Este documento define el contrato de trabajo entre el usuario y Claude Code (o cualquier asistente de IA) en Infinito Water Park.

## 1. Trabajo por fases — regla central

El proyecto se desarrolla en **fases discretas**. Cada fase tiene:
- Un objetivo acotado y definido por el usuario.
- Un alcance explícito (archivos, rutas, funcionalidades permitidas).
- Una autorización explícita (`"Autorizo Fase X"`).
- Un cierre verificable (build verde + reporte estructurado).

> **Una fase a la vez. No iniciar una fase sin autorización explícita.**

Estado actual de las fases → `docs/PHASE_STATUS.md`.

## 2. Antes de empezar cualquier tarea

1. Leer `CLAUDE.md` (raíz) — reglas globales del proyecto.
2. Leer `docs/PHASE_STATUS.md` — saber cuál es la fase en curso.
3. Leer `docs/PROTECTED_AREAS.md` — saber qué NO se toca.
4. Si la tarea cae fuera de la fase actual o toca zonas protegidas → **pedir autorización antes de implementar**.

## 3. Comandos slash disponibles

Definidos en `.claude/commands/`:

| Comando | Propósito |
|---------|-----------|
| `/fase-check` | Diagnóstico de la fase en curso (archivos tocados, build, lint, pendientes) |
| `/sistema-dashboard` | Trabajar acotado al Modo Sistema/Ticketera |
| `/web-dashboard` | Trabajar acotado al Modo Web |
| `/qa-infinito` | QA completo (rutas, roles, exports, scanner, responsive) |
| `/supabase-check` | Auditoría BD (migraciones, RLS, RPC, edge functions) |
| `/no-romper` | Auditoría defensiva previa a modificar código |

## 4. Skills cargados automáticamente

Definidos en `.claude/skills/`:

| Skill | Cuándo activarlo |
|-------|------------------|
| `infinito-product` | Discusión de features, UX, prioridades, roles, experiencia usuario |
| `infinito-supabase` | Migraciones, RLS, RPC, edge functions, queries de cliente |
| `infinito-ui-premium` | Componentes nuevos, estilos, gráficos, dashboards, badges |
| `infinito-qa` | Cierre de fase, verificación, reporte estructurado |

## 5. Qué NO tocar (resumen)

Detalle completo en `docs/PROTECTED_AREAS.md`. Sin autorización explícita:

- ❌ `src/pages/staff/Scanner.tsx`
- ❌ `supabase/functions/create-payment/`, `webhook-mercadopago/`, `admin-create-user/`
- ❌ `src/integrations/supabase/client.ts`, `types.ts`
- ❌ `.env`, `.env.*` (excepto `.env.example`)
- ❌ Migraciones cerradas (todas las anteriores a la fase actual)
- ❌ `supabase/config.toml` (excepto bloques `[functions.*]`)

## 6. Cómo reportar avances durante la fase

- Antes de cada acción no trivial: una línea explicando qué vas a hacer.
- Al encontrar un blocker: parar e informar al usuario, no inventar workarounds.
- Cambios de scope sobre la marcha: **pedir confirmación con `AskUserQuestion`**, no asumir.

## 7. Cómo cerrar una fase

### Checklist obligatoria

1. ✅ `npm run build` pasa.
2. ✅ `npm run lint` no introduce problemas nuevos (vs baseline).
3. ✅ Scanner, MercadoPago, migraciones cerradas y rutas legacy intactas.
4. ✅ Sin mocks, sin datos hardcodeados.
5. ✅ Todos los items autorizados están implementados (o reportados como pendientes con justificación).
6. ✅ Memorias actualizadas si el plan o estado del proyecto cambió.

### Formato obligatorio del reporte de cierre

```markdown
# Reporte Fase X — Cerrada ✅

## Archivos NUEVOS (N)
- [path](path) — propósito en una línea

## Archivos MODIFICADOS (N)
- [path](path) — qué cambió en una línea

## Rutas nuevas activas
- ...

## Rutas legacy mantenidas (redirect)
- ...

## Métricas / KPIs / Features implementados
- ...

## QA
| Check | Resultado |
|-------|-----------|
| npm run build | ✅ Pasa en Xs |
| npm run lint  | X problemas (vs Y baseline) |
| Bundle inicial | X KB |

## Lo que NO se rompió
- ✅ Scanner intacto
- ✅ MP intacto
- ✅ Rutas legacy redirigen
- ✅ ...

## Problemas / Pendientes detectados
### Críticos
- ...
### Medios
- ...
### Menores
- ...

## Próximo paso
Esperando autorización para Fase X+1.
```

## 8. Decisiones de scope

Si durante una fase aparece una decisión técnica que afecta scope:

1. Pausar.
2. Usar `AskUserQuestion` para presentar opciones claras (2-4 opciones, una recomendada).
3. Esperar respuesta antes de continuar.

**No asumir** preferencias del usuario. **No expandir scope** sin autorización.

## 9. Comunicación

- **Honestidad antes que polish**. "No funciona" es mejor que "no probé".
- **Español rioplatense** (Argentina) — toda comunicación con el usuario y todos los textos de UI.
- **Tono profesional**. No emojis excepto que el usuario los pida explícitamente.
- **Concisión**. Reporte largo sólo si la fase realmente lo amerita.

## 10. Memoria persistente

El proyecto tiene memoria persistente en `/Users/xxx/.claude/projects/-Users-xxx-Projects-Aureo-InfinitoWeb/memory/` con:
- `project_admin_dual_mode.md` — plan global de la reorganización admin
- `reference_fase_0_deliverables.md` — inventario de Fase 0

Actualizar las memorias al cerrar fases relevantes, manteniendo el archivo `MEMORY.md` (índice) sincronizado.
