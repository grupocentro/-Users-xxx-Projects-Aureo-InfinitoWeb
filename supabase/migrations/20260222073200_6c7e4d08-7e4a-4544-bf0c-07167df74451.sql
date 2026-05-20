
CREATE TABLE public.hero_slides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tag text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  rating numeric NOT NULL DEFAULT 0,
  image_url text NOT NULL DEFAULT '',
  accent text NOT NULL DEFAULT 'hsl(var(--water-400))',
  cta_text text NOT NULL DEFAULT 'Ver más',
  video_url text NULL,
  orden integer NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'activo',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read hero_slides" ON public.hero_slides
  FOR SELECT USING (true);

CREATE POLICY "Admin/editor insert hero_slides" ON public.hero_slides
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));

CREATE POLICY "Admin/editor update hero_slides" ON public.hero_slides
  FOR UPDATE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));

CREATE POLICY "Admin/editor delete hero_slides" ON public.hero_slides
  FOR DELETE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'editor'));
