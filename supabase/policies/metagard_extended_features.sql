-- Metagard extended features: ratings, comments, build metadata, UGC skeletons.
-- Run in Supabase SQL Editor after spellbook_schema / class rules.
-- Idempotent where possible (IF NOT EXISTS).

-- ---------------------------------------------------------------------------
-- Builds: extra descriptive fields + class already exists
-- ---------------------------------------------------------------------------
alter table public.builds
  add column if not exists play_style text,
  add column if not exists build_priority text,
  add column if not exists synergy text,
  add column if not exists enemies text,
  add column if not exists recommended_gear text;

comment on column public.builds.build_priority is 'User-facing "priority" (e.g. role focus); avoids reserved word priority.';

-- ---------------------------------------------------------------------------
-- Spells: average for leaderboard / list
-- ---------------------------------------------------------------------------
alter table public.spells
  add column if not exists average_rating numeric(4,2) not null default 0;

-- ---------------------------------------------------------------------------
-- Profiles: favorites (graphs deferred — store labels for now)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists favorite_class text,
  add column if not exists favorite_battle_game text,
  add column if not exists favorite_spell text;

-- ---------------------------------------------------------------------------
-- Build ratings (rate once: PK user_id + build_id)
-- ---------------------------------------------------------------------------
create table if not exists public.build_ratings (
  user_id uuid not null references auth.users(id) on delete cascade,
  build_id bigint not null references public.builds(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, build_id)
);

create index if not exists idx_build_ratings_build_id on public.build_ratings(build_id);

create or replace function public.set_build_average_from_ratings(p_build_id bigint)
returns void
language plpgsql
as $$
begin
  update public.builds
  set average_rating = coalesce(
    (select round(avg(rating)::numeric, 2) from public.build_ratings where build_id = p_build_id),
    0
  )
  where id = p_build_id;
end;
$$;

create or replace function public.trg_build_ratings_touch_build_avg()
returns trigger
language plpgsql
as $$
declare
  bid bigint;
begin
  if tg_op = 'DELETE' then bid := old.build_id;
  else bid := new.build_id;
  end if;
  perform public.set_build_average_from_ratings(bid);
  if tg_op = 'DELETE' then return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_build_ratings_avg on public.build_ratings;
create trigger trg_build_ratings_avg
after insert or update or delete on public.build_ratings
for each row execute function public.trg_build_ratings_touch_build_avg();

