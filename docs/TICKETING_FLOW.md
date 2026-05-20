# Flujo de Ticketing (end-to-end)

## 1. Compra

### Compra de entrada al parque (`/comprar`)
1. `CalendarioEntradas.tsx` muestra **febrero 2026** (hardcoded). Detecta fin de semana (vie-dom).
2. Usuario elige fecha → carga `tipos_entrada` y muestra `precio_finde` o `precio_semana` según día.
3. Selecciona tipo + cantidad → crea row en `compras` (`estado_pago = 'pendiente'`).
4. Llama a edge function `create-payment` → recibe `init_point` de MercadoPago.
5. Redirect a checkout de MP (Sandbox).

### Compra de evento (`/comprar?evento=ID`)
- Omite calendario.
- Sin opción de menores.
- Usa `eventos.precio`.

## 2. Pago

- Checkout en MercadoPago Sandbox.
- Tarjetas de prueba: ver `docs/MERCADOPAGO.md`.

## 3. Webhook → generación de QR

`supabase/functions/webhook-mercadopago/index.ts`:

1. Recibe POST de MercadoPago con `data.id` (payment id).
2. Consulta API de MP para obtener detalles del pago.
3. **Verifica idempotencia**: si ya existe `compras.mp_payment_id = X`, no genera de nuevo.
4. Si `status = 'approved'`:
   - `UPDATE compras SET estado_pago='aprobado', mp_payment_id=X WHERE id=external_reference`.
   - Genera N filas en `codigos_qr` (N = `compras.cantidad`), cada una con `uuid_code = gen_random_uuid()`.
5. Retorna 200 OK.

## 4. Cliente ve sus QR (`/mi-cuenta`)

`src/pages/MiCuenta.tsx`:
- SELECT compras + codigos_qr del usuario.
- Renderiza QR con librería `qrcode` (data = `uuid_code`).
- Botón **"Enviar por WhatsApp"** abre `wa.me` con texto preformateado (ver `mem://features/gestion-qr-whatsapp`).

## 5. Staff valida (`/staff/scanner`)

`src/pages/staff/Scanner.tsx` (requiere rol `control_entradas` o `admin`):

1. Activa cámara con `html5-qrcode`.
2. Al detectar QR → SELECT en `codigos_qr` por `uuid_code`.
3. Tres estados visuales:
   - **Verde**: válido → UPDATE `usado=true, usado_at=now(), usado_por=auth.uid()`.
   - **Amarillo**: ya usado (muestra fecha y staff que lo escaneó).
   - **Rojo**: no existe.
4. Muestra datos del comprador (nombre, tipo de entrada, fecha).

## 6. Admin monitorea (`/admin/tickets`)

`src/pages/admin/AdminTickets.tsx`:
- Métricas: total vendidos, total usados, % uso, ingresos.
- Separación por tabs: **Todos / Parque / Eventos**.
- Tabla con: cliente, código (últimos chars), staff escaneador, hora de uso.
- Actualización en tiempo real (TanStack Query con refetch).

## Estado actual

- **MercadoPago en Sandbox**. Para producción: cambiar secret `MP_ACCESS_TOKEN` a token productivo.
- **Calendario hardcoded a febrero 2026** en `CalendarioEntradas.tsx`. Para extender: modificar lógica de generación de fechas.
- Webhook URL: `https://gmhiewleimbezmkfdutj.supabase.co/functions/v1/webhook-mercadopago` (debe coincidir en config MP).
