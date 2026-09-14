-- ============================================================
-- Migration: 20260914000003_add_severity_recalc_trigger.sql
-- Auto-recalculates avg_severity_score on issues table whenever
-- a severity_vote is inserted or updated.
-- ============================================================

CREATE OR REPLACE FUNCTION public.recalc_issue_severity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.issues
  SET avg_severity_score = (
    SELECT ROUND(AVG(score)::numeric, 1)
    FROM public.severity_votes
    WHERE issue_id = NEW.issue_id
  )
  WHERE id = NEW.issue_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_severity ON public.severity_votes;
CREATE TRIGGER trg_recalc_severity
AFTER INSERT OR UPDATE ON public.severity_votes
FOR EACH ROW
EXECUTE FUNCTION public.recalc_issue_severity();
