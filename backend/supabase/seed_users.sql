-- ============================================================================
-- Ticketing System – Seed Users Table
-- ============================================================================
-- Run this in: Supabase Dashboard → SQL Editor
-- Purpose: Populate the users table so User Management and ticket assignment work.
-- This uses the service_role (you must run it via the SQL Editor, not anon client).
-- ============================================================================

-- Ensure the users table exists (safe no-op if already created)
CREATE TABLE IF NOT EXISTS public.users (
  id              TEXT PRIMARY KEY,
  employee_id     TEXT,
  name            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  role            TEXT NOT NULL DEFAULT 'employee',
  department      TEXT,
  designation     TEXT,
  team            TEXT,
  phone           TEXT,
  location        TEXT,
  status          TEXT DEFAULT 'Active',
  password_hash   TEXT,
  auth_user_id    UUID,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Upsert all DEFAULT_USERS ──────────────────────────────────────────────────
INSERT INTO public.users (id, employee_id, name, email, role, department, designation, team, phone, location, status)
VALUES
  -- Admin
  ('usr-admin-001', 'ADM-001', 'Admin', 'admin@oklut.com', 'admin', 'IT Support', 'System Administrator', 'Administration', '+1 (555) 000-0001', 'Global HQ', 'Active'),
  -- Team Lead
  ('OKIN20061', 'OKIN20061', 'GOKUL', 'g.nekkanti@oklut.com', 'teamlead', 'Development', 'Team Lead', 'Development', '9063554232', 'Global HQ', 'Active')
ON CONFLICT (id) DO UPDATE SET
  name        = EXCLUDED.name,
  email       = EXCLUDED.email,
  role        = EXCLUDED.role,
  department  = EXCLUDED.department,
  designation = EXCLUDED.designation,
  team        = EXCLUDED.team,
  status      = EXCLUDED.status,
  updated_at  = NOW();

-- Confirm
SELECT id, name, email, role, status FROM public.users ORDER BY role, name;

