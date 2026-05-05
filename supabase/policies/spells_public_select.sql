-- Run in Supabase SQL Editor if the `spells` table is not visible to the app.
-- Row Level Security with no SELECT policy causes PostgREST to return an empty array.

alter table public.spells enable row level security;

drop policy if exists "Anyone can read spells" on public.spells;
create policy "Anyone can read spells"
  on public.spells
  for select
  to anon, authenticated
  using (true);
