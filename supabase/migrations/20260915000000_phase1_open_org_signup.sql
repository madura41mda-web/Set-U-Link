-- ============================================================
-- Migration: 20260915000000_phase1_open_org_signup.sql
-- Phase 1 — Open Org Signup: zero-friction demo mode
--
-- 1. Add nullable org-profile columns to public.organizations
-- 2. Add INSERT policy so authenticated users can create orgs
-- 3. Relax profiles UPDATE policy to allow citizen → org_rep (direct)
-- 4. Backfill demo accounts with sample profile data
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Nullable org-profile columns on organizations
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS specializations jsonb  DEFAULT NULL;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS location        text    DEFAULT NULL;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS jurisdiction    text    DEFAULT NULL;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS focus_area      text    DEFAULT NULL;

-- ─────────────────────────────────────────────────────────────
-- 2. Allow authenticated users to INSERT their own org row
--    (needed because new signup creates the org client-side)
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users insert org during signup" ON public.organizations;
CREATE POLICY "Authenticated users insert org during signup"
  ON public.organizations
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────
-- 3. Relax profiles UPDATE policy to permit citizen → org_rep
--
--    Previous policy (from 20260914000001) allowed only:
--      citizen → pending_org_rep (verified = false)
--
--    New policy additionally allows:
--      citizen → org_rep (verified = true, org_id set by signup)
--
--    All other self-promotion paths remain blocked.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users update own profile (no self-promotion)" ON public.profiles;

CREATE POLICY "Users update own profile (no self-promotion)"
ON public.profiles
FOR UPDATE
USING ((id = auth.uid()) OR public.is_admin())
WITH CHECK (
  public.is_admin() OR (
    id = auth.uid()
    AND (
      -- Path A: no-op — same role & same verified flag (normal profile edits)
      (
        role    = (SELECT role    FROM public.profiles WHERE id = auth.uid())
        AND verified = (SELECT verified FROM public.profiles WHERE id = auth.uid())
      )
      -- Path B: legacy — citizen → pending_org_rep (verified stays false)
      OR (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'citizen'
        AND role = 'pending_org_rep'
        AND verified = false
      )
      -- Path C: phase-1 — citizen → org_rep, verified = true (open signup)
      OR (
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'citizen'
        AND role = 'org_rep'
        AND verified = true
      )
    )
  )
);

-- ─────────────────────────────────────────────────────────────
-- 4. Backfill demo accounts with sample profile data
--    Existing rows are updated; no rows are created.
-- ─────────────────────────────────────────────────────────────

-- madura41mda@gmail.com → university account (BIT Mesra / first university org)
UPDATE public.organizations
SET
  specializations = '["Civil Engineering", "Water Resources", "Agriculture"]'::jsonb,
  location        = 'Ranchi, Jharkhand'
WHERE id = (
  SELECT org_id
  FROM   public.profiles
  WHERE  id = (SELECT id FROM auth.users WHERE email = 'madura41mda@gmail.com')
  LIMIT  1
)
AND id IS NOT NULL;

-- madura.0741@gmail.com → csr/industry account
UPDATE public.organizations
SET
  focus_area = 'Tribal livelihood and community development CSR',
  location   = 'Jamshedpur, Jharkhand'
WHERE id = (
  SELECT org_id
  FROM   public.profiles
  WHERE  id = (SELECT id FROM auth.users WHERE email = 'madura.0741@gmail.com')
  LIMIT  1
)
AND id IS NOT NULL;
