# Design System

## Filosofía

Estética **app móvil** premium con paleta water (azul/aqua/blanco), glassmorphism, gran cantidad de blanco y acentos saturados. Border radius generosos (28px) y bordes blancos de 5px en cards destacadas.

## Tokens (en `src/index.css`)

Todos los colores son **HSL sin función `hsl()`** (Tailwind lo envuelve). Ejemplo:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;

  /* Water palette */
  --water-50: 204 100% 97%;
  --water-100: 204 94% 94%;
  --water-200: 201 94% 86%;
  --water-300: 199 95% 74%;
  --water-400: 198 93% 60%;
  --water-500: 199 89% 48%;
  --water-600: 200 98% 39%;
  --water-700: 201 96% 32%;
  --water-800: 201 90% 27%;
  --water-900: 202 80% 24%;

  --app-border: 210 30% 90%;
  /* ... más tokens semánticos */
}
```

### Uso correcto

```tsx
// ✅ BIEN
<div style={{ background: "hsl(var(--water-500))" }} />
<Button className="bg-primary text-primary-foreground" />

// ❌ MAL
<div className="bg-blue-500 text-white" />
<div style={{ background: "#0ea5e9" }} />
```

## Tipografía

- Headings: bold/black, tracking ajustado.
- Body: Inter o similar (vía Tailwind default).
- Nunca cambiar a Poppins genérica.

## Componentes recurrentes

### Glassmorphism (Navbar al scrollear, drawers, modales)
```css
background: rgba(255,255,255,0.96);
backdrop-filter: blur(16px);
border-bottom: 1px solid hsl(var(--app-border));
box-shadow: 0 4px 24px rgba(0,119,182,0.08);
```

### Botón CTA primario
```css
background: linear-gradient(135deg, hsl(var(--water-600)), hsl(var(--water-400)));
box-shadow: 0 4px 14px hsl(var(--water-600) / 0.3);
border-radius: 12px; /* rounded-xl */
font-weight: 900;
```

### Card destacada
```css
border-radius: 28px;
border: 5px solid white;
box-shadow: 0 8px 32px rgba(0, 60, 130, 0.1);
```

### Drawer móvil
Slide-in desde la derecha (280px), con ilustración de flamenco al fondo. Detalle en `mem://estilo/navegacion-drawer`.

## Animaciones

- `framer-motion` para entradas/salidas.
- Stories del Hero con barras de progreso autoavance.
- Hover: `hover:scale-105` + `hover:brightness-110` en CTAs.
- Transiciones `cubic-bezier(0.32, 0.72, 0, 1)` para drawers.

## Branding

- **Logo color**: `src/assets/infinito-logo.png` → en Navbar.
- **Logo blanco**: versión usada en Footer.
- Mascota flamenco: `src/assets/flamingo-menu.png` → fondo del drawer móvil.

Ver `mem://estilo/branding`.

## Reglas inviolables

1. **Cero colores hardcodeados** en componentes (`text-white`, `bg-blue-500`, hex). Todo vía tokens.
2. HSL siempre (no RGB ni hex en tokens).
3. Cualquier color nuevo se agrega a `index.css` Y a `tailwind.config.ts`.
4. Verificar contraste en light y dark si aplica.
