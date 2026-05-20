
-- Create storage bucket for event images
INSERT INTO storage.buckets (id, name, public)
VALUES ('eventos', 'eventos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read event images (public bucket)
CREATE POLICY "Public read access for eventos" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'eventos');

-- Allow authenticated users with admin/editor role to upload
CREATE POLICY "Admin upload eventos images" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'eventos' AND public.has_role(auth.uid(), 'admin'));

-- Allow admin to update
CREATE POLICY "Admin update eventos images" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'eventos' AND public.has_role(auth.uid(), 'admin'));

-- Allow admin to delete
CREATE POLICY "Admin delete eventos images" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'eventos' AND public.has_role(auth.uid(), 'admin'));
