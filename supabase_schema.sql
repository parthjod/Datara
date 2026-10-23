-- ==============================================================================
-- DATARA: SUPABASE DATABASE INITIALIZATION SCRIPT
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. Create Faculty Permissions Table
CREATE TABLE IF NOT EXISTS public.faculty_permissions (
    email TEXT PRIMARY KEY,
    panels TEXT[] NOT NULL DEFAULT '{}',
    years TEXT[] NOT NULL DEFAULT '{}',
    departments TEXT[] NOT NULL DEFAULT '{}',
    active BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Create Students & Marks Table
CREATE TABLE IF NOT EXISTS public.students (
    roll_no TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    aadhar TEXT,
    dob TEXT,
    gender TEXT,
    department TEXT DEFAULT 'CSE',
    panel TEXT,
    year TEXT DEFAULT 'TY',
    program TEXT DEFAULT 'BTech',
    attendance NUMERIC DEFAULT 85,
    cca1 NUMERIC DEFAULT 0,
    cca2 NUMERIC DEFAULT 0,
    midterm NUMERIC DEFAULT 0,
    lca1 NUMERIC,
    lca2 NUMERIC,
    lca3 NUMERIC,
    detained BOOLEAN DEFAULT false,
    lca1_days_left NUMERIC DEFAULT 10,
    lca1_buffer_left NUMERIC DEFAULT 4,
    lca1_detention_pending BOOLEAN DEFAULT false,
    lca2_days_left NUMERIC DEFAULT 10,
    lca2_buffer_left NUMERIC DEFAULT 4,
    lca2_detention_pending BOOLEAN DEFAULT false,
    lca3_days_left NUMERIC DEFAULT 10,
    lca3_buffer_left NUMERIC DEFAULT 4,
    lca3_detention_pending BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Create Automated Email Logs Table
CREATE TABLE IF NOT EXISTS public.email_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    recipient_email TEXT,
    recipient_name TEXT,
    roll_no TEXT,
    panel TEXT,
    type TEXT,
    subject TEXT,
    body TEXT,
    status TEXT DEFAULT 'delivered'
);

-- 4. Create Automation Daily Cycle Workflow State Table
CREATE TABLE IF NOT EXISTS public.workflow_state (
    id INT PRIMARY KEY DEFAULT 1,
    day_number INT DEFAULT 1,
    last_run_timestamp TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()),
    total_daily_runs INT DEFAULT 0
);

-- 5. Seed Initial Workflow State
INSERT INTO public.workflow_state (id, day_number, total_daily_runs)
VALUES (1, 1, 0)
ON CONFLICT (id) DO NOTHING;

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.faculty_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_state ENABLE ROW LEVEL SECURITY;

-- 7. Create Permissive Access Policies (allows client / serverless anon queries)
DROP POLICY IF EXISTS "Public access to faculty_permissions" ON public.faculty_permissions;
CREATE POLICY "Public access to faculty_permissions" ON public.faculty_permissions
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to students" ON public.students;
CREATE POLICY "Public access to students" ON public.students
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to email_logs" ON public.email_logs;
CREATE POLICY "Public access to email_logs" ON public.email_logs
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access to workflow_state" ON public.workflow_state;
CREATE POLICY "Public access to workflow_state" ON public.workflow_state
    FOR ALL USING (true) WITH CHECK (true);

-- 8. Add Tables to Supabase Realtime Publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'faculty_permissions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.faculty_permissions;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'students'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
    END IF;
END $$;

-- 9. Seed Default Faculty Permissions
INSERT INTO public.faculty_permissions (email, panels, years, departments, active)
VALUES 
  ('teacher@mitwpu.edu.in', ARRAY['D', 'J'], ARRAY['TY'], ARRAY['CSE'], true),
  ('sneha.kulkarni@mitwpu.edu.in', ARRAY['A', 'B', 'C'], ARRAY['TY', 'SY'], ARRAY['CSE'], true),
  ('rahul.deshmukh@mitwpu.edu.in', ARRAY['E', 'F', 'G', 'H'], ARRAY['TY'], ARRAY['CSE'], true)
ON CONFLICT (email) DO UPDATE SET
  panels = EXCLUDED.panels,
  years = EXCLUDED.years,
  departments = EXCLUDED.departments,
  active = EXCLUDED.active;
