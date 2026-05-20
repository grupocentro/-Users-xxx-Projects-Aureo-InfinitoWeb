
-- 1. Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'control_entradas');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL DEFAULT '',
  apellido TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  whatsapp TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Eventos table
CREATE TABLE public.eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  edicion TEXT DEFAULT '',
  fecha DATE,
  hora_inicio TIME,
  hora_fin TIME,
  descripcion TEXT DEFAULT '',
  tagline TEXT DEFAULT '',
  imagen_url TEXT DEFAULT '',
  gradiente TEXT DEFAULT '',
  emoji TEXT DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'activo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

-- 5. Atracciones table
CREATE TABLE public.atracciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  ubicacion TEXT DEFAULT '',
  descripcion TEXT DEFAULT '',
  imagen_url TEXT DEFAULT '',
  tags JSONB DEFAULT '[]'::jsonb,
  badge TEXT DEFAULT '',
  rating NUMERIC(2,1) DEFAULT 0,
  reviews INTEGER DEFAULT 0,
  duracion TEXT DEFAULT '',
  edad_min INTEGER DEFAULT 0,
  intensidad TEXT DEFAULT '',
  accent TEXT DEFAULT '',
  orden INTEGER DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'activo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.atracciones ENABLE ROW LEVEL SECURITY;

-- 6. Tipos de entrada table
CREATE TABLE public.tipos_entrada (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  emoji TEXT DEFAULT '',
  tag TEXT DEFAULT '',
  features JSONB DEFAULT '[]'::jsonb,
  precio_semana NUMERIC(10,2) NOT NULL DEFAULT 0,
  precio_finde NUMERIC(10,2) NOT NULL DEFAULT 0,
  highlight BOOLEAN DEFAULT false,
  estado TEXT NOT NULL DEFAULT 'activo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tipos_entrada ENABLE ROW LEVEL SECURITY;

-- 7. Compras table
CREATE TABLE public.compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tipo_entrada_id UUID REFERENCES public.tipos_entrada(id),
  evento_id UUID REFERENCES public.eventos(id),
  cantidad INTEGER NOT NULL DEFAULT 1,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  estado_pago TEXT NOT NULL DEFAULT 'pendiente',
  mp_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;

-- 8. Codigos QR table
CREATE TABLE public.codigos_qr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id UUID REFERENCES public.compras(id) ON DELETE CASCADE NOT NULL,
  uuid_code UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  usado BOOLEAN NOT NULL DEFAULT false,
  usado_at TIMESTAMPTZ,
  usado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.codigos_qr ENABLE ROW LEVEL SECURITY;

-- 9. Contenido web table
CREATE TABLE public.contenido_web (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave TEXT NOT NULL UNIQUE,
  valor TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contenido_web ENABLE ROW LEVEL SECURITY;

-- 10. Security definer function: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 11. Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre, apellido)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
    COALESCE(NEW.raw_user_meta_data->>'apellido', '')
  );

  -- Auto-assign admin role to davidcorreosl@gmail.com
  IF NEW.email = 'davidcorreosl@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 12. RLS Policies

-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- user_roles
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- eventos (public read, admin/editor write)
CREATE POLICY "Public read eventos" ON public.eventos FOR SELECT USING (true);
CREATE POLICY "Admin/editor insert eventos" ON public.eventos FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Admin/editor update eventos" ON public.eventos FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Admin/editor delete eventos" ON public.eventos FOR DELETE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- atracciones (public read, admin/editor write)
CREATE POLICY "Public read atracciones" ON public.atracciones FOR SELECT USING (true);
CREATE POLICY "Admin/editor insert atracciones" ON public.atracciones FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Admin/editor update atracciones" ON public.atracciones FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Admin/editor delete atracciones" ON public.atracciones FOR DELETE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- tipos_entrada (public read, admin/editor write)
CREATE POLICY "Public read tipos_entrada" ON public.tipos_entrada FOR SELECT USING (true);
CREATE POLICY "Admin/editor insert tipos_entrada" ON public.tipos_entrada FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Admin/editor update tipos_entrada" ON public.tipos_entrada FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Admin/editor delete tipos_entrada" ON public.tipos_entrada FOR DELETE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- contenido_web (public read, admin/editor write)
CREATE POLICY "Public read contenido_web" ON public.contenido_web FOR SELECT USING (true);
CREATE POLICY "Admin/editor insert contenido_web" ON public.contenido_web FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Admin/editor update contenido_web" ON public.contenido_web FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Admin/editor delete contenido_web" ON public.contenido_web FOR DELETE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- compras
CREATE POLICY "Users can view own compras" ON public.compras FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all compras" ON public.compras FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can insert compras" ON public.compras FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update compras" ON public.compras FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- codigos_qr
CREATE POLICY "Users can view own qr" ON public.codigos_qr FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.compras WHERE compras.id = codigos_qr.compra_id AND compras.user_id = auth.uid())
);
CREATE POLICY "Admins can view all qr" ON public.codigos_qr FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin/editor insert qr" ON public.codigos_qr FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Admin/staff update qr" ON public.codigos_qr FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'control_entradas'));
CREATE POLICY "Admin delete qr" ON public.codigos_qr FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
