-- ============================================================
-- Migration: 20260914000002_add_increment_upvote_rpc.sql
-- Adds RPC function to atomically increment upvotes on issues.
-- ============================================================

CREATE OR REPLACE FUNCTION public.increment_upvote(p_issue_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.issues
  SET upvotes = COALESCE(upvotes, 0) + 1
  WHERE id = p_issue_id;
$$;
