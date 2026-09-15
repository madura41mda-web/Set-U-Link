-- ============================================================
-- Migration: 20260915000003_add_org_lat_lng_and_seed_jharkhand_orgs.sql
-- Adds numeric latitude/longitude columns to organizations and
-- seeds 10 real Jharkhand partner organizations with coordinates.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Add all required columns (nullable, additive, safe to re-run)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS latitude  numeric(10, 6) DEFAULT NULL;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS longitude numeric(10, 6) DEFAULT NULL;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS specializations jsonb DEFAULT NULL;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS location text DEFAULT NULL;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS focus_area text DEFAULT NULL;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS jurisdiction text DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_lat  ON public.organizations(latitude);
CREATE INDEX IF NOT EXISTS idx_organizations_lng  ON public.organizations(longitude);

-- ─────────────────────────────────────────────────────────────
-- 2. Backfill existing seed rows with approximate coordinates
--    (BIT Mesra + Tata Steel CSR from the original seed.sql)
-- ─────────────────────────────────────────────────────────────
UPDATE public.organizations SET latitude = 23.4145, longitude = 85.4384
  WHERE name ILIKE '%BIT Mesra%' AND latitude IS NULL;

UPDATE public.organizations SET latitude = 23.8143, longitude = 86.4322
  WHERE (name ILIKE '%ISM%' OR name ILIKE '%IIT%') AND district = 'Dhanbad' AND latitude IS NULL;

UPDATE public.organizations SET latitude = 22.8046, longitude = 86.2029
  WHERE name ILIKE '%Tata Steel%' AND latitude IS NULL;

UPDATE public.organizations SET latitude = 23.6693, longitude = 85.9812
  WHERE name ILIKE '%Bokaro Steel%' AND latitude IS NULL;

UPDATE public.organizations SET latitude = 23.9981, longitude = 85.3647
  WHERE district = 'Hazaribagh' AND latitude IS NULL;

UPDATE public.organizations SET latitude = 24.4826, longitude = 86.6994
  WHERE district = 'Deoghar' AND latitude IS NULL;

UPDATE public.organizations SET latitude = 24.1843, longitude = 86.3039
  WHERE district = 'Giridih' AND latitude IS NULL;

UPDATE public.organizations SET latitude = 23.6288, longitude = 85.5152
  WHERE district = 'Ramgarh' AND latitude IS NULL;

UPDATE public.organizations SET latitude = 22.5539, longitude = 85.8081
  WHERE district = 'West Singhbhum' AND latitude IS NULL;

-- Fallback: Ranchi city center for anything remaining
UPDATE public.organizations SET latitude = 23.3441, longitude = 85.3096
  WHERE latitude IS NULL;

-- ─────────────────────────────────────────────────────────────
-- 3. Upsert the 10 real Jharkhand partner orgs
--    Uses ON CONFLICT DO UPDATE on (name, district) so running
--    this migration twice is safe.
-- ─────────────────────────────────────────────────────────────

-- Ensure unique constraint exists for idempotent upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organizations_name_district_key'
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_name_district_key UNIQUE (name, district);
  END IF;
END $$;

INSERT INTO public.organizations
  (name, type, district, category_tags, specializations, latitude, longitude, location, focus_area, jurisdiction, created_at)
VALUES

