---
name: infinito-product
description: Contexto de producto de Infinito Water Park. Activar cuando se discuten features, UX, prioridades de negocio, panel admin, ticketera, roles o experiencia del usuario.
---

# Infinito Water Park — Contexto de producto

## Qué es

Plataforma web + ticketera con QR para un parque acuático en Argentina (Grupo Centro). Pago vía MercadoPago.

- Dominio: https://infinito.grupocentro.digital
- Idioma: español rioplatense (Argentina).
- Estética: app móvil premium, paleta acuática (azul/aqua), glassmorphism.

## Personas

1. **Cliente final** — compra entradas, recibe QR, lo presenta en la puerta.
2. **Admin (`davidcorreosl@gmail.com` y otros)** — gestiona contenido, ventas, usuarios.
3. **Editor** — gestiona contenido público (sólo Panel Web).
4. **Staff / control_entradas** — escanea QR en la puerta del parque.

## Dos paneles, un login

Desde Fase 1 el panel admin opera en **doble modo** con selector premium post-login:

- **Panel Web** (`/admin/web/*`) — admin + editor — contenido público del sitio.
  Copy aprobado: _"Administrá el contenido público del parque: imágenes, noticias, promociones, eventos, atracciones y comunicación visual."_

- **Panel Ticketera** (`/admin/sistema/*`) — sólo admin — operación interna.
  Copy aprobado: _"Controlá ventas, entradas, QR, validaciones, reportes, cobros y operación diaria del parque."_

Staff (`control_entradas`) no entra al selector: hace bypass directo a `/staff/scanner`.

## Decisiones de producto fuertes (no negociables sin volver a discutir)

1. **Priorizar conversión a compra directa** (`/comprar`). No agregar links de "consultar por WhatsApp para tickets".
2. **No mockear datos**. Si una métrica no se puede calcular, mostrar `EmptyState` real.
3. **Sin scope creep**: cada fase tiene un alcance definido y autorización explícita.
4. **Rutas legacy con redirect**: nunca romper bookmarks ni enlaces externos.
5. **Datos sensibles privados**: ningún email, teléfono, IP ni nombre se persiste en `web_analytics_events`. Sanitización a nivel trigger.
6. **Pricing server-side**: cliente nunca decide precio total. Triggers SQL recalculan.

## Estado del proyecto (resumen)

Ver `docs/PHASE_STATUS.md` para detalle. Al cierre de Fase 2:
- ✅ Migraciones BD listas (3 nuevas en Fase 0 + extensión de `validar_qr`).
- ✅ Selector premium + dual layout activos (Fase 1).
- ✅ SistemaDashboard, Validaciones, Reportes con CSV/PDF (Fase 2).
- ⏳ Pendiente: Fase 3 (CRUDs Web), Fase 4 (Analytics tracking), Fase 5 (QA + polish).

## Reglas de comunicación con el usuario

- Reportar honestamente. "No funciona" es mejor que "no probé".
- Si una decisión técnica afecta scope, pedir confirmación con `AskUserQuestion` antes de implementar.
- Al cerrar fase: usar el formato de reporte definido en `docs/AI_WORKFLOW.md`.
