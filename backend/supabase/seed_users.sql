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
  ('usr-admin-1791538577749', 'ADM-001', 'shruthi',              's.ronda@oklut.com',       'admin',    'IT Support', 'Security Administrator',    'Security Operations', '+1 (555) 000-0002', 'Global HQ', 'Active'),
  ('usr-admin-1791222872974', 'ADM-002', 'Sudheshna Bharadwaj',  'sudheshna@gmail.com',     'admin',    'IT Support', 'Platform Administrator',    'Core IT',             '+1 (555) 000-0001', 'Global HQ', 'Active'),
  ('ADM001',                  'ADM-003', 'System Admin',          'admin@platform.local',    'admin',    'IT Support', 'System Administrator',      'IT Administration',   '+1 (555) 000-0000', 'Global HQ', 'Active'),
  -- Team Lead
  ('OKL003', 'OKL003', 'Kotesh',   'k.ananthu@oklut.com',   'teamlead', 'IT Support', 'IT Support Team Lead', 'Team Alpha', '+1 (555) 000-0003', 'Global HQ', 'Active'),
  ('OKL015', 'OKL015', 'Manikanta', 'm.nisankam@oklut.com', 'teamlead', 'IT Support', 'IT Support Team Lead', 'Team Beta',  '+1 (555) 000-0015', 'Global HQ', 'Active'),
  ('OKL120', 'OKL015', 'manikanta', 's.manikanta@oklut.com','teamlead', 'IT Support', 'IT Support Team Lead', 'Team Beta',  '+1 (555) 000-0015', 'Global HQ', 'Active'),
  ('OKL013', 'OKL013', 'soniya',    'soni@gmail.com',       'teamlead', 'HR',         'HR Team Lead',         'HR Team',    '+1 (555) 000-0013', 'Global HQ', 'Active'),
  -- Employee
  ('OKL002', 'OKL002', 'uday',  'u.vadlamudi@oklut.com', 'employee', 'IT Support', 'IT Support Engineer', 'Team Alpha', '+1 (555) 000-0004', 'Global HQ', 'Active'),
  ('OKL001', 'OKL001', 'aditya','a.reddy@oklut.com',      'employee', 'IT Support', 'Support Specialist',  'Team Alpha', '+1 (555) 000-0005', 'Global HQ', 'Active'),
  ('OKL016', 'OKL016', 'sudha', 'sudha@gmail.com',        'employee', 'IT Support', 'Support Engineer',    'Team Beta',  '+1 (555) 000-0016', 'Global HQ', 'Active'),
  ('OKL014', 'OKL014', 'Ramya', 'ramya@gmail.com',        'employee', 'HR',         'HR Associate',        'HR Team',    '+1 (555) 000-0014', 'Global HQ', 'Active')
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

