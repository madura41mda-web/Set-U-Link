-- ============================================================
-- Migration: 20260914000005_fix_brief_6_upvotes_realtime.sql
-- Fix Brief #6: issue_upvotes table, trigger, and Realtime publication
-- ============================================================

-- 1. Create issue_upvotes table
create table if not exists public.issue_upvotes (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  voter_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (issue_id, voter_id)
);

-- Enable RLS
alter table public.issue_upvotes enable row level security;

-- Policies for issue_upvotes
drop policy if exists "Users can view all upvotes" on public.issue_upvotes;
create policy "Users can view all upvotes"
on public.issue_upvotes for select
using (true);

drop policy if exists "Users can upvote once per issue" on public.issue_upvotes;
create policy "Users can upvote once per issue"
on public.issue_upvotes for insert
with check (auth.uid() = voter_id);

drop policy if exists "Users can remove their own upvote" on public.issue_upvotes;
create policy "Users can remove their own upvote"
on public.issue_upvotes for delete
using (auth.uid() = voter_id);

-- 2. Trigger function to recalculate issue upvotes
create or replace function public.recalc_issue_upvotes()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.issues
  set upvotes = (
    select count(*) from public.issue_upvotes where issue_id = coalesce(new.issue_id, old.issue_id)
  )
  where id = coalesce(new.issue_id, old.issue_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_recalc_upvotes on public.issue_upvotes;
create trigger trg_recalc_upvotes
after insert or delete on public.issue_upvotes
for each row
execute function public.recalc_issue_upvotes();

-- 3. Configure Realtime publication and REPLICA IDENTITY FULL
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.issues;
    alter publication supabase_realtime add table public.severity_votes;
    alter publication supabase_realtime add table public.issue_upvotes;
    alter publication supabase_realtime add table public.matches;
    alter publication supabase_realtime add table public.comments;
  end if;
exception
  when others then null;
end $$;

alter table public.issues replica identity full;
alter table public.severity_votes replica identity full;
alter table public.issue_upvotes replica identity full;
alter table public.matches replica identity full;
alter table public.comments replica identity full;
