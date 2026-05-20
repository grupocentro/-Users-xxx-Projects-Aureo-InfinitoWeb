-- =============================================================================
-- verify-users.sql — auditoría de usuarios Infinito Water Park
-- =============================================================================
-- Ejecutar en Supabase SQL Editor después de correr scripts/setup-users.mjs.
-- Sólo SELECTs: no modifica datos.
-- =============================================================================


-- 1. Usuarios en auth.users (todos los 4 esperados)
SELECT
  u.email,
  u.id,
  u.created_at,
  u.email_confirmed_at IS NOT NULL AS confirmado,
  u.last_sign_in_at
FROM auth.users u
WHERE u.email IN (
  'davidcorreosl@gmail.com',
  'qr1@infinitowaterpark.com',
  'qr2@infinitowaterpark.com',
  'qr3@infinitowaterpark.com'
)
ORDER BY u.email;


-- 2. Profiles asociados (deberían existir por trigger handle_new_user)
SELECT
  p.email,
  p.nombre,
  p.apellido,
  p.id
FROM public.profiles p
WHERE p.email IN (
  'davidcorreosl@gmail.com',
  'qr1@infinitowaterpark.com',
  'qr2@infinitowaterpark.com',
  'qr3@infinitowaterpark.com'
)
ORDER BY p.email;


-- 3. Roles asignados — el chequeo más importante
SELECT
  u.email,
  ur.role,
  ur.created_at AS rol_asignado_en
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE u.email IN (
  'davidcorreosl@gmail.com',
  'qr1@infinitowaterpark.com',
  'qr2@infinitowaterpark.com',
  'qr3@infinitowaterpark.com'
)
ORDER BY u.email, ur.role;

-- Resultado esperado:
--   davidcorreosl@gmail.com    | admin
--   qr1@infinitowaterpark.com  | control_entradas
--   qr2@infinitowaterpark.com  | control_entradas
--   qr3@infinitowaterpark.com  | control_entradas


-- 4. Sanity check de has_role() — la función que enforces todos los guards
SELECT
  u.email,
  public.has_role(u.id, 'admin')             AS es_admin,
  public.has_role(u.id, 'editor')            AS es_editor,
  public.has_role(u.id, 'control_entradas')  AS es_staff
FROM auth.users u
WHERE u.email IN (
  'davidcorreosl@gmail.com',
  'qr1@infinitowaterpark.com',
  'qr2@infinitowaterpark.com',
  'qr3@infinitowaterpark.com'
)
ORDER BY u.email;

-- Resultado esperado:
--   davidcorreosl@gmail.com    | true  | false | false
--   qr1@infinitowaterpark.com  | false | false | true
--   qr2@infinitowaterpark.com  | false | false | true
--   qr3@infinitowaterpark.com  | false | false | true


-- 5. Detectar usuarios sin rol (no debería haber ninguno entre los 4)
SELECT u.email, 'sin rol asignado' AS warning
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE u.email IN (
  'davidcorreosl@gmail.com',
  'qr1@infinitowaterpark.com',
  'qr2@infinitowaterpark.com',
  'qr3@infinitowaterpark.com'
)
  AND ur.role IS NULL;


-- 6. Detectar usuarios con roles cruzados inesperados (ej: qrN con admin)
SELECT u.email, ur.role, 'rol inesperado' AS warning
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE
  (u.email IN ('qr1@infinitowaterpark.com','qr2@infinitowaterpark.com','qr3@infinitowaterpark.com')
   AND ur.role <> 'control_entradas')
  OR
  (u.email = 'davidcorreosl@gmail.com'
   AND ur.role NOT IN ('admin'));


-- 7. Total de usuarios y roles del sistema (informativo)
SELECT
  (SELECT COUNT(*) FROM auth.users)            AS total_auth_users,
  (SELECT COUNT(*) FROM public.profiles)       AS total_profiles,
  (SELECT COUNT(*) FROM public.user_roles)     AS total_user_roles,
  (SELECT COUNT(*) FROM public.user_roles WHERE role = 'admin')             AS total_admins,
  (SELECT COUNT(*) FROM public.user_roles WHERE role = 'editor')            AS total_editors,
  (SELECT COUNT(*) FROM public.user_roles WHERE role = 'control_entradas')  AS total_staff;
