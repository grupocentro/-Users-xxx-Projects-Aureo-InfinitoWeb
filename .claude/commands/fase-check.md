---
description: Revisar estado de la fase en curso (archivos tocados, build, lint, pendientes)
---

# /fase-check — Estado de la fase actual

Hacé un diagnóstico breve y honesto de la fase en curso del proyecto Infinito Water Park.

## Pasos

1. **Identificar la fase**: leé `docs/PHASE_STATUS.md` y reportá cuál es la fase en curso.
2. **Archivos tocados en la sesión**:
   - Ejecutá `find src supabase docs -type f -mtime -1` para listar modificaciones recientes.
   - Listá archivos nuevos vs modificados.
3. **Build y lint**:
   - `npm run build` — debe pasar sin errores.
   - `npm run lint` — comparar contra baseline (25 problemas al cierre de Fase 2).
4. **Migraciones nuevas**:
   - `ls supabase/migrations/` — verificar que no se tocaron migraciones cerradas (`20260221*`, `20260222*`, `20260518*`, `20260520*`).
5. **Pendientes**:
   - Releer la autorización original de la fase y comparar contra lo entregado.
   - Listar lo que falta para cerrar la fase.

## Formato de salida

```
## Fase X — <nombre>
### Estado: [En curso | Cerrada | Bloqueada]

### Archivos tocados
- Nuevos: ...
- Modificados: ...

### Build / Lint
- Build: ✅/❌
- Lint: X problemas (vs Y baseline)

### Pendientes
- ...

### Próximo paso
- ...
```

## Reglas

- Honestidad antes que polish. Si algo está roto, decilo.
- No inventar pendientes que no estén en la autorización.
- No correr migraciones ni cambiar nada — sólo diagnosticar.
