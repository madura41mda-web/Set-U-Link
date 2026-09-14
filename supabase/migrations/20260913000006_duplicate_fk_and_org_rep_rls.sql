-- Migration 20260913000006_duplicate_fk_and_org_rep_rls.sql
-- Add foreign key constraint for duplicate_of ON DELETE SET NULL & add org_rep RLS policies

-- 1. Foreign Key for duplicate_of
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_issues_duplicate_of'
  ) THEN
    ALTER TABLE public.issues
      ADD CONSTRAINT fk_issues_duplicate_of
      FOREIGN KEY (duplicate_of)
      REFERENCES public.issues(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Drop existing RLS policies if present to update
DROP POLICY IF EXISTS "Org reps select own org matches" ON public.matches;
DROP POLICY IF EXISTS "Org reps select matched issues" ON public.issues;

-- 3. RLS Policy: Org reps can select matches for their assigned organization
CREATE POLICY "Org reps select own org matches" ON public.matches
  FOR SELECT
  USING (
    public.is_admin() OR
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

-- 4. RLS Policy: Org reps can select issues matched to their organization
CREATE POLICY "Org reps select matched issues" ON public.issues
  FOR SELECT
  USING (
    public.is_admin() OR
    reporter_id = auth.uid() OR
    EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.matches m ON m.org_id = p.org_id
      WHERE p.id = auth.uid() AND m.issue_id = issues.id
    )
  );
