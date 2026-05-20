
-- Deny anonymous access to profiles
CREATE POLICY "Deny public access to profiles"
  ON public.profiles FOR SELECT TO anon USING (false);

-- Deny anonymous access to compras
CREATE POLICY "Deny public access to compras"
  ON public.compras FOR SELECT TO anon USING (false);

-- Deny anonymous access to user_roles
CREATE POLICY "Deny public access to user_roles"
  ON public.user_roles FOR SELECT TO anon USING (false);
