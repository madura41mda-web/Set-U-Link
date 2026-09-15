-- ============================================================
-- Migration: 20260915000001_collapse_org_types.sql
-- Phase 1 Bugfix — Collapse org types to 3 canonical values:
--   university | government | industry
--
-- 1. Migrate existing rows to new values
-- 2. Drop old CHECK constraint, add new one
-- 3. Backfill the two demo accounts to canonical values
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Migrate existing org rows to new canonical type values
--    Old → New:
--      govt                → government
--      csr                 → industry
--      startup             → industry
--      msme                → industry
--      research_institution → industry
--    (university stays as-is)
-- ─────────────────────────────────────────────────────────────
UPDATE public.organizations SET type = 'government' WHERE type = 'govt';
UPDATE public.organizations SET type = 'industry'   WHERE type IN ('csr', 'startup', 'msme', 'research_institution');

-- ─────────────────────────────────────────────────────────────
-- 2. Replace the type CHECK constraint
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_constraint_name text;
BEGIN
  -- Find and drop the existing type check constraint on organizations
  SELECT conname INTO v_constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE c.contype = 'c'
    AND t.relname = 'organizations'
    AND n.nspname = 'public'
    AND pg_get_constraintdef(c.oid) LIKE '%type%'
  LIMIT 1;

  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.organizations DROP CONSTRAINT %I', v_constraint_name);
  END IF;

  -- Add new 3-value constraint
  ALTER TABLE public.organizations
    ADD CONSTRAINT organizations_type_check
    CHECK (type IN ('university', 'government', 'industry'));
END $$;

-- ─────────────────────────────────────────────────────────────
-- 3. Backfill demo accounts to canonical values
--    (their org rows were already migrated above by the UPDATE
--     statements, so this is a safety net in case they were
--     patched directly and have stale values)
-- ─────────────────────────────────────────────────────────────

-- madura41mda@gmail.com → university (no change needed, stays 'university')
-- madura.0741@gmail.com → industry (was 'csr' or 'govt' depending on seed)
UPDATE public.organizations
SET type = 'industry'
WHERE id = (
  SELECT org_id
  FROM   public.profiles
  WHERE  id = (SELECT id FROM auth.users WHERE email = 'madura.0741@gmail.com')
  LIMIT  1
)
AND id IS NOT NULL
AND type NOT IN ('university', 'government', 'industry');
