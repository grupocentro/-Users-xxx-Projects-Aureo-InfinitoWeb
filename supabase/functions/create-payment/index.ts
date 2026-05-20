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

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const { compra_id } = await req.json();
    if (!compra_id) {
      return new Response(JSON.stringify({ error: "compra_id requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch compra details
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // IMPORTANTE: leemos la compra con service_role para obtener el `total`
    // ya recalculado por el trigger `trg_compras_set_total` (server-side).
    // El total que el cliente haya intentado pasar en el insert fue sobreescrito.
    const { data: compra, error: compraError } = await adminClient
      .from("compras")
      .select("id, user_id, cantidad, total, estado_pago, tipo_entrada:tipos_entrada(nombre)")
      .eq("id", compra_id)
      .eq("user_id", userId)
      .single();

    if (compraError || !compra) {
      return new Response(JSON.stringify({ error: "Compra no encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validaciones defensivas previas a generar la preferencia.
    // El trigger de DB ya garantiza un total oficial, pero validamos casos límite.
    const cantidad = Number(compra.cantidad);
    const total = Number(compra.total);

    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 100) {
      return new Response(JSON.stringify({ error: "Cantidad inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Number.isFinite(total) || total <= 0) {
      return new Response(
        JSON.stringify({ error: "Total inválido para esta compra" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No permitir generar una preferencia nueva sobre una compra ya finalizada.
    // Evita pagos duplicados sobre la misma compra.
    if (compra.estado_pago !== "pendiente") {
      return new Response(
        JSON.stringify({ error: `Esta compra ya está en estado "${compra.estado_pago}"` }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    if (!MP_ACCESS_TOKEN) {
      return new Response(
        JSON.stringify({ error: "MercadoPago no configurado. Contactá al administrador." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine callback URLs
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "https://infinito.grupocentro.digital";

    // Create MercadoPago preference
    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            title: `Entrada ${compra.tipo_entrada?.nombre || "Infinito Water Park"}`,
            quantity: cantidad,
            unit_price: total / cantidad,
            currency_id: "ARS",
          },
        ],
        back_urls: {
          success: `${origin}/compra-exitosa?status=success&compra_id=${compra.id}`,
          failure: `${origin}/compra-exitosa?status=failure&compra_id=${compra.id}`,
          pending: `${origin}/compra-exitosa?status=pending&compra_id=${compra.id}`,
        },
        auto_return: "approved",
        external_reference: compra.id,
        notification_url: `${supabaseUrl}/functions/v1/webhook-mercadopago`,
      }),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      console.error("MP error:", mpData);
      return new Response(JSON.stringify({ error: "Error al crear preferencia de pago" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ init_point: mpData.init_point, preference_id: mpData.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
