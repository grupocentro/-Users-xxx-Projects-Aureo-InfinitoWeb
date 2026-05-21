import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// =============================================================================
// create-payment — soporta DOS modos:
//   1. Legacy:  body = { compra_id }          → external_reference = "<compra_id>"
//   2. Grupo:   body = { grupo_id }           → external_reference = "grupo:<grupo_id>"
// Ambos modos validan ownership del caller y que todas las compras estén
// en estado "pendiente". El total NUNCA viene del cliente: se lee de DB
// post-trigger trg_compras_set_total.
// =============================================================================

type CompraRow = {
  id: string;
  user_id: string;
  cantidad: number;
  total: number;
  estado_pago: string;
  tipo_entrada_id: string | null;
  evento_id: string | null;
  tipo_entrada?: { nombre: string } | null;
  evento?: { nombre: string } | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // ----- 1. Bearer del caller --------------------------------------------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "No autorizado" }, 401);
    }

    const supabaseUrl    = Deno.env.get("SUPABASE_URL")!;
    const anonKey        = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !user) return json({ error: "Token inválido" }, 401);

    // ----- 2. Body: detectar modo -------------------------------------------
    const body = await req.json().catch(() => ({}));
    const compraId: string | undefined = body?.compra_id;
    const grupoId:  string | undefined = body?.grupo_id;

    if (!compraId && !grupoId) {
      return json({ error: "Se requiere compra_id o grupo_id" }, 400);
    }
    if (compraId && grupoId) {
      console.warn("[create-payment] body trae compra_id Y grupo_id; usando grupo_id");
    }
    const isGroup = !!grupoId;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // ----- 3. Leer compras --------------------------------------------------
    let compras: CompraRow[] = [];
    if (isGroup) {
      const { data, error } = await admin
        .from("compras")
        .select(
          "id, user_id, cantidad, total, estado_pago, tipo_entrada_id, evento_id, " +
          "tipo_entrada:tipos_entrada(nombre), evento:eventos(nombre)"
        )
        .eq("grupo_id", grupoId!)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) return json({ error: "Error leyendo grupo" }, 500);
      compras = (data ?? []) as unknown as CompraRow[];
    } else {
      const { data, error } = await admin
        .from("compras")
        .select(
          "id, user_id, cantidad, total, estado_pago, tipo_entrada_id, evento_id, " +
          "tipo_entrada:tipos_entrada(nombre), evento:eventos(nombre)"
        )
        .eq("id", compraId!)
        .eq("user_id", user.id)
        .single();

      if (error || !data) return json({ error: "Compra no encontrada" }, 404);
      compras = [data as unknown as CompraRow];
    }

    if (compras.length === 0) {
      return json({ error: isGroup ? "Grupo sin compras" : "Compra no encontrada" }, 404);
    }

    // ----- 4. Validaciones agregadas ----------------------------------------
    const sumCantidad = compras.reduce((s, c) => s + Number(c.cantidad), 0);
    const sumTotal    = compras.reduce((s, c) => s + Number(c.total), 0);

    for (const c of compras) {
      if (!Number.isInteger(c.cantidad) || c.cantidad < 1 || c.cantidad > 100) {
        return json({ error: `Cantidad inválida en compra ${c.id}` }, 400);
      }
      if (c.estado_pago !== "pendiente") {
        return json(
          { error: `La compra ${c.id} está en estado "${c.estado_pago}", no se puede pagar de nuevo.` },
          409
        );
      }
    }
    if (sumCantidad > 100) {
      return json({ error: "El total de entradas supera 100 (límite por preferencia)" }, 400);
    }
    if (!Number.isFinite(sumTotal) || sumTotal <= 0) {
      return json({ error: "Total inválido" }, 400);
    }

    // ----- 5. MP_ACCESS_TOKEN -----------------------------------------------
    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    if (!MP_ACCESS_TOKEN) {
      return json({ error: "MercadoPago no configurado. Contactá al administrador." }, 500);
    }

    // ----- 6. Construir preference ------------------------------------------
    const origin =
      req.headers.get("origin") ||
      req.headers.get("referer")?.replace(/\/$/, "") ||
      "https://infinito.grupocentro.digital";

    const items = compras.map((c) => {
      const titleBase =
        c.evento?.nombre
          ? `Evento ${c.evento.nombre}`
          : c.tipo_entrada?.nombre
            ? `Entrada ${c.tipo_entrada.nombre}`
            : "Entrada Infinito Water Park";
      return {
        title: titleBase,
        quantity: Number(c.cantidad),
        unit_price: Number((Number(c.total) / Number(c.cantidad)).toFixed(2)),
        currency_id: "ARS",
      };
    });

    const externalReference = isGroup ? `grupo:${grupoId}` : compras[0].id;
    const firstCompraId = compras[0].id;
    const backUrlParams = isGroup
      ? `compra_id=${firstCompraId}&grupo_id=${grupoId}`
      : `compra_id=${firstCompraId}`;

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items,
        back_urls: {
          success: `${origin}/compra-exitosa?status=success&${backUrlParams}`,
          failure: `${origin}/compra-exitosa?status=failure&${backUrlParams}`,
          pending: `${origin}/compra-exitosa?status=pending&${backUrlParams}`,
        },
        auto_return: "approved",
        external_reference: externalReference,
        notification_url: `${supabaseUrl}/functions/v1/webhook-mercadopago`,
      }),
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      console.error("MP error:", mpData);
      return json({ error: "Error al crear preferencia de pago" }, 500);
    }

    return json({ init_point: mpData.init_point, preference_id: mpData.id });
  } catch (err) {
    console.error("create-payment error:", err);
    return json({ error: "Error interno del servidor" }, 500);
  }
});
