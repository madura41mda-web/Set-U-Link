-- ============================================================
-- Migration: 20260914000006_university_innovation_hub.sql
-- University Innovation Hub (Dashboard Phase) Schema & Demo Seed
-- ============================================================

-- 1. Create faculty_mentors table
CREATE TABLE IF NOT EXISTS public.faculty_mentors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text NOT NULL,
  department text NOT NULL,
  email text,
  expertise text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 2. Create project_teams table
CREATE TABLE IF NOT EXISTS public.project_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_name text NOT NULL,
  departments text[] DEFAULT '{}',
  faculty_mentor_id uuid REFERENCES public.faculty_mentors(id) ON DELETE SET NULL,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

-- 3. Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.project_teams(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  roll_number text,
  department text NOT NULL,
  role text NOT NULL,
  skills text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 4. Add review and mentor columns to public.matches table if not exist
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS review_status text DEFAULT 'pending';
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS review_notes text;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS assigned_mentor_id uuid REFERENCES public.faculty_mentors(id) ON DELETE SET NULL;

-- 5. Enable RLS on new tables
ALTER TABLE public.faculty_mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for faculty_mentors
DROP POLICY IF EXISTS "Allow select faculty mentors" ON public.faculty_mentors;
CREATE POLICY "Allow select faculty mentors" ON public.faculty_mentors FOR SELECT USING (true);

DROP POLICY IF EXISTS "Org reps manage own faculty mentors" ON public.faculty_mentors;
CREATE POLICY "Org reps manage own faculty mentors" ON public.faculty_mentors
  FOR ALL USING (
    public.is_admin() OR
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

-- 7. RLS Policies for project_teams
DROP POLICY IF EXISTS "Allow select project teams" ON public.project_teams;
CREATE POLICY "Allow select project teams" ON public.project_teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Org reps manage own project teams" ON public.project_teams;
CREATE POLICY "Org reps manage own project teams" ON public.project_teams
  FOR ALL USING (
    public.is_admin() OR
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

-- 8. RLS Policies for team_members
DROP POLICY IF EXISTS "Allow select team members" ON public.team_members;
CREATE POLICY "Allow select team members" ON public.team_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Org reps manage own team members" ON public.team_members;
CREATE POLICY "Org reps manage own team members" ON public.team_members
  FOR ALL USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.project_teams pt
      WHERE pt.id = team_members.team_id
        AND pt.org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- 9. Realtime Publication Registration
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.faculty_mentors;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_teams;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.faculty_mentors REPLICA IDENTITY FULL;
ALTER TABLE public.project_teams REPLICA IDENTITY FULL;
ALTER TABLE public.team_members REPLICA IDENTITY FULL;
