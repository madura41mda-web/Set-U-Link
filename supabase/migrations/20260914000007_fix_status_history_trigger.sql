-- ============================================================
-- Migration: 20260914000007_fix_status_history_trigger.sql
-- Database trigger to prevent stray/future status_history rows
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_status_history_cleanup()
RETURNS TRIGGER AS $$
BEGIN
  -- When an issue's status is updated, remove any status_history records for stages ahead of the new status
  IF NEW.status = 'reported' THEN
    DELETE FROM public.status_history WHERE issue_id = NEW.id AND stage IN ('matched', 'sanctioned', 'in_progress', 'resolved');
  ELSIF NEW.status = 'matched' THEN
    DELETE FROM public.status_history WHERE issue_id = NEW.id AND stage IN ('sanctioned', 'in_progress', 'resolved');
  ELSIF NEW.status = 'sanctioned' THEN
    DELETE FROM public.status_history WHERE issue_id = NEW.id AND stage IN ('in_progress', 'resolved');
  ELSIF NEW.status = 'in_progress' THEN
    DELETE FROM public.status_history WHERE issue_id = NEW.id AND stage = 'resolved';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_status_history ON public.issues;
CREATE TRIGGER trigger_sync_status_history
  AFTER UPDATE OF status ON public.issues
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_status_history_cleanup();
