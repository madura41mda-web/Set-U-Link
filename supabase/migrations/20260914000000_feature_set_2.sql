-- Migration 20260914000000_feature_set_2.sql
-- Feature Set 2 Schema Enhancements & Security Verification Gate Lockdown:
-- 1. Add avg_severity_score to issues
-- 2. Add is_org_update to comments
-- 3. Add verified flag to profiles & update role check constraint for pending_org_rep
-- 4. Lock down profile UPDATE policy to prevent role/verified self-promotion
-- 5. Lock down matches and issues RLS policies requiring verified = true for org_rep
-- 6. Create severity_votes table with server-side RLS preventing self-voting

-- 1. issues: avg_severity_score & area text column if not exists
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS avg_severity_score numeric DEFAULT 0;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS area text;

-- 2. comments: is_org_update
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_org_update boolean DEFAULT false;

-- 3. profiles: verified flag and role constraint
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified boolean DEFAULT true;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
  END IF;

  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('citizen', 'pending_org_rep', 'org_rep', 'panchayat_rep', 'ulb_rep', 'admin'));
END $$;

-- 4. Lock down profile UPDATE policy (prevent self-promotion)
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile (no self-promotion)" ON public.profiles;

CREATE POLICY "Users update own profile (no self-promotion)"
ON public.profiles
FOR UPDATE
USING ((id = auth.uid()) OR public.is_admin())
WITH CHECK (
  public.is_admin() OR (
    id = auth.uid()
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    AND verified = (SELECT verified FROM public.profiles WHERE id = auth.uid())
  )
);

-- 5. Lock down matches and issues RLS policies (require role = 'org_rep' AND verified = true)
DROP POLICY IF EXISTS "Allow select for all users" ON public.matches;
DROP POLICY IF EXISTS "Org reps select own org matches" ON public.matches;

CREATE POLICY "Org reps select own org matches" ON public.matches
  FOR SELECT
  USING (
    public.is_admin() OR
    org_id IN (
      SELECT org_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'org_rep' AND verified = true
    ) OR
    EXISTS (
      SELECT 1 FROM public.issues
      WHERE issues.id = matches.issue_id
        AND (issues.reporter_id = auth.uid() OR issues.status IN ('validated', 'matched', 'sanctioned', 'in_progress', 'resolved'))
    )
  );

DROP POLICY IF EXISTS "Org reps select matched issues" ON public.issues;
CREATE POLICY "Org reps select matched issues" ON public.issues
  FOR SELECT
  USING (
    public.is_admin() OR
    reporter_id = auth.uid() OR
    EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.matches m ON m.org_id = p.org_id
      WHERE p.id = auth.uid()
        AND p.role = 'org_rep'
        AND p.verified = true
        AND m.issue_id = issues.id
    )
  );

DROP POLICY IF EXISTS "Org reps update matched issue status" ON public.issues;
CREATE POLICY "Org reps update matched issue status" ON public.issues
  FOR UPDATE
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.matches m ON m.org_id = p.org_id
      WHERE p.id = auth.uid()
        AND p.role = 'org_rep'
        AND p.verified = true
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
        AND p.role = 'org_rep'
        AND p.verified = true
        AND m.issue_id = issues.id
    )
  );

-- 6. severity_votes table
CREATE TABLE IF NOT EXISTS public.severity_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score integer CHECK (score BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT severity_votes_issue_voter_key UNIQUE (issue_id, voter_id)
);

-- Indexes for severity_votes
CREATE INDEX IF NOT EXISTS idx_severity_votes_issue_id ON public.severity_votes(issue_id);
CREATE INDEX IF NOT EXISTS idx_severity_votes_voter_id ON public.severity_votes(voter_id);

-- Enable RLS on severity_votes
ALTER TABLE public.severity_votes ENABLE ROW LEVEL SECURITY;

-- Policies for severity_votes
DROP POLICY IF EXISTS "Allow select for all users" ON public.severity_votes;
CREATE POLICY "Allow select for all users" ON public.severity_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users insert own votes" ON public.severity_votes;
CREATE POLICY "Users insert own votes" ON public.severity_votes
  FOR INSERT WITH CHECK (
    auth.uid() = voter_id
    AND NOT EXISTS (
      SELECT 1 FROM public.issues
      WHERE issues.id = severity_votes.issue_id
        AND issues.reporter_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users update own votes" ON public.severity_votes;
CREATE POLICY "Users update own votes" ON public.severity_votes
  FOR UPDATE USING (
    auth.uid() = voter_id
    AND NOT EXISTS (
      SELECT 1 FROM public.issues
      WHERE issues.id = severity_votes.issue_id
        AND issues.reporter_id = auth.uid()
    )
  );