-- ── Universities ────────────────────────────────────────────────────────────
(
  'BIT Mesra',
  'university', 'Ranchi',
  ARRAY['infra','water','agriculture'],
  '["Civil Engineering","Mechanical Engineering","CSE","Electrical Engineering"]'::jsonb,
  23.4145, 85.4384,
  'Mesra, Ranchi, Jharkhand',
  NULL, NULL,
  NOW() - INTERVAL '90 days'
),
(
  'IIT (ISM) Dhanbad',
  'university', 'Dhanbad',
  ARRAY['water','sanitation','infra'],
  '["Civil Engineering","Environmental Engineering","Water Resources"]'::jsonb,
  23.8143, 86.4322,
  'Dhanbad, Jharkhand',
  NULL, NULL,
  NOW() - INTERVAL '90 days'
),
(
  'NIT Jamshedpur',
  'university', 'East Singhbhum',
  ARRAY['infra','water','education'],
  '["Civil Engineering","Mechanical Engineering","CSE","Electrical Engineering"]'::jsonb,
  22.7925, 86.1842,
  'Jamshedpur, Jharkhand',
  NULL, NULL,
  NOW() - INTERVAL '90 days'
),
(
  'Central University of Jharkhand',
  'university', 'Ranchi',
  ARRAY['agriculture','health','livelihood'],
  '["Rural Development","Agriculture","Public Health"]'::jsonb,
  23.3629, 85.3273,
  'Ranchi, Jharkhand',
  NULL, NULL,
  NOW() - INTERVAL '90 days'
),
(
  'XISS Ranchi',
  'university', 'Ranchi',
  ARRAY['health','livelihood','education'],
  '["Rural Development","Public Health"]'::jsonb,
  23.3948, 85.3406,
  'Ranchi, Jharkhand',
  NULL, NULL,
  NOW() - INTERVAL '90 days'
),

-- ── Industry / CSR ──────────────────────────────────────────────────────────
(
  'Tata Steel CSR Jamshedpur',
  'industry', 'East Singhbhum',
  ARRAY['infra','water','sanitation'],
  NULL,
  22.8046, 86.2029,
  'Jamshedpur, Jharkhand',
  'Infrastructure, Water & Sanitation', NULL,
  NOW() - INTERVAL '90 days'
),
(
  'SAIL Bokaro CSR',
  'industry', 'Bokaro',
  ARRAY['infra','livelihood','education'],
  NULL,
  23.6693, 86.1511,
  'Bokaro, Jharkhand',
  'Environment, Rural Development', NULL,
  NOW() - INTERVAL '90 days'
),
(
  'JUSCO Jamshedpur Utilities',
  'industry', 'East Singhbhum',
  ARRAY['water','sanitation','infra'],
  NULL,
  22.7995, 86.1836,
  'Jamshedpur, Jharkhand',
  'Water Supply, Urban Infrastructure', NULL,
  NOW() - INTERVAL '90 days'
),
(
  'Coal India CSR Ranchi',
  'industry', 'Ranchi',
  ARRAY['livelihood','education','health'],
  NULL,
  23.3629, 85.3346,
  'Ranchi, Jharkhand',
  'Rural Development, Education', NULL,
  NOW() - INTERVAL '90 days'
),

-- ── Government ──────────────────────────────────────────────────────────────
(
  'Jharkhand Water Resources Department',
  'government', 'Ranchi',
  ARRAY['water','infra','sanitation'],
  NULL,
  23.3441, 85.3096,
  'Ranchi, Jharkhand',
  NULL, 'State-wide — Water Resources',
  NOW() - INTERVAL '90 days'
),
(
  'Ranchi Municipal Corporation',
  'government', 'Ranchi',
  ARRAY['infra','sanitation','health'],
  NULL,
  23.3629, 85.3346,
  'Ranchi, Jharkhand',
  NULL, 'Ranchi Urban Area',
  NOW() - INTERVAL '90 days'
)

ON CONFLICT (name, district)
DO UPDATE SET
  latitude      = EXCLUDED.latitude,
  longitude     = EXCLUDED.longitude,
  specializations = COALESCE(EXCLUDED.specializations, organizations.specializations),
  focus_area    = COALESCE(EXCLUDED.focus_area, organizations.focus_area),
  jurisdiction  = COALESCE(EXCLUDED.jurisdiction, organizations.jurisdiction),
  location      = COALESCE(EXCLUDED.location, organizations.location),
  category_tags = EXCLUDED.category_tags;