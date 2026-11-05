# Supabase Integration & Database Foundation (Milestone 2)

This documentation describes the database schema, relational ownership integrity, Row Level Security (RLS), private storage configuration, and concurrency-safe client architecture for Devnest.

---

## 1. Supabase Credentials Configuration

1. In your [Supabase Dashboard](https://supabase.com/dashboard), navigate to **Project Settings** -> **API**.
2. Locate the following values:
   - **Project URL** (e.g. `https://xyzproject.supabase.co`)
   - **anon / public key** (publishable key)
   > **Security Requirement**: Never use the `service_role` secret key in the application backend. All user-driven operations use the publishable key and pass the user's JWT access token so that PostgreSQL Row Level Security (RLS) is strictly enforced.
3. Update `backend/.env`:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_PUBLISHABLE_KEY=your-publishable-anon-key
   ```

---

## 2. Applying Database Migrations

### Scenario A: Fresh Supabase Project (First-time setup)
Execute [`supabase/migrations/001_initial_schema.sql`](file:///c:/Users/ombar/OneDrive/Documents/Devnest/supabase/migrations/001_initial_schema.sql):
1. Open the Supabase Dashboard -> **SQL Editor** -> **New query**.
2. Copy the entire contents of `001_initial_schema.sql`.
3. Click **Run**. This sets up the schema, triggers, RLS, composite foreign keys, and hardened storage policies.

### Scenario B: Existing Database (Where 001 was already executed previously)
Because PostgreSQL `CREATE TABLE IF NOT EXISTS` skips execution if the table already exists, running an edited `001` script will **not** modify existing tables or foreign key constraints. 
Execute [`supabase/migrations/002_security_corrections.sql`](file:///c:/Users/ombar/OneDrive/Documents/Devnest/supabase/migrations/002_security_corrections.sql):
1. Open the Supabase Dashboard -> **SQL Editor** -> **New query**.
2. Copy the entire contents of `002_security_corrections.sql`.
3. Click **Run**. This:
   - Adds the `uq_projects_id_user_id` unique constraint to `projects(id, user_id)`.
   - Replaces the single-column foreign key on `project_files` with the composite foreign key `(project_id, user_id) REFERENCES projects(id, user_id) ON DELETE CASCADE`.
   - Hardens storage policies.

### Scenario C: Storage RLS Fix (Migration 003)
Execute [`supabase/migrations/003_storage_rls_fix.sql`](file:///c:/Users/ombar/OneDrive/Documents/Devnest/supabase/migrations/003_storage_rls_fix.sql):
1. Open the Supabase Dashboard -> **SQL Editor** -> **New query**.
2. Copy the entire contents of `003_storage_rls_fix.sql`.
3. Click **Run**. This:
   - Resolves a column shadowing bug where `(storage.foldername(name))[2]` inside the `EXISTS (SELECT 1 FROM public.projects p ...)` subquery resolved to `p.name` (the project's name) instead of the outer object path.
   - Fully qualifies `(storage.foldername(storage.objects.name))[2]` across all 4 operations (SELECT, INSERT, UPDATE, DELETE).

---

## 3. Database Ownership Integrity Architecture

To prevent a user from associating their files with another user's project, the schema implements two layers of defense:

1. **Relational Schema Layer (Composite Foreign Key)**:
   - `projects` has a unique constraint on `(id, user_id)`:
     ```sql
     CONSTRAINT uq_projects_id_user_id UNIQUE (id, user_id)
     ```
   - `project_files` references `projects` using a composite foreign key:
     ```sql
     CONSTRAINT fk_project_files_project_user FOREIGN KEY (project_id, user_id)
       REFERENCES public.projects(id, user_id) ON DELETE CASCADE
     ```
   - **Guarantee**: Even if an attacker attempts an insert or update query, the PostgreSQL constraint engine rejects any row where `project_id` belongs to one user and `user_id` belongs to another. Redundant single-column foreign keys are removed to keep constraints clean.

2. **Row Level Security (RLS) Layer**:
   - `projects` ensures `auth.uid() = user_id`.
   - `project_files` verifies both `auth.uid() = user_id` and that the parent project is owned by `auth.uid()`.

---

## 4. Strengthened Storage RLS Architecture

Files in the private `project-files` bucket follow the path convention:
```
user_id/project_id/file_path
```

Examples:
- Standard: `<user_id>/<project_id>/index.js`
- Deeply nested: `<user_id>/<project_id>/src/components/buttons/PrimaryButton.jsx`

### Storage Policy Verification Rules (SELECT, INSERT, UPDATE, DELETE):
1. **Bucket Verification**: `bucket_id = 'project-files'`
2. **User Directory Verification**: `(storage.foldername(name))[1] = auth.uid()::text`
3. **Project Ownership Verification**:
   ```sql
   EXISTS (
     SELECT 1 FROM public.projects p
     WHERE p.id::text = (storage.foldername(name))[2]
       AND p.user_id = auth.uid()
   )
   ```
4. **Safe Text Comparison**:
   - We compare `p.id::text = (storage.foldername(name))[2]` instead of casting untrusted path text to UUID (`::uuid`). This ensures that invalid or non-UUID path segments simply evaluate to `FALSE` rather than crashing queries with a PostgreSQL runtime error (`invalid input syntax for type uuid`).
5. **Update Policy Enforcement**:
   - The UPDATE policy enforces these checks in **both** `USING` and `WITH CHECK` clauses, preventing users from altering an object to move it into another user's directory or another project.
6. **Nested File Support**:
   - Because `storage.foldername(name)` parses directory hierarchies from left to right, segment `[1]` is consistently `user_id` and segment `[2]` is consistently `project_id`, regardless of file depth inside the project.

---

## 5. Supabase Client Concurrency & Stateless Execution

[`backend/src/config/supabase.js`](file:///c:/Users/ombar/OneDrive/Documents/Devnest/backend/src/config/supabase.js) is designed for stateless server environments:

- **Per-Request Client Creation**: The exported `createSupabaseClient(accessToken)` factory creates a new client instance per request.
- **Header Isolation**: Forwarding `Authorization: Bearer <token>` dynamically inside a new instance ensures parallel incoming requests from different users never share or overwrite authorization headers.
- **Stateless Settings**: `persistSession: false`, `autoRefreshToken: false`, and `detectSessionInUrl: false` prevent server-side session leaks.
- **Unauthenticated Client**: The exported `supabase` instance is strictly unauthenticated (using the public anon key) and used only for non-user operations.

---

## 6. Security Verification Checklist

Use this checklist to verify security rules against a live Supabase instance:

- [ ] **1. User A Project & File Access**:
  - Authenticated as User A, queries to `projects` and `project_files` return User A's records.
- [ ] **2. Cross-Tenant Record Access Isolation**:
  - Authenticated as User A, queries to `projects` and `project_files` return zero rows for User B's projects or files. Direct access by User B's UUID returns empty.
- [ ] **3. Cross-Tenant File Association Prevention**:
  - Attempting to insert a row into `project_files` with User A's `user_id` and User B's `project_id` is rejected by foreign key constraint `fk_project_files_project_user`.
- [ ] **4. Storage Upload Isolation**:
  - Attempting to upload to `storage.objects` with path `user_B_id/project_B_id/file.txt` using User A's token is rejected by the INSERT policy.
  - Attempting to upload to `user_A_id/project_B_id/file.txt` (User A's user folder, but User B's project ID) is rejected because User A does not own `project_B_id`.
- [ ] **5. Storage Read / Update / Delete Isolation**:
  - User A cannot view, download, update, or delete files stored in User B's storage directories.
- [ ] **6. Nested Storage Paths**:
  - Uploading and retrieving files at `user_A_id/project_A_id/src/nested/deep/file.js` succeeds for User A.
- [ ] **7. Malformed Path Resilience**:
  - Uploading to `user_A_id/not-a-valid-uuid/file.js` is rejected safely without causing database-level 500 crashes.
- [ ] **8. Unauthenticated Access Denial**:
  - Unauthenticated requests (without JWT) receive 401/403/empty results for private tables and storage objects.

> **Verification Notice**: The SQL scripts and JavaScript client modules have been verified locally for syntactic correctness, schema integrity, and module initialization. SQL migrations must be executed in your remote Supabase project environment before live database tests can take place.
