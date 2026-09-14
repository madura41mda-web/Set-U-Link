-- Migration: 20260913000003_add_org_rep_role.sql
-- Explicitly document and add role constraint for profiles table supporting citizen, org_rep, and admin

-- Add check constraint for role values in public.profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('citizen', 'org_rep', 'panchayat_rep', 'ulb_rep', 'admin'));
  END IF;
END $$;

-- Create index on profiles(org_id) for faster org rep lookups
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON public.profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
