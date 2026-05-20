// =============================================================================
// admin-create-user
// =============================================================================
// Crea usuarios desde el panel admin SIN afectar la sesión del admin que llama.
//
// Antes: AdminUsuarios.tsx invocaba `supabase.auth.signUp(...)` desde el browser,
//        lo cual loguea automáticamente al usuario recién creado y desloguea al
//        admin que estaba operando.
//
// Ahora: el frontend invoca esta función con el bearer del admin. Acá:
//   1. Validamos el bearer y obtenemos el caller.
//   2. Confirmamos que el caller tiene rol 'admin' (vía has_role SECURITY DEFINER).
//   3. Validamos el body.
//   4. Llamamos a auth.admin.createUser con service_role (no afecta sesión cliente).
//   5. El trigger handle_new_user inserta el row en profiles con nombre/apellido
//      desde user_metadata (no duplicamos esa lógica acá).
//   6. Si vino whatsapp → UPDATE profile.
//   7. Si vino role → INSERT en user_roles.
//
// Nunca devolvemos password, nunca lo logueamos.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const APP_ROLES = ["admin", "editor", "control_entradas"] as const;
type AppRole = (typeof APP_ROLES)[number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Método no permitido" }, 405);
  }

  try {
    // ----- 1. Validar bearer del caller -------------------------------------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "No autorizado" }, 401);
    }

    const supabaseUrl    = Deno.env.get("SUPABASE_URL");
    const anonKey        = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("Faltan variables de entorno de Supabase");
      return jsonResponse({ error: "Configuración inválida del servidor" }, 500);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: callerData, error: callerErr } = await callerClient.auth.getUser();
    const caller = callerData?.user;
    if (callerErr || !caller) {
      return jsonResponse({ error: "Token inválido" }, 401);
    }

    // Client con service_role para todo lo demás.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // ----- 2. Verificar rol admin del caller --------------------------------
    // Usamos has_role(SECURITY DEFINER) — fuente única de verdad de roles.
    const { data: hasAdminRole, error: roleErr } = await adminClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    if (roleErr) {
      console.error("Error verificando rol admin:", roleErr.message);
      return jsonResponse({ error: "Error verificando permisos" }, 500);
    }
    if (hasAdminRole !== true) {
      return jsonResponse({ error: "Permiso denegado" }, 403);
    }

    // ----- 3. Validar body --------------------------------------------------
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Body JSON inválido" }, 400);
    }

    const email    = typeof body.email    === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const nombre   = typeof body.nombre   === "string" ? body.nombre.trim()   : "";
    const apellido = typeof body.apellido === "string" ? body.apellido.trim() : "";
    const whatsapp = typeof body.whatsapp === "string" ? body.whatsapp.trim() : "";
    const roleRaw  = typeof body.role     === "string" ? body.role.trim()     : "";

    if (!email || !EMAIL_RE.test(email)) {
      return jsonResponse({ error: "Email inválido" }, 400);
    }
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return jsonResponse({
        error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
      }, 400);
    }
    if (!nombre) {
      return jsonResponse({ error: "Nombre requerido" }, 400);
    }
    if (roleRaw && !APP_ROLES.includes(roleRaw as AppRole)) {
      return jsonResponse({ error: "Rol inválido" }, 400);
    }

    // ----- 4. Crear el auth.user --------------------------------------------
    // email_confirm=true → puede loguear inmediatamente sin email de confirmación.
    // user_metadata.nombre/apellido los lee el trigger handle_new_user.
    const { data: createData, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre, apellido },
    });

    if (createErr || !createData?.user) {
      // No incluimos el password en logs ni en respuestas.
      const message = createErr?.message ?? "No se pudo crear el usuario";
      console.error("Error createUser:", message);
      const lower = message.toLowerCase();
      if (
        lower.includes("already") ||
        lower.includes("registered") ||
        lower.includes("duplicate") ||
        lower.includes("exist")
      ) {
        return jsonResponse({ error: "Ya existe un usuario con ese email" }, 409);
      }
      if (lower.includes("password")) {
        return jsonResponse({ error: "Contraseña no válida" }, 400);
      }
      return jsonResponse({ error: message }, 400);
    }

    const newUserId = createData.user.id;

    // ----- 5. Actualizar whatsapp si vino -----------------------------------
    // El trigger handle_new_user ya creó la fila en profiles con nombre/apellido.
    // Sólo completamos lo que el trigger no maneja.
    if (whatsapp) {
      const { error: updErr } = await adminClient
        .from("profiles")
        .update({ whatsapp })
        .eq("id", newUserId);
      if (updErr) {
        // No fatal — el usuario ya existe; el admin puede completar después.
        console.error("Error actualizando whatsapp:", updErr.message);
      }
    }

    // ----- 6. Asignar rol si vino -------------------------------------------
    if (roleRaw) {
      const { error: roleInsErr } = await adminClient
        .from("user_roles")
        .insert({ user_id: newUserId, role: roleRaw as AppRole });
      if (roleInsErr) {
        // El usuario ya está creado; reportamos warning pero ok=true.
        console.error("Error asignando rol:", roleInsErr.message);
        return jsonResponse({
          ok: true,
          user_id: newUserId,
          email,
          warning: "Usuario creado, pero no se pudo asignar el rol. Asignalo manualmente desde la lista.",
        });
      }
    }

    console.log(`User created by admin=${caller.id} email=${email} role=${roleRaw || "none"}`);

    return jsonResponse({
      ok: true,
      user_id: newUserId,
      email,
      role: roleRaw || null,
    });
  } catch (err) {
    console.error("admin-create-user error:", err);
    return jsonResponse({ error: "Error interno del servidor" }, 500);
  }
});
