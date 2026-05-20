
CREATE TABLE public.actividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  descripcion text DEFAULT '',
  imagen_url text DEFAULT '',
  ubicacion text DEFAULT '',
  duracion text DEFAULT '',
  intensidad text DEFAULT '',
  rating numeric DEFAULT 0,
  reviews integer DEFAULT 0,
  fecha date,
  hora text DEFAULT '',
  estado text NOT NULL DEFAULT 'activo',
  orden integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.actividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read actividades" ON public.actividades FOR SELECT USING (true);
CREATE POLICY "Admin/editor insert actividades" ON public.actividades FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));
CREATE POLICY "Admin/editor update actividades" ON public.actividades FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));
CREATE POLICY "Admin/editor delete actividades" ON public.actividades FOR DELETE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));
