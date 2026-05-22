-- Run in Supabase SQL Editor if build_groups tables return no rows while data exists.
-- Row Level Security with no SELECT policy causes PostgREST to return an empty array (not an error).

alter table public.build_groups enable row level security;

drop policy if exists "Anyone can read build_groups" on public.build_groups;
create policy "Anyone can read build_groups"
  on public.build_groups
  for select
  to anon, authenticated
  using (true);

alter table public.build_group_builds enable row level security;

drop policy if exists "Anyone can read build_group_builds" on public.build_group_builds;
create policy "Anyone can read build_group_builds"
  on public.build_group_builds
  for select
  to anon, authenticated
  using (true);

alter table public.build_group_ratings enable row level security;

drop policy if exists "Anyone can read build_group_ratings" on public.build_group_ratings;
create policy "Anyone can read build_group_ratings"
  on public.build_group_ratings
  for select
  to anon, authenticated
  using (true);
