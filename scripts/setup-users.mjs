#!/usr/bin/env node
// =============================================================================
// setup-users.mjs — bootstrap idempotente de usuarios de Infinito Water Park
// =============================================================================
//
// Uso:
//   SUPABASE_URL="https://xxx.supabase.co" \
//   SUPABASE_SERVICE_ROLE_KEY="eyJ..." \
//   node scripts/setup-users.mjs
//
// Variables de entorno requeridas:
//   - SUPABASE_URL              (o VITE_SUPABASE_URL como fallback)
//   - SUPABASE_SERVICE_ROLE_KEY (NUNCA en .env del frontend, nunca commiteado)
//
// Qué hace:
//   1. Crea (o reusa si existe) los 4 usuarios con email_confirm=true.
//   2. Asegura que profiles esté poblado (el trigger handle_new_user ya lo hace).
//   3. Asigna roles en public.user_roles si no existen (UNIQUE(user_id, role)).
//   4. Reporta el estado final de cada usuario.
//
// Idempotente: se puede correr varias veces sin duplicar nada.
// NO modifica .env. NO loguea passwords. NO persiste el service_role.
// =============================================================================

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Configuración de usuarios
// ---------------------------------------------------------------------------
const USERS = [
  {
    email:    "davidcorreosl@gmail.com",
    password: "12345678",
    role:     "admin",
    nombre:   "David",
    apellido: "Correos",
    note:     "Superadmin (el trigger handle_new_user también asigna admin a este email automáticamente).",
  },
  {
    email:    "qr1@infinitowaterpark.com",
    password: "12345678",
    role:     "control_entradas",
    nombre:   "QR",
    apellido: "Operador 1",
  },
  {
    email:    "qr2@infinitowaterpark.com",
    password: "12345678",
    role:     "control_entradas",
    nombre:   "QR",
    apellido: "Operador 2",
  },
  {
    email:    "qr3@infinitowaterpark.com",
    password: "12345678",
    role:     "control_entradas",
    nombre:   "QR",
    apellido: "Operador 3",
  },
];

// ---------------------------------------------------------------------------
// Validación de entorno
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error("✗ Falta SUPABASE_URL (o VITE_SUPABASE_URL).");
  process.exit(1);
}
if (!SERVICE_ROLE) {
  console.error("✗ Falta SUPABASE_SERVICE_ROLE_KEY. Obtenelo de Supabase → Project Settings → API → service_role.");
  console.error("  NO lo guardes en .env del frontend. Pasalo solo como env var para este script.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function findUserByEmail(email) {
  // No hay un endpoint directo "getByEmail" en supabase-js v2. Listamos y filtramos.
  // Paginación: 100 por página. Para volúmenes mayores conviene buscar por filtro.
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const found = data.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 100) return null;
    page++;
    if (page > 50) return null; // safety stop
  }
}

async function ensureUser(u) {
  let user = await findUserByEmail(u.email);
  let action = "found";
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { nombre: u.nombre, apellido: u.apellido },
    });
    if (error) throw new Error(`createUser ${u.email}: ${error.message}`);
    user = data.user;
    action = "created";
  } else {
    // Actualizamos password + metadata si difieren (resetea password temporal en re-runs)
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password: u.password,
      email_confirm: true,
      user_metadata: { ...(user.user_metadata ?? {}), nombre: u.nombre, apellido: u.apellido },
    });
    if (error) throw new Error(`updateUserById ${u.email}: ${error.message}`);
    action = "updated";
  }
  return { user, action };
}

async function ensureRole(userId, role) {
  // El trigger handle_new_user ya inserta admin para davidcorreosl@gmail.com.
  // Para el resto necesitamos INSERT explícito. UNIQUE(user_id, role) hace que sea idempotente.
  const { error } = await admin
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
  if (error) throw new Error(`upsert user_roles ${userId}/${role}: ${error.message}`);
}

async function ensureProfile(userId, u) {
  // El trigger handle_new_user crea profiles automáticamente. Si por alguna razón faltara
  // o tuviera datos vacíos, los rellenamos.
  const { data: existing } = await admin
    .from("profiles")
    .select("id, nombre, apellido, email")
    .eq("id", userId)
    .maybeSingle();

  if (!existing) {
    const { error } = await admin
      .from("profiles")
      .insert({ id: userId, nombre: u.nombre, apellido: u.apellido, email: u.email });
    if (error && error.code !== "23505") {
      throw new Error(`insert profile ${u.email}: ${error.message}`);
    }
  } else if (!existing.nombre || !existing.apellido) {
    const { error } = await admin
      .from("profiles")
      .update({ nombre: u.nombre, apellido: u.apellido, email: u.email })
      .eq("id", userId);
    if (error) throw new Error(`update profile ${u.email}: ${error.message}`);
  }
}

async function listRolesForUser(userId) {
  const { data, error } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (error) throw new Error(`list roles ${userId}: ${error.message}`);
  return (data ?? []).map((r) => r.role);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const banner = "=".repeat(70);
console.log(banner);
console.log("Infinito Water Park — Bootstrap de usuarios");
console.log(banner);
console.log(`URL:     ${SUPABASE_URL}`);
console.log(`Users:   ${USERS.length}`);
console.log("");

const report = [];

for (const u of USERS) {
  try {
    const { user, action } = await ensureUser(u);
    await ensureProfile(user.id, u);
    await ensureRole(user.id, u.role);
    const roles = await listRolesForUser(user.id);
    const status = roles.includes(u.role) ? "✓" : "✗";
    report.push({
      email: u.email,
      id:    user.id,
      action,
      role_target: u.role,
      roles_actuales: roles.join(", ") || "(ninguno)",
      status,
      note: u.note ?? "",
    });
    console.log(`${status} ${u.email.padEnd(35)} [${action.padEnd(7)}] roles=${roles.join(",") || "—"}`);
  } catch (err) {
    report.push({
      email: u.email,
      action: "error",
      status: "✗",
      error: err.message,
    });
    console.error(`✗ ${u.email.padEnd(35)} ERROR: ${err.message}`);
  }
}

console.log("");
console.log(banner);
console.log("Resumen");
console.log(banner);
const ok = report.filter((r) => r.status === "✓").length;
const fail = report.filter((r) => r.status === "✗").length;
console.log(`OK:     ${ok}/${USERS.length}`);
console.log(`Errors: ${fail}/${USERS.length}`);
console.log("");
console.log("Próximos pasos:");
console.log("  1. Verificar logins en http://localhost:8080/login con cada email.");
console.log("  2. davidcorreosl@gmail.com → /admin/seleccionar muestra ambas cards.");
console.log("  3. qr1/qr2/qr3 → bypass automático a /staff/scanner.");
console.log("  4. Recordá pedir a los usuarios que cambien su contraseña temporal.");
console.log("");

process.exit(fail > 0 ? 1 : 0);
