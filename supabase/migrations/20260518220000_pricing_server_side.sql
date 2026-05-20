-- =============================================================================
-- ETAPA 1 — Seguridad crítica de pagos: pricing server-side
-- =============================================================================
-- Cierra la vulnerabilidad donde el cliente podía enviar cualquier `total`
-- al insertar en `compras` (RLS sólo controlaba ownership, no monto).
--
-- A partir de esta migración:
--   1. El cliente puede mandar lo que quiera en `total`, el trigger lo
--      sobreescribe con el precio oficial leído de `tipos_entrada` / `eventos`.
--   2. Una compra `aprobado` no puede degradarse a otro estado (trigger guardia).
--   3. Nueva columna `fecha_visita` permite calcular precio_semana vs precio_finde.
--   4. Nueva columna `precio_unitario` queda como snapshot auditable.
--
-- Compatibilidad con datos viejos:
--   - Las dos columnas nuevas son NULLABLE y/o DEFAULT 0 → no rompen filas existentes.
--   - El trigger sólo recalcula en INSERT o en UPDATE de campos económicos relevantes.
--   - Updates del webhook (estado_pago, mp_payment_id) NO disparan recálculo.
-- =============================================================================


-- 1. Columnas nuevas en `compras`
ALTER TABLE public.compras
  ADD COLUMN IF NOT EXISTS fecha_visita    date           NULL,
  ADD COLUMN IF NOT EXISTS precio_unitario numeric(10,2)  NOT NULL DEFAULT 0;


-- 2. Función pura que calcula el total oficial leyendo de DB
--    SECURITY DEFINER porque puede ser invocada por triggers en contextos con
--    distintos privilegios. STABLE: no muta datos.
CREATE OR REPLACE FUNCTION public.calcular_total_compra(
  _tipo_entrada_id uuid,
  _evento_id       uuid,
  _cantidad        integer,
  _fecha_visita    date
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_precio_unitario numeric := NULL;
  v_dow             integer;
  v_is_weekend      boolean;
BEGIN
  -- Validación de cantidad (defensa en profundidad; el frontend también valida).
  IF _cantidad IS NULL OR _cantidad < 1 OR _cantidad > 100 THEN
    RAISE EXCEPTION 'Cantidad inválida (debe ser 1..100): %', _cantidad
      USING ERRCODE = '22023';
  END IF;

  -- Evento tiene prioridad si está seteado (las compras de evento ignoran tipo_entrada).
  IF _evento_id IS NOT NULL THEN
    SELECT precio INTO v_precio_unitario
    FROM public.eventos
    WHERE id = _evento_id AND estado = 'activo';

    IF v_precio_unitario IS NULL THEN
      RAISE EXCEPTION 'Evento % no encontrado o inactivo', _evento_id
        USING ERRCODE = '22023';
    END IF;

  ELSIF _tipo_entrada_id IS NOT NULL THEN
    IF _fecha_visita IS NOT NULL THEN
      -- 0=domingo, 5=viernes, 6=sábado → fin de semana operativo del parque
      v_dow := EXTRACT(DOW FROM _fecha_visita)::int;
      v_is_weekend := v_dow IN (0, 5, 6);

      IF v_is_weekend THEN
        SELECT precio_finde INTO v_precio_unitario
        FROM public.tipos_entrada
        WHERE id = _tipo_entrada_id AND estado = 'activo';
      ELSE
        SELECT precio_semana INTO v_precio_unitario
        FROM public.tipos_entrada
        WHERE id = _tipo_entrada_id AND estado = 'activo';
      END IF;
    ELSE
      -- Sin fecha → defensivo: tomar el mayor de los dos precios.
      -- Evita undercharge si el frontend deja de mandar fecha por error.
      SELECT GREATEST(precio_semana, precio_finde) INTO v_precio_unitario
      FROM public.tipos_entrada
      WHERE id = _tipo_entrada_id AND estado = 'activo';
    END IF;

    IF v_precio_unitario IS NULL THEN
      RAISE EXCEPTION 'Tipo de entrada % no encontrado o inactivo', _tipo_entrada_id
        USING ERRCODE = '22023';
    END IF;

  ELSE
    RAISE EXCEPTION 'Debe especificar tipo_entrada_id o evento_id'
      USING ERRCODE = '22023';
  END IF;

  RETURN v_precio_unitario * _cantidad;
END;
$$;


-- 3. Trigger que sobreescribe `total` con el cálculo oficial
CREATE OR REPLACE FUNCTION public.compras_set_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
BEGIN
  -- En UPDATE: si NINGÚN campo económico cambia, no recalcular
  -- (permite que el webhook actualice estado_pago/mp_payment_id sin recálculo).
  IF TG_OP = 'UPDATE' THEN
    IF NEW.tipo_entrada_id IS NOT DISTINCT FROM OLD.tipo_entrada_id
       AND NEW.evento_id    IS NOT DISTINCT FROM OLD.evento_id
       AND NEW.cantidad     =  OLD.cantidad
       AND NEW.fecha_visita IS NOT DISTINCT FROM OLD.fecha_visita
    THEN
      -- Conservar los valores oficiales previos, ignorar cualquier intento de
      -- pisarlos desde el cliente.
      NEW.total           := OLD.total;
      NEW.precio_unitario := OLD.precio_unitario;
      RETURN NEW;
    END IF;
  END IF;

  v_total := public.calcular_total_compra(
    NEW.tipo_entrada_id,
    NEW.evento_id,
    NEW.cantidad,
    NEW.fecha_visita
  );

  -- Cualquier valor enviado por el cliente queda sobreescrito.
  NEW.total           := v_total;
  NEW.precio_unitario := v_total / NEW.cantidad;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compras_set_total ON public.compras;
CREATE TRIGGER trg_compras_set_total
  BEFORE INSERT OR UPDATE ON public.compras
  FOR EACH ROW
  EXECUTE FUNCTION public.compras_set_total();


-- 4. Trigger guardia: bloquea downgrades desde `aprobado`.
--    Una vez que la compra fue aprobada y se emitieron QR, ningún webhook
--    tardío puede dejarla en `rechazado` ni `pendiente` ni `payment_mismatch`.
CREATE OR REPLACE FUNCTION public.compras_guard_estado()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.estado_pago = 'aprobado' AND NEW.estado_pago <> 'aprobado' THEN
    RAISE EXCEPTION
      'No se puede degradar compra % desde estado aprobado a %',
      NEW.id, NEW.estado_pago
      USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compras_guard_estado ON public.compras;
CREATE TRIGGER trg_compras_guard_estado
  BEFORE UPDATE ON public.compras
  FOR EACH ROW
  EXECUTE FUNCTION public.compras_guard_estado();


-- 5. Índices útiles para el webhook y el admin
CREATE INDEX IF NOT EXISTS idx_compras_mp_payment_id
  ON public.compras (mp_payment_id)
  WHERE mp_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_compras_estado_pago
  ON public.compras (estado_pago);

CREATE INDEX IF NOT EXISTS idx_compras_fecha_visita
  ON public.compras (fecha_visita)
  WHERE fecha_visita IS NOT NULL;


-- 6. Nota operativa (NO modifica nada): valores válidos esperados en estado_pago
--    'pendiente'        creada, esperando MP
--    'aprobado'         pagada y verificada
--    'rechazado'        pago rechazado/cancelado por MP
--    'payment_mismatch' MP aprobó pero el monto pagado != compras.total
--                       (NO emite QR, queda para investigación admin)
