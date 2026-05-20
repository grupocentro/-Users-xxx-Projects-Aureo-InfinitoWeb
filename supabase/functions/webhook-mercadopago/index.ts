import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-signature, x-request-id, " +
    "x-supabase-client-platform, x-supabase-client-platform-version, " +
    "x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// =============================================================================
// Verificación HMAC SHA-256 de x-signature de MercadoPago
// =============================================================================
// MP firma cada webhook con HMAC-SHA256 usando el secret configurado en el
// panel de webhooks de MercadoPago (Notifications → Webhooks → Configurar
// notificaciones → "Clave secreta"). El header `x-signature` tiene la forma:
//
//   x-signature: ts=<unix_timestamp>,v1=<hex_sha256>
//
// El "manifest" que MP firma se compone con:
//   id:<paymentId>;request-id:<x-request-id>;ts:<ts>;
//
// Modo gradual (decisión de proyecto):
//   - Si MP_WEBHOOK_SECRET no está configurado en Supabase Secrets, se loguea
//     un warning y se acepta la request. Esto evita romper la integración
//     mientras el secret se carga al deploy.
//   - Si el secret está configurado, validación es estricta: cualquier firma
//     inválida o timestamp fuera de ±5 minutos → 401.
//
// Anti-replay: ventana ±5 minutos sobre `ts`.
// =============================================================================

interface SignatureCheck {
  ok: boolean;
  reason?: string;
  enforced: boolean; // true si hay secret cargado; false si está en modo compat
}

const ANTI_REPLAY_WINDOW_MS = 5 * 60 * 1000;

async function verifyMpSignature(
  paymentId: string,
  signatureHeader: string | null,
  requestIdHeader: string | null,
): Promise<SignatureCheck> {
  const secret = Deno.env.get("MP_WEBHOOK_SECRET");

  if (!secret) {
    // Modo gradual: log + accept. Sin secret no se puede verificar nada.
    console.warn(
      "[MP webhook] MP_WEBHOOK_SECRET no configurado — aceptando request sin " +
      "verificar firma (modo compatibilidad). Configurar el secret en Supabase " +
      "Secrets antes de producción.",
    );
    return { ok: true, enforced: false };
  }

  if (!signatureHeader) {
    return { ok: false, reason: "missing x-signature header", enforced: true };
  }
  if (!requestIdHeader) {
    return { ok: false, reason: "missing x-request-id header", enforced: true };
  }

  // Parse `ts=<value>,v1=<value>` tolerando whitespace.
  const parts: Record<string, string> = {};
  for (const segment of signatureHeader.split(",")) {
    const idx = segment.indexOf("=");
    if (idx < 0) continue;
    const k = segment.slice(0, idx).trim();
    const v = segment.slice(idx + 1).trim();
    if (k) parts[k] = v;
  }

  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) {
    return { ok: false, reason: "malformed x-signature", enforced: true };
  }

  // Anti-replay: rechaza si ts está fuera de ±5 minutos.
  // MP puede enviar ts en milisegundos o segundos según versión; toleramos ambos
  // (si tiene 13+ dígitos asumimos ms, sino segundos).
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) {
    return { ok: false, reason: "invalid ts", enforced: true };
  }
  const tsMs = tsNum > 1e12 ? tsNum : tsNum * 1000;
  const ageMs = Date.now() - tsMs;
  if (Math.abs(ageMs) > ANTI_REPLAY_WINDOW_MS) {
    return {
      ok: false,
      reason: `ts outside ${ANTI_REPLAY_WINDOW_MS / 60000}min window (age=${Math.round(ageMs / 1000)}s)`,
      enforced: true,
    };
  }

  // Construir manifest según doc oficial de MP.
  const manifest = `id:${paymentId};request-id:${requestIdHeader};ts:${ts};`;

  // HMAC-SHA256 sobre el manifest con el secret.
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(manifest));
  const computed = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Comparación timing-safe: jamás usar `===` directo sobre el hash.
  if (computed.length !== v1.length) {
    return { ok: false, reason: "signature mismatch", enforced: true };
  }
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) {
    mismatch |= computed.charCodeAt(i) ^ v1.charCodeAt(i);
  }
  if (mismatch !== 0) {
    return { ok: false, reason: "signature mismatch", enforced: true };
  }

  return { ok: true, enforced: true };
}

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
    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    // MercadoPago manda varios tipos de notificación (subscription, plan, etc.)
    // Sólo procesamos las de pago.
    if (
      body.type !== "payment" &&
      body.action !== "payment.created" &&
      body.action !== "payment.updated"
    ) {
      return ok({ received: true, ignored: "non-payment notification" });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return new Response(JSON.stringify({ error: "No payment ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =======================================================================
    // VERIFICACIÓN x-signature (HMAC SHA-256) + anti-replay 5min
    // =======================================================================
    const sigCheck = await verifyMpSignature(
      String(paymentId),
      req.headers.get("x-signature"),
      req.headers.get("x-request-id"),
    );

    if (!sigCheck.ok) {
      console.error(
        `[MP webhook] firma inválida: ${sigCheck.reason} (payment_id=${paymentId})`,
      );
      return new Response(
        JSON.stringify({ error: "invalid signature", reason: sigCheck.reason }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (sigCheck.enforced) {
      console.log(`[MP webhook] firma válida payment_id=${paymentId}`);
    } else {
      console.warn(
        `[MP webhook] procesando sin firma (modo compatibilidad) payment_id=${paymentId}`,
      );
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
      "external_reference:", payment.external_reference,
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
          `[PAYMENT MISMATCH] compra=${compraId} pagado=${paidAmount} esperado=${compraTotal} payment_id=${paymentId}`,
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
