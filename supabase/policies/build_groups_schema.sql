-- Build Groups: user-created collections of existing builds with ratings.
-- Run in Supabase SQL Editor after metagard_extended_features.sql (builds must exist).
-- Idempotent where possible.

-- ---------------------------------------------------------------------------
-- build_groups
-- ---------------------------------------------------------------------------
create table if not exists public.build_groups (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  average_rating numeric(4,2) not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- build_group_builds (many-to-many membership)
-- ---------------------------------------------------------------------------
create table if not exists public.build_group_builds (
  build_group_id bigint not null references public.build_groups(id) on delete cascade,
  build_id bigint not null references public.builds(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (build_group_id, build_id)
);

create index if not exists idx_build_group_builds_build_id on public.build_group_builds(build_id);
create index if not exists idx_build_group_builds_group_id on public.build_group_builds(build_group_id);

-- ---------------------------------------------------------------------------
-- build_group_ratings (rate once: PK user_id + build_group_id)
-- ---------------------------------------------------------------------------
create table if not exists public.build_group_ratings (
  user_id uuid not null references auth.users(id) on delete cascade,
  build_group_id bigint not null references public.build_groups(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, build_group_id)
);

create index if not exists idx_build_group_ratings_build_group_id on public.build_group_ratings(build_group_id);

create or replace function public.set_build_group_average_from_ratings(p_build_group_id bigint)
returns void
language plpgsql
as $$
begin
  update public.build_groups
  set average_rating = coalesce(
    (select round(avg(rating)::numeric, 2) from public.build_group_ratings where build_group_id = p_build_group_id),
    0
  )
  where id = p_build_group_id;
end;
$$;

create or replace function public.trg_build_group_ratings_touch_avg()
returns trigger
language plpgsql
as $$
declare
  gid bigint;
begin
  if tg_op = 'DELETE' then gid := old.build_group_id;
  else gid := new.build_group_id;
  end if;
  perform public.set_build_group_average_from_ratings(gid);
  if tg_op = 'DELETE' then return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_build_group_ratings_avg on public.build_group_ratings;
create trigger trg_build_group_ratings_avg
after insert or update or delete on public.build_group_ratings
for each row execute function public.trg_build_group_ratings_touch_avg();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.build_groups enable row level security;
alter table public.build_group_builds enable row level security;
alter table public.build_group_ratings enable row level security;

-- build_groups
drop policy if exists "Anyone can read build_groups" on public.build_groups;
create policy "Anyone can read build_groups"
  on public.build_groups for select to anon, authenticated using (true);

drop policy if exists "Users insert own build_groups" on public.build_groups;
create policy "Users insert own build_groups"
  on public.build_groups for insert to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "Users update own build_groups" on public.build_groups;
create policy "Users update own build_groups"
  on public.build_groups for update to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "Users delete own build_groups" on public.build_groups;
create policy "Users delete own build_groups"
  on public.build_groups for delete to authenticated
  using (auth.uid() = owner_id);

-- build_group_builds
drop policy if exists "Anyone can read build_group_builds" on public.build_group_builds;
create policy "Anyone can read build_group_builds"
  on public.build_group_builds for select to anon, authenticated using (true);

drop policy if exists "Group owners insert build_group_builds" on public.build_group_builds;
create policy "Group owners insert build_group_builds"
  on public.build_group_builds for insert to authenticated
  with check (
    exists (
      select 1 from public.build_groups g
      where g.id = build_group_id and g.owner_id = auth.uid()
    )
  );

drop policy if exists "Group owners delete build_group_builds" on public.build_group_builds;
create policy "Group owners delete build_group_builds"
  on public.build_group_builds for delete to authenticated
  using (
    exists (
      select 1 from public.build_groups g
      where g.id = build_group_id and g.owner_id = auth.uid()
    )
  );

-- build_group_ratings
drop policy if exists "Anyone can read build_group_ratings" on public.build_group_ratings;
create policy "Anyone can read build_group_ratings"
  on public.build_group_ratings for select to anon, authenticated using (true);

drop policy if exists "Users insert own build_group rating" on public.build_group_ratings;
create policy "Users insert own build_group rating"
  on public.build_group_ratings for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own build_group rating" on public.build_group_ratings;
create policy "Users update own build_group rating"
  on public.build_group_ratings for update to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users delete own build_group rating" on public.build_group_ratings;
create policy "Users delete own build_group rating"
  on public.build_group_ratings for delete to authenticated
  using (auth.uid() = user_id);
