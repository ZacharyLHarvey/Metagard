-- Comments on user-generated content (battlegames, monsters, custom spells, custom classes).

create table if not exists public.battle_game_comments (
  id bigint generated always as identity primary key,
  battle_game_id bigint not null references public.battle_games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_battle_game_comments_battle_game_id on public.battle_game_comments(battle_game_id);

create table if not exists public.monster_comments (
  id bigint generated always as identity primary key,
  monster_id bigint not null references public.monsters(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_monster_comments_monster_id on public.monster_comments(monster_id);

create table if not exists public.custom_spell_comments (
  id bigint generated always as identity primary key,
  custom_spell_id bigint not null references public.custom_spells(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_custom_spell_comments_custom_spell_id on public.custom_spell_comments(custom_spell_id);

create table if not exists public.custom_class_comments (
  id bigint generated always as identity primary key,
  custom_class_id bigint not null references public.custom_classes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_custom_class_comments_custom_class_id on public.custom_class_comments(custom_class_id);

alter table public.battle_game_comments enable row level security;
alter table public.monster_comments enable row level security;
alter table public.custom_spell_comments enable row level security;
alter table public.custom_class_comments enable row level security;

-- battle_game_comments
drop policy if exists "Anyone can read battle game comments" on public.battle_game_comments;
create policy "Anyone can read battle game comments"
  on public.battle_game_comments for select to anon, authenticated using (true);

drop policy if exists "Authenticated insert battle game comments" on public.battle_game_comments;
create policy "Authenticated insert battle game comments"
  on public.battle_game_comments for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own battle game comment" on public.battle_game_comments;
create policy "Users delete own battle game comment"
  on public.battle_game_comments for delete to authenticated
  using (auth.uid() = user_id);

-- monster_comments
drop policy if exists "Anyone can read monster comments" on public.monster_comments;
create policy "Anyone can read monster comments"
  on public.monster_comments for select to anon, authenticated using (true);

drop policy if exists "Authenticated insert monster comments" on public.monster_comments;
create policy "Authenticated insert monster comments"
  on public.monster_comments for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own monster comment" on public.monster_comments;
create policy "Users delete own monster comment"
  on public.monster_comments for delete to authenticated
  using (auth.uid() = user_id);

-- custom_spell_comments
drop policy if exists "Anyone can read custom spell comments" on public.custom_spell_comments;
create policy "Anyone can read custom spell comments"
  on public.custom_spell_comments for select to anon, authenticated using (true);

drop policy if exists "Authenticated insert custom spell comments" on public.custom_spell_comments;
create policy "Authenticated insert custom spell comments"
  on public.custom_spell_comments for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own custom spell comment" on public.custom_spell_comments;
create policy "Users delete own custom spell comment"
  on public.custom_spell_comments for delete to authenticated
  using (auth.uid() = user_id);

-- custom_class_comments
drop policy if exists "Anyone can read custom class comments" on public.custom_class_comments;
create policy "Anyone can read custom class comments"
  on public.custom_class_comments for select to anon, authenticated using (true);

drop policy if exists "Authenticated insert custom class comments" on public.custom_class_comments;
create policy "Authenticated insert custom class comments"
  on public.custom_class_comments for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users delete own custom class comment" on public.custom_class_comments;
create policy "Users delete own custom class comment"
  on public.custom_class_comments for delete to authenticated
  using (auth.uid() = user_id);
