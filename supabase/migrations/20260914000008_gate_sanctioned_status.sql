-- ============================================================
-- Migration: 20260914000008_gate_sanctioned_status.sql
-- Enforces gating on advancing issues to 'sanctioned' status:
-- Requires assigned_mentor_id AND team_members.length > 0
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_sanctioned_transition_gate()
RETURNS TRIGGER AS $$
DECLARE
  v_match RECORD;
  v_team_count INT;
BEGIN
  IF NEW.status = 'sanctioned' AND OLD.status != 'sanctioned' THEN
    -- Check if issue is assigned to a university match
    SELECT * INTO v_match FROM public.matches 
    WHERE issue_id = NEW.id AND (role = 'university' OR review_status IS NOT NULL)
    LIMIT 1;

    IF FOUND THEN
      -- Check assigned mentor
      IF v_match.assigned_mentor_id IS NULL THEN
        SELECT faculty_mentor_id INTO v_match.assigned_mentor_id
        FROM public.project_teams WHERE issue_id = NEW.id LIMIT 1;
      END IF;

      -- Check team members count
      SELECT COUNT(*) INTO v_team_count
      FROM public.team_members tm
      JOIN public.project_teams pt ON pt.id = tm.team_id
      WHERE pt.issue_id = NEW.id;

      IF v_match.assigned_mentor_id IS NULL OR v_team_count = 0 THEN
        RAISE EXCEPTION 'Cannot advance issue to sanctioned status: A faculty mentor and at least 1 student team member must be assigned first.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_sanctioned_transition ON public.issues;
CREATE TRIGGER trigger_check_sanctioned_transition
  BEFORE UPDATE OF status ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION public.check_sanctioned_transition_gate();
