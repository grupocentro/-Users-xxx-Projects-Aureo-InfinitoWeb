import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-signature, x-request-id, " +
    "x-supabase-client-platform, x-supabase-client-platform-version, " +
    "x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// =============================================================================
// VERIFICACIÓN x-signature — IDÉNTICA a la versión 1.
// =============================================================================

interface SignatureCheck { ok: boolean; reason?: string; enforced: boolean; }
const ANTI_REPLAY_WINDOW_MS = 5 * 60 * 1000;

async function verifyMpSignature(
  paymentId: string,
  signatureHeader: string | null,
  requestIdHeader: string | null,
): Promise<SignatureCheck> {
  const secret = Deno.env.get("MP_WEBHOOK_SECRET");
  if (!secret) {
    console.warn(
      "[MP webhook] MP_WEBHOOK_SECRET no configurado — aceptando request sin " +
      "verificar firma (modo compatibilidad). Configurar el secret en Supabase " +
      "Secrets antes de producción.",
    );
    return { ok: true, enforced: false };
  }
  if (!signatureHeader) return { ok: false, reason: "missing x-signature header", enforced: true };
  if (!requestIdHeader) return { ok: false, reason: "missing x-request-id header", enforced: true };

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
  if (!ts || !v1) return { ok: false, reason: "malformed x-signature", enforced: true };

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return { ok: false, reason: "invalid ts", enforced: true };
  const tsMs = tsNum > 1e12 ? tsNum : tsNum * 1000;
  const ageMs = Date.now() - tsMs;
  if (Math.abs(ageMs) > ANTI_REPLAY_WINDOW_MS) {
    return {
      ok: false,
      reason: `ts outside ${ANTI_REPLAY_WINDOW_MS / 60000}min window (age=${Math.round(ageMs / 1000)}s)`,
      enforced: true,
    };
  }

  const manifest = `id:${paymentId};request-id:${requestIdHeader};ts:${ts};`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(manifest));
  const computed = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0")).join("");

  if (computed.length !== v1.length) return { ok: false, reason: "signature mismatch", enforced: true };
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) mismatch |= computed.charCodeAt(i) ^ v1.charCodeAt(i);
  if (mismatch !== 0) return { ok: false, reason: "signature mismatch", enforced: true };
  return { ok: true, enforced: true };
}

// =============================================================================
// Helpers de procesamiento
// =============================================================================

type CompraMin = {
  id: string;
  cantidad: number;
  total: number;
  estado_pago: string;
  mp_payment_id: string | null;
};

function mpStatusToEstado(mpStatus: string, montoCoincide: boolean): string {
  if (mpStatus === "approved") return montoCoincide ? "aprobado" : "payment_mismatch";
  if (mpStatus === "rejected" || mpStatus === "cancelled") return "rechazado";
  return "pendiente";
}

async function ensureQrsForCompra(
  admin: ReturnType<typeof createClient>,
  compra: CompraMin,
): Promise<{ created: boolean; error?: string }> {
  const { data: existing, error: existingErr } = await admin
    .from("codigos_qr")
    .select("id")
    .eq("compra_id", compra.id)
    .limit(1);
  if (existingErr) return { created: false, error: existingErr.message };
  if (existing && existing.length > 0) return { created: false };

  const rows = Array.from({ length: compra.cantidad }, () => ({ compra_id: compra.id }));
  const { error: insErr } = await admin.from("codigos_qr").insert(rows);
  if (insErr) return { created: false, error: insErr.message };
  return { created: true };
}

