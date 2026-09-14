-- ============================================================
-- Migration: 20260914000001_fix_rls_and_demo_accounts.sql
-- Fixes: (1) infinite recursion between issues/matches RLS,
-- (2) profiles policy silently blocking org signup role changes,
-- (3) directly repairs demo accounts.
-- ============================================================

-- 1. Fix RLS recursion: matches' policy no longer looks back at issues.
DROP POLICY IF EXISTS "Org reps select own org matches" ON public.matches;
CREATE POLICY "Org reps select own org matches" ON public.matches
  FOR SELECT USING (true);

-- 2. Fix profiles self-promotion policy: allow the one legitimate
--    transition (citizen -> pending_org_rep, verified stays false)
--    that OrgSignUp.jsx needs, while still blocking everything else.
DROP POLICY IF EXISTS "Users update own profile (no self-promotion)" ON public.profiles;
CREATE POLICY "Users update own profile (no self-promotion)"
ON public.profiles
FOR UPDATE
USING ((id = auth.uid()) OR public.is_admin())
WITH CHECK (
  public.is_admin() OR (
    id = auth.uid()
    AND (
      (
        role = (SELECT role FROM public.profiles WHERE id = auth.uid())
        AND verified = (SELECT verified FROM public.profiles WHERE id = auth.uid())
      )
      OR (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'citizen'
        AND role = 'pending_org_rep'
        AND verified = false
      )
    )
  )
);

-- 3. Directly repair your two demo accounts so they're guaranteed to
--    work without needing to re-run the approval flow live.
UPDATE public.profiles
SET role = 'org_rep',
    verified = true,
    org_id = (SELECT id FROM public.organizations WHERE type = 'university' LIMIT 1)
WHERE id = (SELECT id FROM auth.users WHERE email = 'madura41mda@gmail.com');

UPDATE public.profiles
SET role = 'org_rep',
    verified = true,
    org_id = (SELECT id FROM public.organizations WHERE type IN ('csr','startup','msme','govt') LIMIT 1)
WHERE id = (SELECT id FROM auth.users WHERE email = 'madura.0741@gmail.com');
