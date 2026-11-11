-- ============================================================================
-- Ticketing System – Complete Database Setup
-- ============================================================================
-- Run this ONCE in: Supabase Dashboard → SQL Editor → New Query
-- This script:
--   1. Drops the old wrong-schema users table
--   2. Creates all required tables with correct schemas
--   3. Seeds all users
-- ============================================================================

-- ── STEP 1: Drop old wrong-schema tables (safe, CASCADE handles dependencies) ──
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.tickets CASCADE;
DROP TABLE IF EXISTS public.ticket_comments CASCADE;
DROP TABLE IF EXISTS public.ticket_activities CASCADE;
DROP TABLE IF EXISTS public.ticket_attachments CASCADE;
DROP TABLE IF EXISTS public.ticket_tagged_members CASCADE;
DROP TABLE IF EXISTS public.escalations CASCADE;
DROP TABLE IF EXISTS public.portal_notifications CASCADE;

-- ── STEP 2: Create USERS table (matches backend user_store.py schema) ─────────
CREATE TABLE public.users (
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

-- ── STEP 3: Create TICKETS table (matches backend tickets.py row dict) ─────────
CREATE TABLE public.tickets (
  id                  TEXT PRIMARY KEY,
  ticket_number       TEXT,
  subject             TEXT NOT NULL,
  description         TEXT DEFAULT '',
  employee            TEXT,
  employee_id         TEXT,
  employee_email      TEXT,
  requester_id        TEXT,
  department          TEXT,
  departments         JSONB DEFAULT '[]',
  category            TEXT DEFAULT 'General',
  sub_category        TEXT,
  priority            TEXT DEFAULT 'Medium',
  status              TEXT DEFAULT 'Open',
  assigned_agent      TEXT,
  assigned_agent_id   TEXT,
  assigned_to_type    TEXT,
  handled_by          TEXT,
  assigned_by         TEXT,
  assigned_by_user_id TEXT,
  assigned_team_id    TEXT,
  sla_due_at          TEXT,
  created_at          TEXT,
  updated_at          TEXT
);

-- ── STEP 4: Create TICKET_COMMENTS table ──────────────────────────────────────
CREATE TABLE public.ticket_comments (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  ticket_id     TEXT NOT NULL,
  author_name   TEXT,
  author_id     TEXT,
  author_role   TEXT,
  message       TEXT,
  is_internal   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── STEP 5: Create TICKET_ACTIVITIES table ────────────────────────────────────
CREATE TABLE public.ticket_activities (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  ticket_id  TEXT NOT NULL,
  action     TEXT,
  user_id    TEXT,
  "user"     TEXT,
  timestamp  TEXT,
  details    JSONB DEFAULT '{}'
);

-- ── STEP 6: Create TICKET_ATTACHMENTS table ───────────────────────────────────
CREATE TABLE public.ticket_attachments (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  ticket_id    TEXT NOT NULL,
  filename     TEXT,
  original_name TEXT,
  mime_type    TEXT,
  size_bytes   BIGINT,
  storage_path TEXT,
  url          TEXT,
  uploaded_by  TEXT,
  uploaded_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── STEP 7: Create TICKET_TAGGED_MEMBERS table ────────────────────────────────
CREATE TABLE public.ticket_tagged_members (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  ticket_id  TEXT NOT NULL,
  user_id    TEXT NOT NULL,
  tagged_by  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── STEP 8: Create ESCALATIONS table ─────────────────────────────────────────
CREATE TABLE public.escalations (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  ticket_id    TEXT NOT NULL,
  reason       TEXT,
  escalated_by TEXT,
  escalated_to TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── STEP 9: Create PORTAL_NOTIFICATIONS table ─────────────────────────────────
CREATE TABLE public.portal_notifications (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id     TEXT,
  user_email  TEXT,
  title       TEXT,
  message     TEXT,
  type        TEXT DEFAULT 'info',
  read        BOOLEAN DEFAULT FALSE,
  ticket_id   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── STEP 10: Seed all users ───────────────────────────────────────────────────
INSERT INTO public.users (id, employee_id, name, email, role, department, designation, team, phone, location, status)
VALUES
  -- Admin users
  ('usr-admin-1791538577749', 'ADM-001', 'shruthi',             's.ronda@oklut.com',      'admin',    'IT Support', 'Security Administrator',   'Security Operations', '+1 (555) 000-0002', 'Global HQ', 'Active'),
  ('usr-admin-1791222872974', 'ADM-002', 'Sudheshna Bharadwaj', 'sudheshna@gmail.com',    'admin',    'IT Support', 'Platform Administrator',   'Core IT',             '+1 (555) 000-0001', 'Global HQ', 'Active'),
  ('ADM001',                  'ADM-003', 'System Admin',         'admin@platform.local',   'admin',    'IT Support', 'System Administrator',     'IT Administration',   '+1 (555) 000-0000', 'Global HQ', 'Active'),
  -- Team Lead users
  ('OKL003', 'OKL003', 'Kotesh',    'k.ananthu@oklut.com',  'teamlead', 'IT Support', 'IT Support Team Lead', 'Team Alpha', '+1 (555) 000-0003', 'Global HQ', 'Active'),
  ('OKL015', 'OKL015', 'Manikanta', 'm.nisankam@oklut.com', 'teamlead', 'IT Support', 'IT Support Team Lead', 'Team Beta',  '+1 (555) 000-0015', 'Global HQ', 'Active'),
  ('OKL120', 'OKL015', 'manikanta', 's.manikanta@oklut.com','teamlead', 'IT Support', 'IT Support Team Lead', 'Team Beta',  '+1 (555) 000-0015', 'Global HQ', 'Active'),
  ('OKL013', 'OKL013', 'soniya',    'soni@gmail.com',       'teamlead', 'HR',         'HR Team Lead',         'HR Team',    '+1 (555) 000-0013', 'Global HQ', 'Active'),
  -- Employee users
  ('OKL002', 'OKL002', 'uday',  'u.vadlamudi@oklut.com', 'employee', 'IT Support', 'IT Support Engineer', 'Team Alpha', '+1 (555) 000-0004', 'Global HQ', 'Active'),
  ('OKL001', 'OKL001', 'aditya','a.reddy@oklut.com',      'employee', 'IT Support', 'Support Specialist',  'Team Alpha', '+1 (555) 000-0005', 'Global HQ', 'Active'),
  ('OKL016', 'OKL016', 'sudha', 'sudha@gmail.com',        'employee', 'IT Support', 'Support Engineer',    'Team Beta',  '+1 (555) 000-0016', 'Global HQ', 'Active'),
  ('OKL014', 'OKL014', 'Ramya', 'ramya@gmail.com',        'employee', 'HR',         'HR Associate',        'HR Team',    '+1 (555) 000-0014', 'Global HQ', 'Active');

-- ── STEP 11: Verify ───────────────────────────────────────────────────────────
SELECT 'users' AS tbl, COUNT(*) FROM public.users
UNION ALL SELECT 'tickets', COUNT(*) FROM public.tickets
UNION ALL SELECT 'ticket_comments', COUNT(*) FROM public.ticket_comments
UNION ALL SELECT 'ticket_activities', COUNT(*) FROM public.ticket_activities
UNION ALL SELECT 'ticket_attachments', COUNT(*) FROM public.ticket_attachments
UNION ALL SELECT 'escalations', COUNT(*) FROM public.escalations
UNION ALL SELECT 'portal_notifications', COUNT(*) FROM public.portal_notifications;

