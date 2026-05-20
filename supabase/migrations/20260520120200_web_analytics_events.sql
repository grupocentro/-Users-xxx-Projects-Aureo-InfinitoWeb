-- =============================================================================
-- FASE 0 — Web Analytics: eventos de tracking del sitio público
-- =============================================================================
-- Tabla append-only para tracking de comportamiento del sitio público.
--
-- Privacy-first:
--   - NO se guarda IP, email, teléfono, nombre, ni user_id.
--   - session_id es un identificador anónimo generado en cliente.
--   - Trigger sanitiza el campo `metadata` removiendo claves sensibles
--     (defensa en profundidad si el frontend manda algo por error).
--
-- RLS:
--   - INSERT: público (anon + authenticated) → el tracking funciona sin login.
--   - SELECT: sólo admin/editor.
--   - UPDATE/DELETE: nadie.
-- =============================================================================


CREATE TABLE IF NOT EXISTS public.web_analytics_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      text NOT NULL
                    CHECK (event_type IN (
                      'page_view',
                      'button_click',
                      'banner_click',
                      'slide_click',
                      'oferta_click',
                      'evento_click',
                      'comprar_entrada_click',
                      'whatsapp_click',
                      'mapa_click',
                      'contacto_click'
                    )),
  page_path       text NULL,
  element_id      text NULL,
  element_label   text NULL,
  referrer        text NULL,
  device_type     text NULL
                    CHECK (device_type IS NULL OR device_type IN ('mobile', 'desktop', 'tablet', 'unknown')),
  browser         text NULL,
  session_id      text NULL,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.web_analytics_events ENABLE ROW LEVEL SECURITY;

-- Índices operativos
CREATE INDEX IF NOT EXISTS idx_wae_created_at   ON public.web_analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wae_event_type   ON public.web_analytics_events (event_type);
CREATE INDEX IF NOT EXISTS idx_wae_page_path    ON public.web_analytics_events (page_path);
CREATE INDEX IF NOT EXISTS idx_wae_session_id   ON public.web_analytics_events (session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wae_device_type  ON public.web_analytics_events (device_type) WHERE device_type IS NOT NULL;


-- =============================================================================
-- Sanitización defensiva del metadata
-- =============================================================================
-- Aunque el cliente NO debería enviar datos personales, este trigger garantiza
-- que campos como email/phone/nombre/ip/user_id sean removidos antes del INSERT.
CREATE OR REPLACE FUNCTION public.sanitize_web_analytics_metadata()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.metadata IS NULL THEN
    NEW.metadata := '{}'::jsonb;
  ELSE
    NEW.metadata :=
      NEW.metadata
        - 'email'
        - 'phone'
        - 'telefono'
        - 'whatsapp'
        - 'nombre'
        - 'name'
        - 'apellido'
        - 'lastname'
        - 'ip'
        - 'ip_address'
        - 'user_id'
        - 'userId'
        - 'password';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sanitize_web_analytics_metadata ON public.web_analytics_events;
CREATE TRIGGER trg_sanitize_web_analytics_metadata
BEFORE INSERT ON public.web_analytics_events
FOR EACH ROW EXECUTE FUNCTION public.sanitize_web_analytics_metadata();


-- =============================================================================
-- RLS
-- =============================================================================

-- INSERT: cualquiera (incluso sin sesión) puede registrar eventos
CREATE POLICY "Cualquiera puede insertar eventos de analytics" ON public.web_analytics_events
  FOR INSERT
  WITH CHECK (true);

-- SELECT: sólo admin/editor leen
CREATE POLICY "Admin/editor leen web_analytics_events" ON public.web_analytics_events
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- Sin políticas UPDATE/DELETE → bloqueado para todos
-- (append-only desde el punto de vista del cliente)
