-- =============================================================================
-- FASE 0 — Modo Web: tablas para Noticias, Ofertas y Calendario público
-- =============================================================================
-- Aditiva. No toca tablas existentes. Backwards-compatible.
--
-- Tablas creadas:
--   - public.noticias
--   - public.ofertas
--   - public.calendario
--
-- Convención: RLS habilitada en todas. Lectura pública sólo cuando el contenido
-- está marcado como visible; escritura sólo admin/editor.
-- =============================================================================


-- 0. Helper reutilizable: trigger BEFORE UPDATE para mantener updated_at
--    Se crea idempotente; si ya existe, queda igual.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


-- =============================================================================
-- 1. NOTICIAS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.noticias (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo              text NOT NULL,
  cuerpo              text NULL,
  imagen_url          text NULL,
  fecha_publicacion   timestamptz NOT NULL DEFAULT now(),
  estado              text NOT NULL DEFAULT 'borrador'
                        CHECK (estado IN ('borrador', 'publicado', 'archivado')),
  orden               int  NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.noticias ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_noticias_estado            ON public.noticias (estado);
CREATE INDEX IF NOT EXISTS idx_noticias_fecha_publicacion ON public.noticias (fecha_publicacion DESC);
CREATE INDEX IF NOT EXISTS idx_noticias_orden             ON public.noticias (orden);

DROP TRIGGER IF EXISTS trg_noticias_updated_at ON public.noticias;
CREATE TRIGGER trg_noticias_updated_at
BEFORE UPDATE ON public.noticias
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Lectura pública: sólo lo publicado
CREATE POLICY "Noticias publicadas son públicas" ON public.noticias
  FOR SELECT
  USING (estado = 'publicado');

-- Admin/editor ven todo
CREATE POLICY "Admin/editor leen todas las noticias" ON public.noticias
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admin/editor escriben noticias" ON public.noticias
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admin/editor actualizan noticias" ON public.noticias
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admin/editor eliminan noticias" ON public.noticias
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));


-- =============================================================================
-- 2. OFERTAS / PROMOCIONES
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ofertas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo          text NOT NULL,
  descripcion     text NULL,
  descuento_pct   numeric(5,2) NULL
                    CHECK (descuento_pct IS NULL OR (descuento_pct >= 0 AND descuento_pct <= 100)),
  vigencia_desde  date NULL,
  vigencia_hasta  date NULL,
  imagen_url      text NULL,
  estado          text NOT NULL DEFAULT 'borrador'
                    CHECK (estado IN ('borrador', 'activa', 'expirada', 'archivada')),
  orden           int  NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (vigencia_desde IS NULL OR vigencia_hasta IS NULL OR vigencia_desde <= vigencia_hasta)
);

ALTER TABLE public.ofertas ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ofertas_estado    ON public.ofertas (estado);
CREATE INDEX IF NOT EXISTS idx_ofertas_vigencia  ON public.ofertas (vigencia_desde, vigencia_hasta);
CREATE INDEX IF NOT EXISTS idx_ofertas_orden     ON public.ofertas (orden);

DROP TRIGGER IF EXISTS trg_ofertas_updated_at ON public.ofertas;
CREATE TRIGGER trg_ofertas_updated_at
BEFORE UPDATE ON public.ofertas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Lectura pública: ofertas activas dentro de su vigencia
CREATE POLICY "Ofertas activas vigentes son públicas" ON public.ofertas
  FOR SELECT
  USING (
    estado = 'activa'
    AND (vigencia_desde IS NULL OR vigencia_desde <= current_date)
    AND (vigencia_hasta IS NULL OR vigencia_hasta >= current_date)
  );

CREATE POLICY "Admin/editor leen todas las ofertas" ON public.ofertas
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admin/editor escriben ofertas" ON public.ofertas
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admin/editor actualizan ofertas" ON public.ofertas
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admin/editor eliminan ofertas" ON public.ofertas
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));


-- =============================================================================
-- 3. CALENDARIO PÚBLICO
-- =============================================================================
-- Tabla de etiquetas/notas/precio_modificador por día. Una fila por fecha.
-- El sitio público lee todo el calendario (es visible para todos).
CREATE TABLE IF NOT EXISTS public.calendario (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha                date NOT NULL UNIQUE,
  etiqueta             text NULL,
  color_hex            text NULL
                         CHECK (color_hex IS NULL OR color_hex ~* '^#[0-9a-f]{6}$'),
  precio_modificador   numeric(10,2) NULL,                  -- libre: porcentaje, ARS, o multiplicador. Lo interpreta el frontend.
  nota                 text NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.calendario ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_calendario_fecha ON public.calendario (fecha);

DROP TRIGGER IF EXISTS trg_calendario_updated_at ON public.calendario;
CREATE TRIGGER trg_calendario_updated_at
BEFORE UPDATE ON public.calendario
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Lectura pública: el calendario es visible siempre (no hay datos sensibles).
CREATE POLICY "Calendario es público en lectura" ON public.calendario
  FOR SELECT
  USING (true);

CREATE POLICY "Admin/editor escriben calendario" ON public.calendario
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admin/editor actualizan calendario" ON public.calendario
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admin/editor eliminan calendario" ON public.calendario
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
