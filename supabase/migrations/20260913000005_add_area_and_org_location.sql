-- Migration 20260913000005_add_area_and_org_location.sql
-- Add area text column to issues & location geography column to organizations

ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS area text;

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS location geography(Point, 4326);
CREATE INDEX IF NOT EXISTS idx_organizations_location ON public.organizations USING GIST(location);

-- Backfill approximate lat/lng location for organizations based on district/city center
UPDATE public.organizations
SET location = ST_SetSRID(ST_MakePoint(85.4390, 23.4120), 4326)::geography
WHERE location IS NULL AND district = 'Ranchi' AND (name ILIKE '%BIT%' OR name ILIKE '%Mesra%');

UPDATE public.organizations
SET location = ST_SetSRID(ST_MakePoint(85.3200, 23.3500), 4326)::geography
WHERE location IS NULL AND district = 'Ranchi' AND name ILIKE '%Ranchi University%';

UPDATE public.organizations
SET location = ST_SetSRID(ST_MakePoint(85.3100, 23.3400), 4326)::geography
WHERE location IS NULL AND district = 'Ranchi' AND (name ILIKE '%Coalfields%' OR name ILIKE '%Govt%' OR name ILIKE '%Rural%');

UPDATE public.organizations
SET location = ST_SetSRID(ST_MakePoint(86.4410, 23.8140), 4326)::geography
WHERE location IS NULL AND district = 'Dhanbad' AND (name ILIKE '%ISM%' OR name ILIKE '%IIT%');

UPDATE public.organizations
SET location = ST_SetSRID(ST_MakePoint(86.4300, 23.7900), 4326)::geography
WHERE location IS NULL AND district = 'Dhanbad';

UPDATE public.organizations
SET location = ST_SetSRID(ST_MakePoint(86.2020, 22.8050), 4326)::geography
WHERE location IS NULL AND district = 'East Singhbhum' AND name ILIKE '%XLRI%';

UPDATE public.organizations
SET location = ST_SetSRID(ST_MakePoint(86.2000, 22.8000), 4326)::geography
WHERE location IS NULL AND district = 'East Singhbhum';

UPDATE public.organizations
SET location = ST_SetSRID(ST_MakePoint(85.9800, 23.6600), 4326)::geography
WHERE location IS NULL AND district = 'Bokaro';

-- Fallback default for any remaining orgs without location
UPDATE public.organizations
SET location = ST_SetSRID(ST_MakePoint(85.3096, 23.3441), 4326)::geography
WHERE location IS NULL;
