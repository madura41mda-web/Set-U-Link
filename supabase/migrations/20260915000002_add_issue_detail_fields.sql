-- ============================================================
-- Migration: 20260915000002_add_issue_detail_fields.sql
-- Phase 2/3 prep — Add nullable matching + funding columns to issues
--
-- New columns (all nullable — existing rows stay intact with NULL values):
--   severity          text    — low / medium / high / emergency
--   people_affected   integer — estimated headcount
--   timeline_required text    — urgent / short_term / medium_term / long_term / ongoing
--   estimated_funds   numeric — rough ₹ estimate, refined in later phases
--   support_types     jsonb   — array of support type strings
-- ============================================================

ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS severity          text    DEFAULT NULL;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS people_affected   integer DEFAULT NULL;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS timeline_required text    DEFAULT NULL;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS estimated_funds   numeric DEFAULT NULL;
ALTER TABLE public.issues ADD COLUMN IF NOT EXISTS support_types     jsonb   DEFAULT NULL;

-- Optional: light CHECK constraints so stored values stay canonical
-- (commented out initially — can enable once all existing rows are validated)
-- ALTER TABLE public.issues
--   ADD CONSTRAINT issues_severity_check
--   CHECK (severity IS NULL OR severity IN ('low', 'medium', 'high', 'emergency'));

-- ALTER TABLE public.issues
--   ADD CONSTRAINT issues_timeline_check
--   CHECK (timeline_required IS NULL OR timeline_required IN (
--     'urgent', 'short_term', 'medium_term', 'long_term', 'ongoing'
--   ));

-- Index severity for future matching engine queries
CREATE INDEX IF NOT EXISTS idx_issues_severity          ON public.issues(severity);
CREATE INDEX IF NOT EXISTS idx_issues_timeline_required ON public.issues(timeline_required);
