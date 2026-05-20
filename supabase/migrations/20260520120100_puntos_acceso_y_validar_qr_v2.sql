-- =============================================================================
-- FASE 0 — Puntos de acceso + extensión de RPC validar_qr
-- =============================================================================
-- 1. Crea tabla puntos_acceso para identificar la "puerta" donde se valida.
-- 2. Agrega segunda firma de validar_qr(text, jsonb) que acepta metadata extra
--    del cliente (punto_acceso, device, user_agent, etc.).
-- 3. La firma vieja validar_qr(text) se mantiene como wrapper —
--    BACKWARDS-COMPATIBLE: el frontend actual sigue funcionando sin cambios.
-- =============================================================================


-- =============================================================================
-- 1. PUNTOS DE ACCESO
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.puntos_acceso (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       text NOT NULL UNIQUE,
  descripcion  text NULL,
  activo       boolean NOT NULL DEFAULT true,
  orden        int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.puntos_acceso ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_puntos_acceso_activo_orden
  ON public.puntos_acceso (activo, orden);

DROP TRIGGER IF EXISTS trg_puntos_acceso_updated_at ON public.puntos_acceso;
CREATE TRIGGER trg_puntos_acceso_updated_at
BEFORE UPDATE ON public.puntos_acceso
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Lectura: todos los usuarios autenticados (staff necesita listarlos).
CREATE POLICY "Authenticated leen puntos_acceso" ON public.puntos_acceso
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Escritura: sólo admin.
CREATE POLICY "Admin escribe puntos_acceso" ON public.puntos_acceso
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin actualiza puntos_acceso" ON public.puntos_acceso
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin elimina puntos_acceso" ON public.puntos_acceso
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed iniciales (idempotente)
INSERT INTO public.puntos_acceso (nombre, descripcion, orden) VALUES
  ('Entrada principal',      'Acceso general al parque',                1),
  ('Entrada eventos',        'Acceso para eventos especiales',          2),
  ('Acceso rápido / staff',  'Para staff y validaciones internas',      3),
  ('Puerta secundaria',      'Acceso alternativo',                      4)
ON CONFLICT (nombre) DO NOTHING;


-- =============================================================================
-- 2. validar_qr(text, jsonb) — versión con metadata extra del cliente
-- =============================================================================
-- Misma lógica atómica que la versión de 1 arg, pero acepta y persiste
-- metadata enriquecido. La fila de qr_validaciones final guarda el merge:
--   (metadata interno de cada paso) || (metadata externo del cliente)
-- El interno gana en caso de colisión de claves.
--
-- Claves esperadas en _metadata del cliente (libres, no obligatorias):
--   - punto_acceso_id  uuid
--   - punto_acceso     text
--   - device_type      text  ('mobile' | 'desktop' | 'tablet')
--   - user_agent       text
CREATE OR REPLACE FUNCTION public.validar_qr(_uuid_code text, _metadata jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code        uuid;
  v_user        uuid := auth.uid();
  v_qr          record;
  v_comprador   text;
  v_now         timestamptz := now();
  v_extra       jsonb := COALESCE(_metadata, '{}'::jsonb);
BEGIN
  -- Paso 0: cast UUID con manejo de error de formato.
  BEGIN
    v_code := _uuid_code::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    INSERT INTO public.qr_validaciones (uuid_code, scanner_id, resultado, motivo, metadata)
    VALUES (NULL, v_user, 'no_encontrado', 'Formato UUID inválido',
            v_extra || jsonb_build_object('raw_input_len', length(_uuid_code)));
    RETURN jsonb_build_object(
      'ok', false,
      'resultado', 'no_encontrado',
      'mensaje', 'Código con formato inválido'
    );
  END;

  -- Paso 1: bloquear y leer el QR + datos de la compra + tipo de entrada.
  SELECT
    q.id, q.usado, q.usado_at, q.usado_por, q.compra_id,
    c.estado_pago, c.fecha_visita, c.user_id AS comprador_id, c.cantidad,
    te.nombre AS tipo_entrada_nombre,
    e.nombre  AS evento_nombre,
    e.fecha   AS evento_fecha
  INTO v_qr
  FROM public.codigos_qr  q
  LEFT JOIN public.compras        c  ON c.id  = q.compra_id
  LEFT JOIN public.tipos_entrada  te ON te.id = c.tipo_entrada_id
  LEFT JOIN public.eventos        e  ON e.id  = c.evento_id
  WHERE q.uuid_code = v_code
  FOR UPDATE OF q;

  IF NOT FOUND THEN
    INSERT INTO public.qr_validaciones (uuid_code, scanner_id, resultado, motivo, metadata)
    VALUES (v_code, v_user, 'no_encontrado', 'Código QR no existe en el sistema', v_extra);
    RETURN jsonb_build_object(
      'ok', false,
      'resultado', 'no_encontrado',
      'mensaje', 'QR no encontrado'
    );
  END IF;

  -- Paso 2: compra debe estar aprobada.
  IF v_qr.estado_pago IS DISTINCT FROM 'aprobado' THEN
    INSERT INTO public.qr_validaciones (qr_id, uuid_code, compra_id, scanner_id, resultado, motivo, metadata)
    VALUES (v_qr.id, v_code, v_qr.compra_id, v_user, 'compra_no_aprobada',
            format('estado_pago=%s', COALESCE(v_qr.estado_pago, 'null')),
            v_extra || jsonb_build_object('estado_pago', v_qr.estado_pago));
    RETURN jsonb_build_object(
      'ok', false,
      'resultado', 'compra_no_aprobada',
      'mensaje', 'La compra de este QR no está aprobada',
      'estado_pago', v_qr.estado_pago,
      'qr_id', v_qr.id,
      'compra_id', v_qr.compra_id
    );
  END IF;

  -- Paso 3: ya usado.
  IF v_qr.usado THEN
    INSERT INTO public.qr_validaciones (qr_id, uuid_code, compra_id, scanner_id, resultado, motivo, metadata)
    VALUES (v_qr.id, v_code, v_qr.compra_id, v_user, 'ya_usado', NULL, v_extra);
    RETURN jsonb_build_object(
      'ok', false,
      'resultado', 'ya_usado',
      'mensaje', 'Este QR ya fue utilizado',
      'qr_id', v_qr.id,
      'compra_id', v_qr.compra_id,
      'ya_usado_at', v_qr.usado_at,
      'ya_usado_por', v_qr.usado_por,
      'fecha_visita', v_qr.fecha_visita
    );
  END IF;

  -- Paso 4: validación de fecha — INFORMATIVA (mismo criterio que v1).

  -- Paso 5: marcar como usado.
  UPDATE public.codigos_qr
     SET usado     = true,
         usado_at  = v_now,
         usado_por = v_user
   WHERE id = v_qr.id;

  INSERT INTO public.qr_validaciones (qr_id, uuid_code, compra_id, scanner_id, resultado, metadata)
  VALUES (v_qr.id, v_code, v_qr.compra_id, v_user, 'valido', v_extra);

  SELECT NULLIF(TRIM(COALESCE(nombre, '') || ' ' || COALESCE(apellido, '')), '')
    INTO v_comprador
  FROM public.profiles
  WHERE id = v_qr.comprador_id;

  RETURN jsonb_build_object(
    'ok', true,
    'resultado', 'valido',
    'mensaje', 'Entrada válida',
    'qr_id', v_qr.id,
    'compra_id', v_qr.compra_id,
    'usado_at', v_now,
    'fecha_visita', COALESCE(v_qr.fecha_visita, v_qr.evento_fecha),
    'tipo_entrada', COALESCE(v_qr.tipo_entrada_nombre, v_qr.evento_nombre),
    'cantidad', v_qr.cantidad,
    'comprador_nombre', v_comprador
  );
END;
$$;

REVOKE ALL ON FUNCTION public.validar_qr(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validar_qr(text, jsonb) TO authenticated;


-- =============================================================================
-- 3. validar_qr(text) — wrapper backwards-compatible
-- =============================================================================
-- Re-define la firma vieja como un wrapper que delega a la nueva con metadata vacía.
-- Esto preserva el comportamiento de cualquier llamado supabase.rpc("validar_qr", { _uuid_code })
-- existente, sin requerir despliegue coordinado del frontend.
CREATE OR REPLACE FUNCTION public.validar_qr(_uuid_code text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.validar_qr(_uuid_code, '{}'::jsonb);
$$;

REVOKE ALL ON FUNCTION public.validar_qr(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validar_qr(text) TO authenticated;
