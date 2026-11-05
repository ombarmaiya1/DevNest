-- ==============================================================================
-- Devnest Milestone 2: Security Corrections (Hardened & Idempotent)
-- Migration: 002_security_corrections.sql
--
-- Applies ownership integrity and storage policy hardening to an existing database
-- where 001_initial_schema.sql was already applied.
--
-- Safety Guarantees:
-- 1. Table-scoped constraint checks using conrelid = 'schema.table'::regclass.
-- 2. Non-destructive preflight validation: detects orphaned files or cross-user
--    ownership mismatches and raises an exception without modifying data.
-- 3. Genuine idempotency: skips constraint and policy modifications if valid
--    definitions already exist, preventing unnecessary churn or table locking.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. DATABASE OWNERSHIP INTEGRITY: Unique Constraint on projects(id, user_id)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  -- Verify if uq_projects_id_user_id already exists on public.projects
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_projects_id_user_id'
      AND conrelid = 'public.projects'::regclass
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT uq_projects_id_user_id UNIQUE (id, user_id);
    RAISE NOTICE 'Added unique constraint uq_projects_id_user_id on public.projects.';
  ELSE
    RAISE NOTICE 'Unique constraint uq_projects_id_user_id already exists on public.projects. Skipping.';
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. DATABASE OWNERSHIP INTEGRITY: Composite Foreign Key on project_files
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_fk_exists boolean;
  v_orphaned_files bigint;
  v_mismatched_files bigint;
BEGIN
  -- Check if composite foreign key already exists with the correct definition
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_project_files_project_user'
      AND conrelid = 'public.project_files'::regclass
      AND confrelid = 'public.projects'::regclass
      AND contype = 'f'
  ) INTO v_fk_exists;

  -- Genuinely idempotent: if already present with correct definition, skip entirely
  IF v_fk_exists THEN
    RAISE NOTICE 'Composite foreign key fk_project_files_project_user already exists on public.project_files with correct definition. Skipping.';
    RETURN;
  END IF;

  -- PREFLIGHT CHECK 1: Detect orphaned file records referencing non-existent projects
  SELECT count(*) INTO v_orphaned_files
  FROM public.project_files pf
  WHERE NOT EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = pf.project_id
  );

  -- PREFLIGHT CHECK 2: Detect file records referencing projects owned by a different user
  SELECT count(*) INTO v_mismatched_files
  FROM public.project_files pf
  JOIN public.projects p ON p.id = pf.project_id
  WHERE pf.user_id <> p.user_id;

  -- If invalid records exist, raise a descriptive exception.
  -- NEVER automatically delete, modify, or reassign records.
  IF v_orphaned_files > 0 OR v_mismatched_files > 0 THEN
    RAISE EXCEPTION
      'Preflight check failed for fk_project_files_project_user: detected % orphaned file record(s) and % ownership-mismatched file record(s). Existing data requires manual investigation before this constraint can be applied.',
      v_orphaned_files,
      v_mismatched_files;
  END IF;

  -- Drop legacy single-column foreign key on project_id only if present on public.project_files
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'project_files_project_id_fkey'
      AND conrelid = 'public.project_files'::regclass
      AND contype = 'f'
  ) THEN
    ALTER TABLE public.project_files DROP CONSTRAINT project_files_project_id_fkey;
    RAISE NOTICE 'Dropped legacy constraint project_files_project_id_fkey from public.project_files.';
  END IF;

  -- Drop legacy single-column foreign key on user_id only if present on public.project_files
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'project_files_user_id_fkey'
      AND conrelid = 'public.project_files'::regclass
      AND contype = 'f'
  ) THEN
    ALTER TABLE public.project_files DROP CONSTRAINT project_files_user_id_fkey;
    RAISE NOTICE 'Dropped legacy constraint project_files_user_id_fkey from public.project_files.';
  END IF;

  -- Add composite foreign key linking (project_id, user_id) to projects(id, user_id)
  ALTER TABLE public.project_files
    ADD CONSTRAINT fk_project_files_project_user
    FOREIGN KEY (project_id, user_id)
    REFERENCES public.projects(id, user_id)
    ON DELETE CASCADE;

  RAISE NOTICE 'Added composite foreign key fk_project_files_project_user on public.project_files.';
END $$;

-- ------------------------------------------------------------------------------
-- 3. STORAGE BUCKET: Ensure private 'project-files' bucket exists
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ------------------------------------------------------------------------------
-- 4. STORAGE RLS HARDENING: Idempotent policy verification and replacement
--
-- Path Convention: user_id/project_id/file_path (nested paths supported)
-- Enforces:
-- 1. bucket_id = 'project-files'
-- 2. First path segment = auth.uid()::text
-- 3. Second path segment identifies an existing project owned by auth.uid()
-- 4. Safe text comparison p.id::text avoids runtime casting exceptions
-- 5. UPDATE enforces checks on both USING and WITH CHECK
-- 6. Checks pg_policies to avoid unnecessarily dropping/recreating valid policies
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  -- SELECT Policy: Check if valid hardened policy is already active
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can view their own storage objects'
      AND qual LIKE '%projects%'
  ) THEN
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
          WHERE p.id::text = (storage.foldername(name))[2]
            AND p.user_id = auth.uid()
        )
      );
    RAISE NOTICE 'Configured hardened SELECT storage policy.';
  ELSE
    RAISE NOTICE 'Hardened SELECT storage policy already active. Skipping.';
  END IF;

  -- INSERT Policy: Check if valid hardened policy is already active
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can upload files to their own storage directory'
      AND with_check LIKE '%projects%'
  ) THEN
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
          WHERE p.id::text = (storage.foldername(name))[2]
            AND p.user_id = auth.uid()
        )
      );
    RAISE NOTICE 'Configured hardened INSERT storage policy.';
  ELSE
    RAISE NOTICE 'Hardened INSERT storage policy already active. Skipping.';
  END IF;

  -- UPDATE Policy: Check if valid hardened policy is already active in both USING and WITH CHECK
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can update their own storage objects'
      AND qual LIKE '%projects%'
      AND with_check LIKE '%projects%'
  ) THEN
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
          WHERE p.id::text = (storage.foldername(name))[2]
            AND p.user_id = auth.uid()
        )
      )
      WITH CHECK (
        bucket_id = 'project-files' AND
        (storage.foldername(name))[1] = auth.uid()::text AND
        EXISTS (
          SELECT 1 FROM public.projects p
          WHERE p.id::text = (storage.foldername(name))[2]
            AND p.user_id = auth.uid()
        )
      );
    RAISE NOTICE 'Configured hardened UPDATE storage policy.';
  ELSE
    RAISE NOTICE 'Hardened UPDATE storage policy already active. Skipping.';
  END IF;

  -- DELETE Policy: Check if valid hardened policy is already active
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can delete their own storage objects'
      AND qual LIKE '%projects%'
  ) THEN
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
          WHERE p.id::text = (storage.foldername(name))[2]
            AND p.user_id = auth.uid()
        )
      );
    RAISE NOTICE 'Configured hardened DELETE storage policy.';
  ELSE
    RAISE NOTICE 'Hardened DELETE storage policy already active. Skipping.';
  END IF;
END $$;
