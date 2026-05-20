---
name: infinito-ui-premium
description: Lineamientos visuales premium acuáticos para Infinito Water Park. Activar cuando se trabaja en UI, estilos, componentes nuevos, dashboards, cards, gráficos, badges o cualquier ajuste visual.
---

# Infinito UI Premium — Lineamientos visuales

## Paleta water (definida en `src/index.css`)

```css
--water-50:  204 100% 97%;   /* fondo suave / hover background */
--water-100: 196 100% 90%;   /* badges, cards activos */
--water-200: 196 95%  78%;
--water-300: 196 100% 60%;   /* acentos brillantes */
--water-400: 196 100% 43%;   /* accent default */
--water-500: 204 100% 36%;   /* primary CTA */
--water-600: 210 100% 35%;   /* primary fuerte */
--water-700: 213 97%  27%;   /* títulos */
--water-800: 220 90%  16%;   /* foreground / títulos premium */
--water-900: 226 54%  8%;    /* deep navy */
```

Tokens semánticos disponibles en Tailwind:
- `bg-water-{50..900}`, `text-water-{...}`, `border-water-{...}`
- `bg-app-bg`, `bg-app-surface`, `border-app-border`, `text-app-muted`

## Reglas inviolables

1. **Nunca colores hardcodeados** (`bg-blue-500`, `text-white`, etc.) en componentes nuevos. Usar tokens.
2. **Border-radius**: `rounded-2xl` (16px), `rounded-3xl` (24px) para cards premium. `rounded-xl` para botones e inputs.
3. **Glassmorphism**: `bg-white/70 backdrop-blur-xl border border-white/60` — usar en cards destacadas y selector.
4. **Sombras**: `shadow-xl shadow-water-500/20` o `shadow-lg shadow-water-400/40` para botones primarios.
5. **Gradientes**: `bg-gradient-to-br from-water-400 to-water-700` para CTAs y iconos premium.
6. **Mobile-first**: empezar con clases base (sin prefijos), agregar `sm:`/`md:`/`lg:` para expandir.

## Componentes reutilizables (Fase 2)

Ya están creados en `src/components/admin/`:
- `MetricCard` — KPI cards con 5 variantes (default/primary/success/warning/danger).
- `ChartCard` — wrapper de gráficos Recharts con título y descripción.
- `DateRangeFilter` — toggle de presets + custom range.
- `StatusBadge` — badges semánticos para `compra` y `validacion`.
- `ExportButton` — dropdown CSV/PDF.
- `EmptyState` — variante `card` o `inline`.
- `LoadingState`, `ErrorState`.
- `PhasePlaceholder` — para rutas pendientes de implementar.

Reutilizarlos antes de crear nuevos. Si necesitás algo distinto, evaluar si extender uno existente.

## Iconografía

- `lucide-react` exclusivamente. Tamaños estándar: `h-3 w-3` (badges), `h-4 w-4` (inline), `h-5 w-5` (botones), `h-6 w-6`+ (heros).
- Iconos premium en cards admin: `Activity`, `ShieldCheck`, `Waves`, `Sparkles`, `Award`, `TrendingUp`, `DollarSign`, `Ticket`, `ScanLine`.

## Gráficos (Recharts)

- Lazy-loaded vía el componente que los importa (ya configurado por code-splitting de rutas admin).
- Colores: usar tokens `hsl(var(--water-*))`. Semánticos: verde para "exitosas/aprobadas", ámbar/amarillo para "pendientes/warning", rojo para "fallidas/rechazadas".
- Tooltip styling consistente: `contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--app-border))" }}`.

## Microanimaciones

- Transitions estándar: `transition-all duration-300` en hovers de cards.
- Hover de cards premium: `hover:-translate-y-1 hover:shadow-2xl`.
- Botones primarios: `active:scale-[0.98]`.

## Empty states

> Cuando una métrica/lista no tiene data, **NO** mostrar `0` solo. Mostrar `<EmptyState>` con título descriptivo.

Ejemplo:
```tsx
{rows.length === 0 ? (
  <EmptyState
    title="Sin actividad en el período"
    description="Probá ampliar el rango de fechas"
  />
) : (
  <Table>...</Table>
)}
```

## Loaders premium

```tsx
<Loader2 className="h-7 w-7 animate-spin text-water-500" />
```

O directamente `<LoadingState message="Cargando datos del dashboard..." />`.

## Antipatrones

- ❌ `text-white`, `bg-blue-500`, `border-gray-200`, etc. — usar tokens.
- ❌ Crear nuevos colores HSL sin agregarlos a `:root`.
- ❌ Border-radius `rounded` o `rounded-md` en cards premium (queda chico).
- ❌ Iconos `react-icons` u otras libs — sólo lucide-react.
- ❌ Estados de loading sin animación (sin `animate-spin` o skeleton).
- ❌ Decoración pseudo-3D, sombras estridentes, gradientes que rompen jerarquía.
