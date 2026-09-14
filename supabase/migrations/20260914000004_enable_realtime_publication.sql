-- Enable Realtime publication for tables in public schema
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.issues;
    alter publication supabase_realtime add table public.matches;
    alter publication supabase_realtime add table public.comments;
    alter publication supabase_realtime add table public.severity_votes;
  end if;
exception
  when others then null;
end $$;
