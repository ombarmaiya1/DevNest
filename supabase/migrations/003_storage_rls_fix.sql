-- ==============================================================================
-- Devnest Migration: 003_storage_rls_fix.sql
--
-- Fixes Storage RLS policies on storage.objects:
-- Resolves variable shadowing bug where unqualified 'name' inside the EXISTS
-- subquery (SELECT 1 FROM public.projects p WHERE ...) bound to 'p.name'
-- (the project's name column) rather than 'storage.objects.name'.
--
-- Fully qualifies 'storage.objects.name' across SELECT, INSERT, UPDATE, DELETE.
-- ==============================================================================

-- 1. Ensure bucket 'project-files' exists and is private
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 2. SELECT Policy
DROP POLICY IF EXISTS "Users can view their own storage objects" ON storage.objects;
CREATE POLICY "Users can view their own storage objects"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'project-files' AND
    (storage.foldername(name))[1] = auth.uid()::text AND
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(storage.objects.name))[2]
        AND p.user_id = auth.uid()
    )
  );

-- 3. INSERT Policy (Uploads)
DROP POLICY IF EXISTS "Users can upload files to their own storage directory" ON storage.objects;
CREATE POLICY "Users can upload files to their own storage directory"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'project-files' AND
    (storage.foldername(name))[1] = auth.uid()::text AND
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(storage.objects.name))[2]
        AND p.user_id = auth.uid()
    )
  );

-- 4. UPDATE Policy (File replacements / modifications)
DROP POLICY IF EXISTS "Users can update their own storage objects" ON storage.objects;
CREATE POLICY "Users can update their own storage objects"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'project-files' AND
    (storage.foldername(name))[1] = auth.uid()::text AND
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(storage.objects.name))[2]
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'project-files' AND
    (storage.foldername(name))[1] = auth.uid()::text AND
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(storage.objects.name))[2]
        AND p.user_id = auth.uid()
    )
  );

-- 5. DELETE Policy (File deletions)
DROP POLICY IF EXISTS "Users can delete their own storage objects" ON storage.objects;
CREATE POLICY "Users can delete their own storage objects"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'project-files' AND
    (storage.foldername(name))[1] = auth.uid()::text AND
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(storage.objects.name))[2]
        AND p.user_id = auth.uid()
    )
  );

