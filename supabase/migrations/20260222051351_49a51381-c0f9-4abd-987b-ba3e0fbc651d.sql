CREATE POLICY "Staff can view qr for validation"
ON public.codigos_qr
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'control_entradas'::app_role));