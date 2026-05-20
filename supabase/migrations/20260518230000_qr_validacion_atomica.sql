-- =============================================================================
-- ETAPA 2 — Validación QR atómica + auditoría append-only
-- =============================================================================
-- Cierra la race condition del Scanner: hoy el frontend hace
--   SELECT codigos_qr → check usado → UPDATE codigos_qr,
-- que NO es atómico. Dos scans concurrentes del mismo QR podían pasar ambos.
--
-- Después de esta migración:
--   - La validación se hace en una RPC SECURITY DEFINER con FOR UPDATE row lock.
--   - El frontend nunca decide la validez; solo envía el código y muestra resultado.
--   - Cada intento (válido, fallido, error) queda en `qr_validaciones`
--     (append-only, sin UPDATE ni DELETE desde cliente).
-- =============================================================================


-- 1. Tabla de auditoría append-only
CREATE TABLE IF NOT EXISTS public.qr_validaciones (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id         uuid REFERENCES public.codigos_qr(id) ON DELETE SET NULL,
  uuid_code     uuid NULL,                                       -- snapshot del código escaneado (puede ser NULL si formato inválido)
  compra_id     uuid REFERENCES public.compras(id)    ON DELETE SET NULL,
  scanner_id    uuid REFERENCES auth.users(id)        ON DELETE SET NULL,
  resultado     text NOT NULL,                                   -- ver enum lógico abajo
  motivo        text NULL,                                       -- detalle libre para depuración
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Valores válidos esperados (no enum porque text es más flexible y NO afecta seguridad):
--   'valido'
--   'ya_usado'
--   'no_encontrado'
--   'compra_no_aprobada'
--   'fecha_invalida'        (reservado; no se emite todavía)
--   'error'                 (excepción inesperada)

ALTER TABLE public.qr_validaciones ENABLE ROW LEVEL SECURITY;

-- Índices para consultas operativas
CREATE INDEX IF NOT EXISTS idx_qr_validaciones_created_at  ON public.qr_validaciones (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_validaciones_compra_id   ON public.qr_validaciones (compra_id) WHERE compra_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qr_validaciones_scanner_id  ON public.qr_validaciones (scanner_id) WHERE scanner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qr_validaciones_resultado   ON public.qr_validaciones (resultado);

-- RLS: append-only desde el lado del cliente.
--   - INSERT: ningún rol (la RPC SECURITY DEFINER bypassa RLS).
--   - SELECT: admin y control_entradas pueden leer auditoría.
--   - UPDATE/DELETE: nadie. (Append-only.)
CREATE POLICY "Admin can read qr_validaciones"  ON public.qr_validaciones
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can read qr_validaciones"  ON public.qr_validaciones
  FOR SELECT USING (public.has_role(auth.uid(), 'control_entradas'));

-- (Sin políticas INSERT/UPDATE/DELETE → bloqueado por RLS para todos los roles
--  excepto las funciones SECURITY DEFINER, que ejecutan con el owner.)


-- 2. RPC atómica de validación
--
--    Acepta TEXT para tolerar input "raro" del scanner; castea internamente
--    a UUID con manejo del error de formato (registra 'no_encontrado').
--
--    Atomicidad garantizada por `SELECT ... FOR UPDATE OF q` que toma row lock
--    sobre `codigos_qr`. Otra invocación concurrente con el mismo UUID queda
--    bloqueada hasta que esta termine; cuando reanuda, ya verá `usado = true`
--    y devolverá `ya_usado`. Nunca puede haber dos `valido` para el mismo QR.
CREATE OR REPLACE FUNCTION public.validar_qr(_uuid_code text)
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
BEGIN
  -- Paso 0: cast UUID con manejo de error de formato.
  BEGIN
    v_code := _uuid_code::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    INSERT INTO public.qr_validaciones (uuid_code, scanner_id, resultado, motivo, metadata)
    VALUES (NULL, v_user, 'no_encontrado', 'Formato UUID inválido',
            jsonb_build_object('raw_input_len', length(_uuid_code)));
    RETURN jsonb_build_object(
      'ok', false,
      'resultado', 'no_encontrado',
      'mensaje', 'Código con formato inválido'
    );
  END;

  -- Paso 1: bloquear y leer el QR + datos de la compra + tipo de entrada en una sola lectura.
  --         FOR UPDATE OF q evita carrera con otra validación del mismo código.
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
    INSERT INTO public.qr_validaciones (uuid_code, scanner_id, resultado, motivo)
    VALUES (v_code, v_user, 'no_encontrado', 'Código QR no existe en el sistema');
    RETURN jsonb_build_object(
      'ok', false,
      'resultado', 'no_encontrado',
      'mensaje', 'QR no encontrado'
    );
  END IF;

  -- Paso 2: compra debe estar aprobada (cubre 'pendiente', 'rechazado', 'payment_mismatch').
  IF v_qr.estado_pago IS DISTINCT FROM 'aprobado' THEN
    INSERT INTO public.qr_validaciones (qr_id, uuid_code, compra_id, scanner_id, resultado, motivo, metadata)
    VALUES (v_qr.id, v_code, v_qr.compra_id, v_user, 'compra_no_aprobada',
            format('estado_pago=%s', COALESCE(v_qr.estado_pago, 'null')),
            jsonb_build_object('estado_pago', v_qr.estado_pago));
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
    INSERT INTO public.qr_validaciones (qr_id, uuid_code, compra_id, scanner_id, resultado, motivo)
    VALUES (v_qr.id, v_code, v_qr.compra_id, v_user, 'ya_usado', NULL);
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

  -- Paso 4: validación de fecha — INFORMATIVA por ahora.
  --   El parque puede operar con flexibilidad (gente que llega tarde, eventos
  --   reagendados, errores administrativos). NO bloqueamos por fecha todavía.
  --   La fecha se devuelve al staff para que vea el día comprado y decida.
  --   Para activar enforcement duro en el futuro, descomentar:
  --
  -- IF v_qr.fecha_visita IS NOT NULL AND v_qr.fecha_visita <> current_date THEN
  --   INSERT INTO public.qr_validaciones (qr_id, uuid_code, compra_id, scanner_id, resultado, motivo, metadata)
  --   VALUES (v_qr.id, v_code, v_qr.compra_id, v_user, 'fecha_invalida',
  --           format('fecha_visita=%s, today=%s', v_qr.fecha_visita, current_date),
  --           jsonb_build_object('fecha_visita', v_qr.fecha_visita, 'today', current_date));
  --   RETURN jsonb_build_object(
  --     'ok', false,
  --     'resultado', 'fecha_invalida',
  --     'mensaje', format('Esta entrada es para el %s', v_qr.fecha_visita),
  --     'fecha_visita', v_qr.fecha_visita
  --   );
  -- END IF;

  -- Paso 5: marcar como usado (la fila ya está row-locked por FOR UPDATE).
  UPDATE public.codigos_qr
     SET usado     = true,
         usado_at  = v_now,
         usado_por = v_user
   WHERE id = v_qr.id;

  INSERT INTO public.qr_validaciones (qr_id, uuid_code, compra_id, scanner_id, resultado)
  VALUES (v_qr.id, v_code, v_qr.compra_id, v_user, 'valido');

  -- Datos de comprador para mostrar al staff.
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


-- 3. Permisos de ejecución
--    Quitar EXECUTE por defecto a PUBLIC y conceder explícito a authenticated.
--    `anon` NO debe poder validar.
REVOKE ALL ON FUNCTION public.validar_qr(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validar_qr(text) TO authenticated;


-- 4. Nota operativa: para investigar incidencias el admin puede correr
--      SELECT * FROM qr_validaciones ORDER BY created_at DESC LIMIT 100;
--    y filtrar por resultado, scanner_id o compra_id.
