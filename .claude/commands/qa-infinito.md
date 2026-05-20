---
description: QA completo: rutas, roles, botones, scanner, exports y responsive
---

# /qa-infinito — Checklist QA del proyecto

Hacé un QA estructural de Infinito Water Park. Reportá Sí / No / Parcial por cada item.

## 1. Build y lint

- [ ] `npm run build` pasa sin errores.
- [ ] `npm run lint` no introduce nuevos problemas vs baseline (25 al cierre de Fase 2).
- [ ] Bundle inicial < 700 KB (lazy-load de admin debe estar activo).

## 2. Rutas

- [ ] `/` carga el home.
- [ ] `/login` → post-login redirige a `/admin/seleccionar`.
- [ ] `/admin/seleccionar` muestra cards según rol.
- [ ] `/admin/web/*` accesible para admin/editor.
- [ ] `/admin/sistema/*` accesible sólo para admin.
- [ ] `/staff/scanner` accesible para admin y control_entradas.
- [ ] Rutas legacy redirigen correctamente (`<Navigate replace>`):
  - `/admin/eventos` → `/admin/web/eventos`
  - `/admin/ventas` → `/admin/sistema/ventas`
  - (idem todas las del mapa)

## 3. Roles (ver `docs/ROLE_MATRIX.md`)

- [ ] Admin: cards Web y Sistema habilitadas.
- [ ] Editor: card Web habilitada, Sistema deshabilitada con badge "Solo admin".
- [ ] Control_entradas: bypass a `/staff/scanner`.
- [ ] Sin rol: redirige a `/`.

## 4. Botones / UI

- [ ] Botones de export CSV/PDF funcionan en Ventas, Tickets, Validaciones, Reportes.
- [ ] AdminModeSwitcher en header cambia de modo y persiste en localStorage.
- [ ] Sidebars filtran items según rol.
- [ ] No hay cards "decorativas" clickeables sin acción.
- [ ] EmptyState aparece cuando no hay datos (no datos mock).

## 5. Scanner QR

- [ ] `/staff/scanner` carga.
- [ ] La RPC `validar_qr` responde con los 5 estados esperados (valido, ya_usado, no_encontrado, compra_no_aprobada, error).
- [ ] Cada validación queda registrada en `qr_validaciones`.

## 6. Exports

- [ ] CSV con BOM UTF-8 (Excel abre acentos correctamente).
- [ ] PDF con branding Infinito (banda water-700, título, paginación).
- [ ] PDF se lazy-loadea (no infla bundle inicial).

## 7. Datos reales

- [ ] Ningún dashboard usa datos hardcodeados.
- [ ] Las queries respetan RLS.
- [ ] `EmptyState` real cuando no hay datos del período.

## 8. Responsive (mobile-first)

- [ ] Sidebar colapsable en mobile (SidebarTrigger).
- [ ] DateRangeFilter wrap en pantallas < 640px.
- [ ] Tablas con `overflow-x-auto` cuando es necesario.
- [ ] Cards de métricas reflows a 1 columna en mobile.

## 9. Seguridad

- [ ] No hay `service_role` en frontend.
- [ ] Edge function `admin-create-user` valida `has_role(admin)`.
- [ ] RLS bloquea lectura de `compras`/`profiles`/`user_roles` a `anon`.
- [ ] `web_analytics_events` permite INSERT público pero SELECT sólo admin/editor.

## Formato de salida

Lista numerada con ✅ / ❌ / ⚠️, una línea por item. Al final: veredicto general en 1-2 frases.
