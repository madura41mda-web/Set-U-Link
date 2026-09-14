-- Migration: 20260913000000_create_setulink_schema.sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Ensure auth schema and auth.users exist for local dev compatibility if needed
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 1. Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('university', 'csr', 'startup', 'msme', 'research_institution', 'govt')),
  category_tags text[] DEFAULT '{}'::text[],
  district text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 2. Profiles (references auth.users & organizations)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  role text DEFAULT 'citizen',
  org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Issues
CREATE TABLE IF NOT EXISTS public.issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('education', 'health', 'water', 'sanitation', 'infra', 'agriculture', 'livelihood')),
  district text NOT NULL,
  location geography(Point, 4326),
  photo_url text,
  status text DEFAULT 'reported' CHECK (status IN ('reported', 'validated', 'matched', 'sanctioned', 'in_progress', 'resolved')),
  upvotes integer DEFAULT 0,
  reporter_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  submitter_type text DEFAULT 'citizen' CHECK (submitter_type IN ('citizen', 'panchayat', 'ulb')),
  priority_score numeric DEFAULT 0,
  duplicate_of uuid REFERENCES public.issues(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- 4. Status History
CREATE TABLE IF NOT EXISTS public.status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  stage text NOT NULL,
  outcome_type text CHECK (outcome_type IS NULL OR outcome_type IN ('deployed_solution', 'research_output', 'pilot_test', 'policy_change')),
  changed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at timestamptz DEFAULT now()
);

-- 5. Matches
CREATE TABLE IF NOT EXISTS public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role text CHECK (role IN ('university', 'industry', 'govt')),
  matched_at timestamptz DEFAULT now()
);

-- 6. Comments
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_issues_district ON public.issues(district);
CREATE INDEX IF NOT EXISTS idx_issues_category ON public.issues(category);
CREATE INDEX IF NOT EXISTS idx_issues_status ON public.issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_location ON public.issues USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_matches_issue_id ON public.matches(issue_id);
CREATE INDEX IF NOT EXISTS idx_matches_org_id ON public.matches(org_id);
CREATE INDEX IF NOT EXISTS idx_status_history_issue_id ON public.status_history(issue_id);

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Helper function for checking admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Allow select for all users" ON public.organizations;
DROP POLICY IF EXISTS "Admins full access" ON public.organizations;

DROP POLICY IF EXISTS "Allow select for all users" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins full access" ON public.profiles;

DROP POLICY IF EXISTS "Allow select for all users" ON public.issues;
DROP POLICY IF EXISTS "Citizens insert issues" ON public.issues;
DROP POLICY IF EXISTS "Org reps update matched issue status" ON public.issues;
DROP POLICY IF EXISTS "Admins full access" ON public.issues;

DROP POLICY IF EXISTS "Allow select for all users" ON public.status_history;
DROP POLICY IF EXISTS "Admins full access" ON public.status_history;

DROP POLICY IF EXISTS "Allow select for all users" ON public.matches;
DROP POLICY IF EXISTS "Admins full access" ON public.matches;

DROP POLICY IF EXISTS "Allow select for all users" ON public.comments;
DROP POLICY IF EXISTS "Users insert comments" ON public.comments;
DROP POLICY IF EXISTS "Admins full access" ON public.comments;

-- Create Policies

-- Organizations
CREATE POLICY "Allow select for all users" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "Admins full access" ON public.organizations FOR ALL USING (public.is_admin());

-- Profiles
CREATE POLICY "Allow select for all users" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id OR public.is_admin());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Admins full access" ON public.profiles FOR ALL USING (public.is_admin());

-- Issues
CREATE POLICY "Allow select for all users" ON public.issues FOR SELECT USING (true);

CREATE POLICY "Citizens insert issues" ON public.issues
  FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'anon') OR public.is_admin());

CREATE POLICY "Org reps update matched issue status" ON public.issues
  FOR UPDATE
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.matches m ON m.org_id = p.org_id
      WHERE p.id = auth.uid()
        AND m.issue_id = issues.id
    )
  )
  WITH CHECK (
    public.is_admin() OR
    EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.matches m ON m.org_id = p.org_id
      WHERE p.id = auth.uid()
        AND m.issue_id = issues.id
    )
  );

CREATE POLICY "Admins full access" ON public.issues FOR ALL USING (public.is_admin());

-- Status History
CREATE POLICY "Allow select for all users" ON public.status_history FOR SELECT USING (true);
CREATE POLICY "Admins full access" ON public.status_history FOR ALL USING (public.is_admin());

-- Matches
CREATE POLICY "Allow select for all users" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Admins full access" ON public.matches FOR ALL USING (public.is_admin());

-- Comments
CREATE POLICY "Allow select for all users" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users insert comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = author_id OR public.is_admin());
CREATE POLICY "Admins full access" ON public.comments FOR ALL USING (public.is_admin());