// =============================================================================
// Handler principal
// =============================================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ok = (data: Record<string, unknown>) =>
    new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    if (body.type !== "payment" && body.action !== "payment.created" && body.action !== "payment.updated") {
      return ok({ received: true, ignored: "non-payment notification" });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return new Response(JSON.stringify({ error: "No payment ID" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sigCheck = await verifyMpSignature(
      String(paymentId),
      req.headers.get("x-signature"),
      req.headers.get("x-request-id"),
    );
    if (!sigCheck.ok) {
      console.error(`[MP webhook] firma inválida: ${sigCheck.reason} (payment_id=${paymentId})`);
      return new Response(
        JSON.stringify({ error: "invalid signature", reason: sigCheck.reason }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (sigCheck.enforced) console.log(`[MP webhook] firma válida payment_id=${paymentId}`);
    else console.warn(`[MP webhook] procesando sin firma (compat) payment_id=${paymentId}`);

    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    if (!MP_ACCESS_TOKEN) {
      return new Response(JSON.stringify({ error: "MP not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
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

    const externalRef = String(payment.external_reference ?? "");
    if (!externalRef) {
      return new Response(JSON.stringify({ error: "No external reference" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isGroup = externalRef.startsWith("grupo:");
    const id = isGroup ? externalRef.slice("grupo:".length) : externalRef;

    const supabaseUrl    = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    let compras: CompraMin[];
    if (isGroup) {
      const { data, error } = await admin
        .from("compras")
        .select("id, cantidad, total, estado_pago, mp_payment_id")
        .eq("grupo_id", id);
      if (error) {
        console.error("Error leyendo grupo:", error);
        return new Response(JSON.stringify({ error: "Failed to read group" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      compras = (data ?? []) as CompraMin[];
      if (compras.length === 0) {
        console.error(`Grupo ${id} no encontrado o vacío`);
        return ok({ received: true, ignored: "group not found" });
      }
    } else {
      const { data, error } = await admin
        .from("compras")
        .select("id, cantidad, total, estado_pago, mp_payment_id")
        .eq("id", id)
        .single();
      if (error || !data) {
        console.error(`Compra ${id} no encontrada`);
        return ok({ received: true, ignored: "compra not found" });
      }
      compras = [data as CompraMin];
    }

    const allAprobadas = compras.every((c) => c.estado_pago === "aprobado");
    if (allAprobadas) {
      console.log(`${isGroup ? "Grupo" : "Compra"} ${id} ya aprobado; webhook no-op.`);
      if (payment.status === "approved") {
        for (const c of compras) {
          const r = await ensureQrsForCompra(admin, c);
          if (r.error) console.error(`QR backfill error compra=${c.id}: ${r.error}`);
        }
      }
      return ok({
        received: true, status: "aprobado", mode: isGroup ? "grupo" : "compra",
        note: "no-op (already approved)",
      });
    }

    const compraTotalGrupo = compras.reduce((s, c) => s + Number(c.total), 0);
    const paidAmount = Number(payment.transaction_amount ?? 0);
    const montoCoincide = Math.abs(paidAmount - compraTotalGrupo) < 0.01;
    const estadoPago = mpStatusToEstado(String(payment.status), montoCoincide);

    if (payment.status === "approved" && !montoCoincide) {
      console.error(
        `[PAYMENT MISMATCH] ${isGroup ? "grupo" : "compra"}=${id} ` +
        `pagado=${paidAmount} esperado=${compraTotalGrupo} payment_id=${paymentId}`,
      );
    }

    let updateQ;
    if (isGroup) {
      updateQ = admin
        .from("compras")
        .update({ estado_pago: estadoPago, mp_payment_id: String(paymentId) })
        .eq("grupo_id", id);
    } else {
      updateQ = admin
        .from("compras")
        .update({ estado_pago: estadoPago, mp_payment_id: String(paymentId) })
        .eq("id", id);
    }
    const { error: updateError } = await updateQ;
    if (updateError) {
      console.error("Error updating compras:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update compras" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let qrTotalCreados = 0;
    if (estadoPago === "aprobado") {
      for (const c of compras) {
        const r = await ensureQrsForCompra(admin, c);
        if (r.error) {
          console.error(`Error creating QR compra=${c.id}: ${r.error}`);
          return new Response(JSON.stringify({ error: "Failed to create QR codes" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (r.created) qrTotalCreados += c.cantidad;
      }
      console.log(`Created ${qrTotalCreados} QR codes (mode=${isGroup ? "grupo" : "compra"} id=${id})`);
    }

    return ok({
      received: true,
      status: estadoPago,
      mode: isGroup ? "grupo" : "compra",
      compras: compras.length,
      montoCoincide,
      qrCreated: qrTotalCreados,
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
