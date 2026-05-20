---
name: infinito-qa
description: Checklist QA para cerrar una fase de Infinito Water Park. Activar al cerrar trabajo, antes de reportar, o cuando el usuario pide verificar el estado.
---

# Infinito QA — Checklist de cierre

Verificación obligatoria antes de declarar una fase cerrada.

## 1. Build verde (obligatorio)

```bash
npm run build
```

- ✅ Debe terminar con `✓ built in <X>s`.
- ⚠️ Warnings de chunk > 500 KB son aceptables si no son por nuestros cambios.
- ❌ Cualquier error → la fase NO está cerrada.

## 2. Lint — no introducir problemas nuevos

```bash
npm run lint
```

- Baseline al cierre de Fase 2: **25 problemas (15 errors, 10 warnings)** — todos preexistentes.
- Si el conteo crece, identificar qué archivo nuevo lo introdujo y arreglar/justificar.

## 3. Rutas funcionando

- `/` carga sin errores.
- `/login` → submit → `/admin/seleccionar`.
- Selector muestra cards según rol.
- Rutas legacy redirigen (`<Navigate replace>`).
- `/staff/scanner` sigue accesible (no se rompió).

## 4. Roles respetados (ver `docs/ROLE_MATRIX.md`)

- Admin: Web + Sistema.
- Editor: sólo Web.
- Control_entradas: bypass a scanner.
- Sin rol: redirect a `/`.

## 5. Datos reales

- Sin mocks. Sin datos hardcodeados.
- `EmptyState` real cuando no hay data.
- Queries respetan RLS.

## 6. Exports

- Botón export en Ventas, Tickets, Validaciones, Reportes.
- CSV con BOM UTF-8.
- PDF con branding Infinito, lazy-loaded.

## 7. Scanner no roto

- `/staff/scanner` carga.
- `validar_qr(text)` y `validar_qr(text, jsonb)` ambas siguen funcionando.

## 8. MercadoPago no roto

- `create-payment` y `webhook-mercadopago` sin cambios (excepto si la fase los autorizó explícitamente).
- ⚠️ `x-signature` sigue pendiente — recordar al usuario que es BLOQUEANTE para producción.

## 9. Responsive

- Mobile (< 640px): sidebar colapsable, cards 1 columna, tablas con overflow.
- Tablet (< 1024px): 2 columnas.
- Desktop: 3-4 columnas.

## 10. Reglas de no-romper

Confirmar que NO se modificó:
- Migraciones cerradas.
- `types.ts`, `client.ts`.
- `.env`.
- Edge functions de MP.
- Scanner.

## Formato de reporte (al cerrar fase)

```markdown
# Reporte Fase X — Cerrada ✅

## Archivos creados (N)
- ...

## Archivos modificados (N)
- ...

## Rutas nuevas activas
- ...

## Rutas legacy mantenidas
- ...

## Métricas / KPIs implementados
- ...

## Exports implementados
- ...

## QA
| Check | Resultado |
|-------|-----------|
| npm run build | ✅ Pasa en Xs |
| npm run lint  | X problemas (vs baseline) |
| Bundle inicial | X KB |

## Lo que NO se rompió
- ✅ ...

## Problemas / Pendientes detectados
### Críticos / Medios / Menores

## Próximo paso
Esperando autorización para Fase X+1.
```

## Honestidad antes que polish

- Si algo no se pudo probar, decirlo explícitamente.
- Si una métrica está vacía porque no hay data → no inventarla.
- Si introdujiste lint nuevo y no lo pudiste arreglar → reportarlo, no esconderlo.
