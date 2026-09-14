-- Migration 20260913000004_add_issue_delete_policy.sql
-- Allow citizens to delete their own reported or validated issues

CREATE POLICY "Allow citizens to delete own reported or validated issues"
  ON issues FOR DELETE
  TO authenticated
  USING (reporter_id = auth.uid() AND status IN ('reported', 'validated'));