-- ---------------------------------------------------------------------------
-- Build comments
-- ---------------------------------------------------------------------------
create table if not exists public.build_comments (
  id bigint generated always as identity primary key,
  build_id bigint not null references public.builds(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_build_comments_build_id on public.build_comments(build_id);

-- ---------------------------------------------------------------------------
-- Spell ratings (rate once)
-- ---------------------------------------------------------------------------
create table if not exists public.spell_ratings (
  user_id uuid not null references auth.users(id) on delete cascade,
  spell_id bigint not null references public.spells(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (user_id, spell_id)
);

create index if not exists idx_spell_ratings_spell_id on public.spell_ratings(spell_id);

create or replace function public.trg_spell_ratings_touch_avg()
returns trigger
language plpgsql
as $$
declare
  sid bigint;
begin
  if tg_op = 'DELETE' then sid := old.spell_id;
  else sid := new.spell_id;
  end if;
  update public.spells
  set average_rating = coalesce(
    (select round(avg(rating)::numeric, 2) from public.spell_ratings where spell_id = sid),
    0
  )
  where id = sid;
  if tg_op = 'DELETE' then return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_spell_ratings_avg on public.spell_ratings;
create trigger trg_spell_ratings_avg
after insert or update or delete on public.spell_ratings
for each row execute function public.trg_spell_ratings_touch_avg();

-- ---------------------------------------------------------------------------
-- User-generated: monsters, custom classes, battle games, custom spells
-- ---------------------------------------------------------------------------
create table if not exists public.monsters (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  average_rating numeric(4,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.monster_ratings (
  user_id uuid not null references auth.users(id) on delete cascade,
  monster_id bigint not null references public.monsters(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (user_id, monster_id)
);

create or replace function public.trg_monster_ratings_touch_avg()
returns trigger
language plpgsql
as $$
declare
  mid bigint;
begin
  if tg_op = 'DELETE' then mid := old.monster_id;
  else mid := new.monster_id;
  end if;
  update public.monsters
  set average_rating = coalesce(
    (select round(avg(rating)::numeric, 2) from public.monster_ratings where monster_id = mid),
    0
  )
  where id = mid;
  if tg_op = 'DELETE' then return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_monster_ratings_avg on public.monster_ratings;
create trigger trg_monster_ratings_avg
after insert or update or delete on public.monster_ratings
for each row execute function public.trg_monster_ratings_touch_avg();

create table if not exists public.custom_classes (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  average_rating numeric(4,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.custom_class_ratings (
  user_id uuid not null references auth.users(id) on delete cascade,
  custom_class_id bigint not null references public.custom_classes(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (user_id, custom_class_id)
);

create or replace function public.trg_custom_class_ratings_touch_avg()
returns trigger
language plpgsql
as $$
declare
  cid bigint;
begin
  if tg_op = 'DELETE' then cid := old.custom_class_id;
  else cid := new.custom_class_id;
  end if;
  update public.custom_classes
  set average_rating = coalesce(
    (select round(avg(rating)::numeric, 2) from public.custom_class_ratings where custom_class_id = cid),
    0
  )
  where id = cid;
  if tg_op = 'DELETE' then return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_custom_class_ratings_avg on public.custom_class_ratings;
create trigger trg_custom_class_ratings_avg
after insert or update or delete on public.custom_class_ratings
for each row execute function public.trg_custom_class_ratings_touch_avg();

create table if not exists public.battle_games (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  average_rating numeric(4,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.battle_game_ratings (
  user_id uuid not null references auth.users(id) on delete cascade,
  battle_game_id bigint not null references public.battle_games(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (user_id, battle_game_id)
);

create or replace function public.trg_battle_game_ratings_touch_avg()
returns trigger
language plpgsql
as $$
declare
  gid bigint;
begin
  if tg_op = 'DELETE' then gid := old.battle_game_id;
  else gid := new.battle_game_id;
  end if;
  update public.battle_games
  set average_rating = coalesce(
    (select round(avg(rating)::numeric, 2) from public.battle_game_ratings where battle_game_id = gid),
    0
  )
  where id = gid;
  if tg_op = 'DELETE' then return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_battle_game_ratings_avg on public.battle_game_ratings;
create trigger trg_battle_game_ratings_avg
after insert or update or delete on public.battle_game_ratings
for each row execute function public.trg_battle_game_ratings_touch_avg();

create table if not exists public.custom_spells (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  average_rating numeric(4,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.custom_spell_ratings (
  user_id uuid not null references auth.users(id) on delete cascade,
  custom_spell_id bigint not null references public.custom_spells(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (user_id, custom_spell_id)
);

create or replace function public.trg_custom_spell_ratings_touch_avg()
returns trigger
language plpgsql
as $$
declare
  cid bigint;
begin
  if tg_op = 'DELETE' then cid := old.custom_spell_id;
  else cid := new.custom_spell_id;
  end if;
  update public.custom_spells
  set average_rating = coalesce(
    (select round(avg(rating)::numeric, 2) from public.custom_spell_ratings where custom_spell_id = cid),
    0
  )
  where id = cid;
  if tg_op = 'DELETE' then return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_custom_spell_ratings_avg on public.custom_spell_ratings;
create trigger trg_custom_spell_ratings_avg
after insert or update or delete on public.custom_spell_ratings
for each row execute function public.trg_custom_spell_ratings_touch_avg();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.build_ratings enable row level security;
alter table public.build_comments enable row level security;
alter table public.spell_ratings enable row level security;
alter table public.monsters enable row level security;
alter table public.monster_ratings enable row level security;
alter table public.custom_classes enable row level security;
alter table public.custom_class_ratings enable row level security;
alter table public.battle_games enable row level security;
alter table public.battle_game_ratings enable row level security;
alter table public.custom_spells enable row level security;
alter table public.custom_spell_ratings enable row level security;

-- build_ratings
drop policy if exists "Anyone can read build ratings" on public.build_ratings;
create policy "Anyone can read build ratings"
  on public.build_ratings for select to anon, authenticated using (true);

drop policy if exists "Users insert own build rating" on public.build_ratings;
create policy "Users insert own build rating"
  on public.build_ratings for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own build rating" on public.build_ratings;
create policy "Users update own build rating"
  on public.build_ratings for update to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users delete own build rating" on public.build_ratings;
create policy "Users delete own build rating"
  on public.build_ratings for delete to authenticated
  using (auth.uid() = user_id);

-- build_comments
drop policy if exists "Anyone can read build comments" on public.build_comments;
create policy "Anyone can read build comments"
  on public.build_comments for select to anon, authenticated using (true);

drop policy if exists "Authenticated insert build comments" on public.build_comments;
create policy "Authenticated insert build comments"
  on public.build_comments for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own build comment" on public.build_comments;
create policy "Users delete own build comment"
  on public.build_comments for delete to authenticated
  using (auth.uid() = user_id);

-- spell_ratings
drop policy if exists "Anyone can read spell ratings" on public.spell_ratings;
create policy "Anyone can read spell ratings"
  on public.spell_ratings for select to anon, authenticated using (true);

drop policy if exists "Users insert own spell rating" on public.spell_ratings;
create policy "Users insert own spell rating"
  on public.spell_ratings for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own spell rating" on public.spell_ratings;
create policy "Users update own spell rating"
  on public.spell_ratings for update to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users delete own spell rating" on public.spell_ratings;
create policy "Users delete own spell rating"
  on public.spell_ratings for delete to authenticated
  using (auth.uid() = user_id);

-- monsters
drop policy if exists "Anyone can read monsters" on public.monsters;
create policy "Anyone can read monsters"
  on public.monsters for select to anon, authenticated using (true);

drop policy if exists "Users insert own monsters" on public.monsters;
create policy "Users insert own monsters"
  on public.monsters for insert to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "Users update own monsters" on public.monsters;
create policy "Users update own monsters"
  on public.monsters for update to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "Users delete own monsters" on public.monsters;
create policy "Users delete own monsters"
  on public.monsters for delete to authenticated
  using (auth.uid() = owner_id);

-- monster_ratings (mirror spell_ratings)
drop policy if exists "Anyone can read monster ratings" on public.monster_ratings;
create policy "Anyone can read monster ratings"
  on public.monster_ratings for select to anon, authenticated using (true);
drop policy if exists "Users insert own monster rating" on public.monster_ratings;
create policy "Users insert own monster rating"
  on public.monster_ratings for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users update own monster rating" on public.monster_ratings;
create policy "Users update own monster rating"
  on public.monster_ratings for update to authenticated using (auth.uid() = user_id);
drop policy if exists "Users delete own monster rating" on public.monster_ratings;
create policy "Users delete own monster rating"
  on public.monster_ratings for delete to authenticated using (auth.uid() = user_id);

-- custom_classes
drop policy if exists "Anyone can read custom_classes" on public.custom_classes;
create policy "Anyone can read custom_classes"
  on public.custom_classes for select to anon, authenticated using (true);
drop policy if exists "Users insert own custom_classes" on public.custom_classes;
create policy "Users insert own custom_classes"
  on public.custom_classes for insert to authenticated with check (auth.uid() = owner_id);
drop policy if exists "Users update own custom_classes" on public.custom_classes;
create policy "Users update own custom_classes"
  on public.custom_classes for update to authenticated using (auth.uid() = owner_id);
drop policy if exists "Users delete own custom_classes" on public.custom_classes;
create policy "Users delete own custom_classes"
  on public.custom_classes for delete to authenticated using (auth.uid() = owner_id);

drop policy if exists "Anyone can read custom_class_ratings" on public.custom_class_ratings;
create policy "Anyone can read custom_class_ratings"
  on public.custom_class_ratings for select to anon, authenticated using (true);
drop policy if exists "Users insert own custom_class rating" on public.custom_class_ratings;
create policy "Users insert own custom_class rating"
  on public.custom_class_ratings for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users update own custom_class rating" on public.custom_class_ratings;
create policy "Users update own custom_class rating"
  on public.custom_class_ratings for update to authenticated using (auth.uid() = user_id);
drop policy if exists "Users delete own custom_class rating" on public.custom_class_ratings;
create policy "Users delete own custom_class rating"
  on public.custom_class_ratings for delete to authenticated using (auth.uid() = user_id);

-- battle_games
drop policy if exists "Anyone can read battle_games" on public.battle_games;
create policy "Anyone can read battle_games"
  on public.battle_games for select to anon, authenticated using (true);
drop policy if exists "Users insert own battle_games" on public.battle_games;
create policy "Users insert own battle_games"
  on public.battle_games for insert to authenticated with check (auth.uid() = owner_id);
drop policy if exists "Users update own battle_games" on public.battle_games;
create policy "Users update own battle_games"
  on public.battle_games for update to authenticated using (auth.uid() = owner_id);
drop policy if exists "Users delete own battle_games" on public.battle_games;
create policy "Users delete own battle_games"
  on public.battle_games for delete to authenticated using (auth.uid() = owner_id);

drop policy if exists "Anyone can read battle_game_ratings" on public.battle_game_ratings;
create policy "Anyone can read battle_game_ratings"
  on public.battle_game_ratings for select to anon, authenticated using (true);
drop policy if exists "Users insert own battle_game rating" on public.battle_game_ratings;
create policy "Users insert own battle_game rating"
  on public.battle_game_ratings for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users update own battle_game rating" on public.battle_game_ratings;
create policy "Users update own battle_game rating"
  on public.battle_game_ratings for update to authenticated using (auth.uid() = user_id);
drop policy if exists "Users delete own battle_game rating" on public.battle_game_ratings;
create policy "Users delete own battle_game rating"
  on public.battle_game_ratings for delete to authenticated using (auth.uid() = user_id);

-- custom_spells
drop policy if exists "Anyone can read custom_spells" on public.custom_spells;
create policy "Anyone can read custom_spells"
  on public.custom_spells for select to anon, authenticated using (true);
drop policy if exists "Users insert own custom_spells" on public.custom_spells;
create policy "Users insert own custom_spells"
  on public.custom_spells for insert to authenticated with check (auth.uid() = owner_id);
drop policy if exists "Users update own custom_spells" on public.custom_spells;
create policy "Users update own custom_spells"
  on public.custom_spells for update to authenticated using (auth.uid() = owner_id);
drop policy if exists "Users delete own custom_spells" on public.custom_spells;
create policy "Users delete own custom_spells"
  on public.custom_spells for delete to authenticated using (auth.uid() = owner_id);

drop policy if exists "Anyone can read custom_spell_ratings" on public.custom_spell_ratings;
create policy "Anyone can read custom_spell_ratings"
  on public.custom_spell_ratings for select to anon, authenticated using (true);
drop policy if exists "Users insert own custom_spell rating" on public.custom_spell_ratings;
create policy "Users insert own custom_spell rating"
  on public.custom_spell_ratings for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users update own custom_spell rating" on public.custom_spell_ratings;
create policy "Users update own custom_spell rating"
  on public.custom_spell_ratings for update to authenticated using (auth.uid() = user_id);
drop policy if exists "Users delete own custom_spell rating" on public.custom_spell_ratings;
create policy "Users delete own custom_spell rating"
  on public.custom_spell_ratings for delete to authenticated using (auth.uid() = user_id);

-- Optional: backfill build averages from existing ratings (none yet)
-- select public.set_build_average_from_ratings(id) from public.builds;

-- Profiles: allow users to update their own row (favorites)
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Core classes ratings (rate once per user/class_name)
-- ---------------------------------------------------------------------------
create unique index if not exists classes_name_unique_idx on public.classes(name);

create table if not exists public.class_ratings (
  user_id uuid not null references auth.users(id) on delete cascade,
  class_name text not null references public.classes(name) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, class_name)
);

create index if not exists idx_class_ratings_class_name on public.class_ratings(class_name);

alter table public.class_ratings enable row level security;

drop policy if exists "Anyone can read class_ratings" on public.class_ratings;
create policy "Anyone can read class_ratings"
  on public.class_ratings for select to anon, authenticated using (true);

drop policy if exists "Users insert own class_rating" on public.class_ratings;
create policy "Users insert own class_rating"
  on public.class_ratings for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users update own class_rating" on public.class_ratings;
create policy "Users update own class_rating"
  on public.class_ratings for update to authenticated using (auth.uid() = user_id);

drop policy if exists "Users delete own class_rating" on public.class_ratings;
create policy "Users delete own class_rating"
  on public.class_ratings for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Favorites stats (RPC) for charts
-- Uses SECURITY DEFINER + row_security=off so we can read aggregate counts
-- without exposing profile rows directly.
-- ---------------------------------------------------------------------------
create or replace function public.get_profile_favorites_stats()
returns jsonb
language sql
security definer
set search_path = public
set row_security = off
as $$
  select jsonb_build_object(
    'favorite_class',
      coalesce(
        (
          select jsonb_agg(jsonb_build_object('label', favorite_class, 'count', cnt) order by cnt desc, favorite_class asc)
          from (
            select favorite_class, count(*)::int as cnt
            from public.profiles
            where favorite_class is not null and btrim(favorite_class) <> ''
            group by favorite_class
          ) t
        ),
        '[]'::jsonb
      ),
    'favorite_battle_game',
      coalesce(
        (
          select jsonb_agg(jsonb_build_object('label', favorite_battle_game, 'count', cnt) order by cnt desc, favorite_battle_game asc)
          from (
            select favorite_battle_game, count(*)::int as cnt
            from public.profiles
            where favorite_battle_game is not null and btrim(favorite_battle_game) <> ''
            group by favorite_battle_game
          ) t
        ),
        '[]'::jsonb
      ),
    'favorite_spell',
      coalesce(
        (
          select jsonb_agg(jsonb_build_object('label', favorite_spell, 'count', cnt) order by cnt desc, favorite_spell asc)
          from (
            select favorite_spell, count(*)::int as cnt
            from public.profiles
            where favorite_spell is not null and btrim(favorite_spell) <> ''
            group by favorite_spell
          ) t
        ),
        '[]'::jsonb
      )
  );
$$;

revoke all on function public.get_profile_favorites_stats() from public;
grant execute on function public.get_profile_favorites_stats() to anon, authenticated;
