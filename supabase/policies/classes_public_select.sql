-- Run in Supabase SQL Editor if the `classes` table is not visible to the app.
-- Row Level Security with no SELECT policy causes PostgREST to return an empty array.

alter table public.classes enable row level security;

drop policy if exists "Anyone can read classes" on public.classes;
create policy "Anyone can read classes"
  on public.classes
  for select
  to anon, authenticated
  using (true);
