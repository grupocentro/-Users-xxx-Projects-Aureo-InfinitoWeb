import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Helper para responder 200 — MP reintenta sobre 4xx/5xx, así que para
  // eventos no relacionados (subscription, plan, etc.) acusamos recibo OK.
  const ok = (data: Record<string, unknown>) =>
    new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // ---------------------------------------------------------------------
    // TODO (CRÍTICO antes de producción): verificar firma `x-signature`.
    //
    // MercadoPago firma cada notificación con HMAC-SHA256 usando un secret
    // configurable en el panel de webhooks de MP. La cabecera `x-signature`
    // tiene el formato:  ts=...,v1=...
    // y el payload firmado se arma con: id, x-request-id y ts.
    //
    // No se implementa todavía porque requiere:
    //   1. Configurar el webhook signing secret en MP dashboard.
    //   2. Guardar ese secret en Supabase Edge Functions Secrets
    //      (variable propuesta: MP_WEBHOOK_SECRET).
    //   3. Confirmar el algoritmo exacto con la doc vigente de MP.
    //
    // Mitigación actual: el webhook re-consulta a MP por `data.id` con
    // nuestro `MP_ACCESS_TOKEN`, por lo que un payload falso sin payment id
    // válido no progresa. Esto reduce el riesgo pero NO lo elimina (un
    // atacante con un payment id real arbitrario de OTRO comercio recibiría
    // 404 al consultar con nuestro token, así que el daño efectivo es bajo).
    // ---------------------------------------------------------------------

    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    // MercadoPago manda varios tipos de notificación (subscription, plan, etc.)
    // Sólo procesamos las de pago.
    if (body.type !== "payment" && body.action !== "payment.created" && body.action !== "payment.updated") {
      return ok({ received: true, ignored: "non-payment notification" });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return new Response(JSON.stringify({ error: "No payment ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    if (!MP_ACCESS_TOKEN) {
      return new Response(JSON.stringify({ error: "MP not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch payment details from MercadoPago (fuente de verdad real, no el payload).
    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });

    if (!paymentRes.ok) {
      console.error(`MP payment ${paymentId} fetch failed: ${paymentRes.status}`);
      return ok({ received: true, ignored: "payment not found in MP" });
    }

    const payment = await paymentRes.json();
    console.log(
      "Payment status:", payment.status,
      "amount:", payment.transaction_amount,
      "external_reference:", payment.external_reference
    );

    const compraId = payment.external_reference;
    if (!compraId) {
      return new Response(JSON.stringify({ error: "No external reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Leer la compra antes de actualizar — necesitamos estado actual y total oficial.
    const { data: compra, error: compraError } = await supabase
      .from("compras")
      .select("id, cantidad, total, estado_pago, mp_payment_id")
      .eq("id", compraId)
      .single();

    if (compraError || !compra) {
      console.error(`Compra ${compraId} no encontrada:`, compraError);
      // Respondemos 200 para que MP no reintente sobre una compra inexistente.
      return ok({ received: true, ignored: "compra not found" });
    }

    // -----------------------------------------------------------------------
    // PROTECCIÓN ANTI-DEGRADACIÓN
    // Si la compra ya está aprobada (QR ya emitido), ningún webhook posterior
    // puede degradarla. El trigger SQL `trg_compras_guard_estado` también lo
    // bloquea como segunda barrera.
    // -----------------------------------------------------------------------
    if (compra.estado_pago === "aprobado") {
      console.log(`Compra ${compraId} ya estaba aprobada; webhook ignorado (estado preservado).`);
      return ok({ received: true, status: "aprobado", note: "no-op (already approved)" });
    }

    // -----------------------------------------------------------------------
    // VALIDACIÓN DE MONTO
    // El cliente NO puede manipular total (trigger lo recalcula), pero
    // verificamos igual que MP nos haya cobrado lo correcto antes de aprobar.
    // -----------------------------------------------------------------------
    const compraTotal = Number(compra.total);
    const paidAmount = Number(payment.transaction_amount ?? 0);
    const montoCoincide = Math.abs(paidAmount - compraTotal) < 0.01;

    // Mapear status MP → estado interno
    let estadoPago = "pendiente";
    if (payment.status === "approved") {
      estadoPago = montoCoincide ? "aprobado" : "payment_mismatch";
      if (!montoCoincide) {
        console.error(
          `[PAYMENT MISMATCH] compra=${compraId} pagado=${paidAmount} esperado=${compraTotal} payment_id=${paymentId}`
        );
      }
    } else if (payment.status === "rejected" || payment.status === "cancelled") {
      estadoPago = "rechazado";
    }

    // Update compra (el trigger guardia rechaza downgrades desde aprobado;
    // como ya hicimos el check arriba, acá no debería dispararse).
    const { error: updateError } = await supabase
      .from("compras")
      .update({
        estado_pago: estadoPago,
        mp_payment_id: String(paymentId),
      })
      .eq("id", compraId);

    if (updateError) {
      console.error("Error updating compra:", updateError);
      // Devolvemos error real para que MP reintente.
      return new Response(JSON.stringify({ error: "Failed to update compra" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generar QR sólo si el pago fue aprobado Y el monto coincide.
    if (estadoPago === "aprobado") {
      // Idempotencia: si ya hay QR para esta compra, no duplicar (webhook puede llegar varias veces).
      const { data: existingQrs, error: existingErr } = await supabase
        .from("codigos_qr")
        .select("id")
        .eq("compra_id", compraId)
        .limit(1);

      if (existingErr) {
        console.error("Error checking existing QR codes:", existingErr);
        return new Response(JSON.stringify({ error: "Failed to check QR codes" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (existingQrs && existingQrs.length > 0) {
        console.log(`QR codes already exist for compra ${compraId}, skipping generation`);
      } else {
        const qrCodes = Array.from({ length: compra.cantidad }, () => ({
          compra_id: compraId,
        }));

        const { error: qrError } = await supabase.from("codigos_qr").insert(qrCodes);
        if (qrError) {
          console.error("Error creating QR codes:", qrError);
          // Si falló la generación, devolvemos error para que MP reintente.
          // Mejor que devolver 200 y quedarnos con compra aprobada sin QR.
          return new Response(JSON.stringify({ error: "Failed to create QR codes" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.log(`Created ${compra.cantidad} QR codes for compra ${compraId}`);
      }
    }

    return ok({ received: true, status: estadoPago, montoCoincide });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
