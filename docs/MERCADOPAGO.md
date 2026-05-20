# MercadoPago — Sandbox a Producción

## Estado actual: SANDBOX

- Secret `MP_ACCESS_TOKEN` contiene token de pruebas.
- Las compras NO cobran dinero real.
- Tarjetas de prueba en `docs/CREDENTIALS.md`.

## Migrar a Producción

### 1. Obtener credenciales productivas
1. Loguearse en https://www.mercadopago.com.ar/developers
2. Aplicación → Credenciales → **Producción** (no Sandbox).
3. Copiar el `Access Token` productivo.

### 2. Actualizar secret en Supabase Edge Functions
- Ir a Supabase Dashboard → Project Settings → Edge Functions → Secrets.
- Reemplazar el valor del secret `MP_ACCESS_TOKEN` con el token productivo.
- Las edge functions lo toman automáticamente en el próximo invocation.

### 3. Configurar webhook en MercadoPago
- URL: `https://gmhiewleimbezmkfdutj.supabase.co/functions/v1/webhook-mercadopago`
- Eventos: `payment` (creación y actualización).
- Si MP exige firma: implementar verificación `x-signature` en `webhook-mercadopago/index.ts`.

### 4. Habilitar el calendario completo
- Editar `src/components/comprar/CalendarioEntradas.tsx`.
- Quitar restricción a febrero 2026.
- Definir nueva lógica de fechas habilitadas.

### 5. Verificar `back_urls`
- En `create-payment` ajustar `back_urls.success/failure/pending` al dominio productivo (`https://infinito.grupocentro.digital/compra-exitosa`).
- Setear `auto_return: 'approved'`.

## Checklist final
- [ ] Token productivo en secret.
- [ ] Webhook URL registrada en MP Dashboard.
- [ ] Calendario abierto.
- [ ] back_urls actualizadas.
- [ ] Test con tarjeta real de bajo monto.
- [ ] Verificar que el QR se genera y aparece en `/mi-cuenta`.
- [ ] Verificar que `/staff/scanner` valida correctamente.

## Reglas de pricing (memo)

Ver `mem://business/reglas-precios-entradas`:
- `precio_semana` (Lun-Jue) y `precio_finde` (Vie-Dom) por `tipos_entrada`.
- Detección de fin de semana en cliente: `getDay() >= 5 || getDay() === 0`.
