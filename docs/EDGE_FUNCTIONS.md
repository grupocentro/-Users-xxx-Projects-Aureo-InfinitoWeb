# Edge Functions

Las edge functions corren en Deno (Supabase). Viven en `supabase/functions/<nombre>/index.ts` y se despliegan en Supabase vía CLI (`supabase functions deploy <nombre>`) o desde el dashboard del proyecto.

## `create-payment`

**Propósito**: crea una preferencia de pago en MercadoPago.

**Input** (POST JSON):
```json
{
  "compra_id": "uuid",
  "items": [{ "title": "Entrada General", "quantity": 2, "unit_price": 12000 }],
  "payer": { "email": "cliente@mail.com" }
}
```

**Output**:
```json
{
  "init_point": "https://sandbox.mercadopago.com.ar/checkout/..."
}
```

**Pasos**:
1. Lee `MP_ACCESS_TOKEN` de env.
2. POST a `https://api.mercadopago.com/checkout/preferences` con:
   - `items`
   - `external_reference` = `compra_id`
   - `notification_url` = URL del webhook
   - `back_urls` = `/compra-exitosa`
3. Devuelve `init_point`.

## `webhook-mercadopago`

**Propósito**: recibe notificación de pago y genera QR cuando corresponde.

**Input** (POST JSON de MercadoPago):
```json
{
  "action": "payment.updated",
  "data": { "id": "12345" }
}
```

**Pasos**:
1. Lee `data.id` (payment id).
2. GET a `https://api.mercadopago.com/v1/payments/{id}` con bearer token.
3. Extrae `external_reference` (= `compra_id`) y `status`.
4. **Idempotencia**: si `compras.mp_payment_id` ya está seteado, retornar 200 sin hacer nada.
5. Si `status === 'approved'`:
   - `UPDATE compras SET estado_pago='aprobado', mp_payment_id=<id>` usando service role key.
   - Lee `cantidad` y hace `INSERT INTO codigos_qr` N veces.
6. Retorna 200 OK siempre (MercadoPago reintenta en error).

**Secrets requeridos** (configurar en Supabase Dashboard → Project Settings → Edge Functions → Secrets):
- `MP_ACCESS_TOKEN` (Sandbox o Producción)
- `SUPABASE_SERVICE_ROLE_KEY` (auto provisto por el runtime de Supabase Edge Functions)
- `SUPABASE_URL` (auto provisto)
- `SUPABASE_ANON_KEY` (auto provisto)

## CORS

Todas las funciones públicas deben incluir CORS:

```ts
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})
```

## Reglas

- Nunca `supabase.rpc('execute_sql')` ni SQL crudo.
- Validar input con zod cuando viene del cliente.
- `verify_jwt = false` debe declararse explícitamente en `supabase/config.toml` por cada función. Cuando una función necesita identificar al caller, valida el bearer `Authorization` manualmente (patrón usado en `create-payment` y `admin-create-user`).
- Logs: `console.log` aparecen en el panel de Edge Function Logs.
