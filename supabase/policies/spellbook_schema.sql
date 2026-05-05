-- Spellbook persistence schema additions (non-breaking, additive only).
-- Run this in Supabase SQL editor.

alter table public.builds
  add column if not exists owner_id uuid references auth.users(id) on delete set null,
  add column if not exists ruleset_version text default 'V8.7',
  add column if not exists notes text;

create index if not exists idx_builds_owner_id on public.builds(owner_id);

create table if not exists public.saved_builds (
  user_id uuid not null references auth.users(id) on delete cascade,
  build_id bigint not null references public.builds(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, build_id)
);

create index if not exists idx_saved_builds_build_id on public.saved_builds(build_id);

create table if not exists public.build_spell_selections (
  id bigint generated always as identity primary key,
  build_id bigint not null references public.builds(id) on delete cascade,
  spell_id bigint not null references public.spells(id) on delete restrict,
  spell_level int not null check (spell_level between 1 and 6),
  purchased int not null default 1 check (purchased >= 0),
  experienced int not null default 0 check (experienced between 0 and 2),
  selection_group text,
  chosen boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_build_spell_selections_build_id
  on public.build_spell_selections(build_id);

create index if not exists idx_build_spell_selections_spell_id
  on public.build_spell_selections(spell_id);

create unique index if not exists idx_build_spell_selections_unique_key
  on public.build_spell_selections(build_id, spell_id, spell_level, coalesce(selection_group, ''));

create table if not exists public.patch_notes (
  id bigint generated always as identity primary key,
  version text not null,
  title text not null,
  details text[] not null default '{}',
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_build_spell_selections_updated_at on public.build_spell_selections;
create trigger trg_build_spell_selections_updated_at
before update on public.build_spell_selections
for each row execute function public.set_updated_at_timestamp();

alter table public.saved_builds enable row level security;
alter table public.build_spell_selections enable row level security;
alter table public.patch_notes enable row level security;

create policy "Users can save builds for themselves"
  on public.saved_builds
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can remove their own saved builds"
  on public.saved_builds
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can read their own saved builds"
  on public.saved_builds
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Anyone can read build spell selections"
  on public.build_spell_selections
  for select
  to anon, authenticated
  using (true);

create policy "Build owners can insert spell selections"
  on public.build_spell_selections
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.builds b
      where b.id = build_id
        and b.owner_id = auth.uid()
    )
  );

create policy "Build owners can update spell selections"
  on public.build_spell_selections
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.builds b
      where b.id = build_id
        and b.owner_id = auth.uid()
    )
  );

create policy "Build owners can delete spell selections"
  on public.build_spell_selections
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.builds b
      where b.id = build_id
        and b.owner_id = auth.uid()
    )
  );

create policy "Anyone can read patch notes"
  on public.patch_notes
  for select
  to anon, authenticated
  using (true);

alter table public.builds enable row level security;

create policy "Owners can insert their own builds"
  on public.builds
  for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "Owners can update their own builds"
  on public.builds
  for update
  to authenticated
  using (owner_id = auth.uid());

create policy "Owners can delete their own builds"
  on public.builds
  for delete
  to authenticated
  using (owner_id = auth.uid());
