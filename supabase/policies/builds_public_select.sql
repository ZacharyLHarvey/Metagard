-- Run in Supabase SQL Editor if the `builds` table returns no rows while data exists.
-- Row Level Security with no SELECT policy causes PostgREST to return an empty array (not an error).

alter table public.builds enable row level security;

create policy "Anyone can read builds"
  on public.builds
  for select
  to anon, authenticated
  using (true);
