-- Custom build social features: ratings, comments, saves, usage stats.
-- Run in Supabase SQL editor after patch_custom_class_builder.sql.

-- ---------------------------------------------------------------------------
-- Usage stats columns on custom_builds
-- ---------------------------------------------------------------------------
alter table public.custom_builds
  add column if not exists save_count integer not null default 0,
  add column if not exists clone_count integer not null default 0;

alter table public.custom_builds
  add column if not exists cloned_from_custom_build_id bigint references public.custom_builds(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'custom_builds_save_count_non_negative'
  ) then
    alter table public.custom_builds
      add constraint custom_builds_save_count_non_negative check (save_count >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'custom_builds_clone_count_non_negative'
  ) then
    alter table public.custom_builds
      add constraint custom_builds_clone_count_non_negative check (clone_count >= 0);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- custom_build_ratings
-- ---------------------------------------------------------------------------
create table if not exists public.custom_build_ratings (
  user_id uuid not null references auth.users(id) on delete cascade,
  custom_build_id bigint not null references public.custom_builds(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, custom_build_id)
);

create index if not exists idx_custom_build_ratings_build_id
  on public.custom_build_ratings(custom_build_id);

create or replace function public.set_custom_build_average_from_ratings(p_custom_build_id bigint)
returns void
language plpgsql
as $$
begin
  update public.custom_builds
  set average_rating = coalesce(
    (select round(avg(rating)::numeric, 2) from public.custom_build_ratings where custom_build_id = p_custom_build_id),
    0
  )
  where id = p_custom_build_id;
end;
$$;

create or replace function public.trg_custom_build_ratings_touch_avg()
returns trigger
language plpgsql
as $$
declare
  bid bigint;
begin
  if tg_op = 'DELETE' then bid := old.custom_build_id;
  else bid := new.custom_build_id;
  end if;
  perform public.set_custom_build_average_from_ratings(bid);
  if tg_op = 'DELETE' then return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_custom_build_ratings_avg on public.custom_build_ratings;
create trigger trg_custom_build_ratings_avg
after insert or update or delete on public.custom_build_ratings
for each row execute function public.trg_custom_build_ratings_touch_avg();

-- ---------------------------------------------------------------------------
-- custom_build_comments
-- ---------------------------------------------------------------------------
create table if not exists public.custom_build_comments (
  id bigint generated always as identity primary key,
  custom_build_id bigint not null references public.custom_builds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_custom_build_comments_build_id
  on public.custom_build_comments(custom_build_id);

-- ---------------------------------------------------------------------------
-- saved_custom_builds
-- ---------------------------------------------------------------------------
create table if not exists public.saved_custom_builds (
  user_id uuid not null references auth.users(id) on delete cascade,
  custom_build_id bigint not null references public.custom_builds(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, custom_build_id)
);

create index if not exists idx_saved_custom_builds_build_id
  on public.saved_custom_builds(custom_build_id);

-- Backfill save_count
update public.custom_builds cb
set save_count = coalesce(s.c, 0)
from (
  select custom_build_id, count(*)::integer as c
  from public.saved_custom_builds
  group by custom_build_id
) s
where cb.id = s.custom_build_id;

-- saved_custom_builds -> save_count
create or replace function public.trg_saved_custom_builds_sync_save_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.custom_builds set save_count = save_count + 1 where id = new.custom_build_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.custom_builds
    set save_count = greatest(0, save_count - 1)
    where id = old.custom_build_id
      and save_count > 0;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_saved_custom_builds_sync_save_count on public.saved_custom_builds;
create trigger trg_saved_custom_builds_sync_save_count
  after insert or delete on public.saved_custom_builds
  for each row execute function public.trg_saved_custom_builds_sync_save_count();

-- Clone insert -> increment source clone_count
create or replace function public.trg_custom_builds_increment_clone_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.cloned_from_custom_build_id is not null then
    update public.custom_builds
    set clone_count = clone_count + 1
    where id = new.cloned_from_custom_build_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_custom_builds_increment_clone_count_ins on public.custom_builds;
create trigger trg_custom_builds_increment_clone_count_ins
  after insert on public.custom_builds
  for each row execute function public.trg_custom_builds_increment_clone_count();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.custom_build_ratings enable row level security;
alter table public.custom_build_comments enable row level security;
alter table public.saved_custom_builds enable row level security;

drop policy if exists "Anyone can read custom build ratings" on public.custom_build_ratings;
create policy "Anyone can read custom build ratings"
  on public.custom_build_ratings for select to anon, authenticated using (true);

drop policy if exists "Users insert own custom build rating" on public.custom_build_ratings;
create policy "Users insert own custom build rating"
  on public.custom_build_ratings for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own custom build rating" on public.custom_build_ratings;
create policy "Users update own custom build rating"
  on public.custom_build_ratings for update to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users delete own custom build rating" on public.custom_build_ratings;
create policy "Users delete own custom build rating"
  on public.custom_build_ratings for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Anyone can read custom build comments" on public.custom_build_comments;
create policy "Anyone can read custom build comments"
  on public.custom_build_comments for select to anon, authenticated using (true);

drop policy if exists "Authenticated insert custom build comments" on public.custom_build_comments;
create policy "Authenticated insert custom build comments"
  on public.custom_build_comments for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own custom build comment" on public.custom_build_comments;
create policy "Users delete own custom build comment"
  on public.custom_build_comments for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Anyone can read saved_custom_builds" on public.saved_custom_builds;
create policy "Anyone can read saved_custom_builds"
  on public.saved_custom_builds for select to anon, authenticated using (true);

drop policy if exists "Users insert own saved custom build" on public.saved_custom_builds;
create policy "Users insert own saved custom build"
  on public.saved_custom_builds for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own saved custom build" on public.saved_custom_builds;
create policy "Users delete own saved custom build"
  on public.saved_custom_builds for delete to authenticated
  using (auth.uid() = user_id);
