-- Custom class builder: extended class definitions, spell rules, and custom builds.
-- Run in Supabase SQL editor after metagard_extended_features.sql.

-- ---------------------------------------------------------------------------
-- Extend custom_classes
-- ---------------------------------------------------------------------------
alter table public.custom_classes
  add column if not exists class_type text,
  add column if not exists armor text,
  add column if not exists shields text,
  add column if not exists weapons text;

update public.custom_classes set class_type = 'martial' where class_type is null;

alter table public.custom_classes
  alter column class_type set default 'martial';

alter table public.custom_classes
  alter column class_type set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'custom_classes_class_type_check'
  ) then
    alter table public.custom_classes
      add constraint custom_classes_class_type_check
      check (class_type in ('martial', 'caster'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- custom_class_spell_rules (mirrors class_spell_rules for UGC classes)
-- ---------------------------------------------------------------------------
create table if not exists public.custom_class_spell_rules (
  id bigint generated always as identity primary key,
  custom_class_id bigint not null references public.custom_classes(id) on delete cascade,
  spell_id bigint references public.spells(id) on delete cascade,
  custom_spell_id bigint references public.custom_spells(id) on delete cascade,
  spell_level int not null check (spell_level between 1 and 6),
  cost int not null default 0,
  max_count int,
  frequency jsonb,
  restricted boolean not null default false,
  source_type text not null,
  option_group text,
  is_look_the_part boolean not null default false,
  created_at timestamptz not null default now(),
  constraint custom_class_spell_rules_spell_ref_check check (
    (spell_id is not null and custom_spell_id is null)
    or (spell_id is null and custom_spell_id is not null)
  )
);

create index if not exists idx_custom_class_spell_rules_class_level
  on public.custom_class_spell_rules(custom_class_id, spell_level);

create unique index if not exists idx_custom_class_spell_rules_unique_key
  on public.custom_class_spell_rules(
    custom_class_id,
    coalesce(spell_id, -1),
    coalesce(custom_spell_id, -1),
    spell_level,
    source_type,
    coalesce(option_group, ''),
    is_look_the_part
  );

-- ---------------------------------------------------------------------------
-- custom_builds (isolated from official builds)
-- ---------------------------------------------------------------------------
create table if not exists public.custom_builds (
  id bigint generated always as identity primary key,
  name text not null,
  custom_class_id bigint not null references public.custom_classes(id) on delete restrict,
  level int not null check (level between 1 and 6),
  look_the_part boolean not null default false,
  owner_id uuid not null references auth.users(id) on delete cascade,
  ruleset_version text default 'V8.7',
  notes text,
  play_style text,
  build_priority text,
  synergy text,
  enemies text,
  recommended_gear text,
  sideboard jsonb not null default '[]'::jsonb,
  average_rating numeric(4,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_custom_builds_owner_id on public.custom_builds(owner_id);
create index if not exists idx_custom_builds_custom_class_id on public.custom_builds(custom_class_id);

-- ---------------------------------------------------------------------------
-- custom_build_spell_selections
-- ---------------------------------------------------------------------------
create table if not exists public.custom_build_spell_selections (
  id bigint generated always as identity primary key,
  custom_build_id bigint not null references public.custom_builds(id) on delete cascade,
  spell_id bigint references public.spells(id) on delete restrict,
  custom_spell_id bigint references public.custom_spells(id) on delete restrict,
  spell_level int not null check (spell_level between 1 and 6),
  purchased int not null default 1 check (purchased >= 0),
  experienced int not null default 0 check (experienced between 0 and 2),
  selection_group text,
  chosen boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint custom_build_spell_selections_spell_ref_check check (
    (spell_id is not null and custom_spell_id is null)
    or (spell_id is null and custom_spell_id is not null)
  )
);

create index if not exists idx_custom_build_spell_selections_build_id
  on public.custom_build_spell_selections(custom_build_id);

create unique index if not exists idx_custom_build_spell_selections_unique_key
  on public.custom_build_spell_selections(
    custom_build_id,
    coalesce(spell_id, -1),
    coalesce(custom_spell_id, -1),
    spell_level,
    coalesce(selection_group, '')
  );

drop trigger if exists trg_custom_build_spell_selections_updated_at on public.custom_build_spell_selections;
create trigger trg_custom_build_spell_selections_updated_at
before update on public.custom_build_spell_selections
for each row execute function public.set_updated_at_timestamp();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.custom_class_spell_rules enable row level security;
alter table public.custom_builds enable row level security;
alter table public.custom_build_spell_selections enable row level security;

drop policy if exists "Anyone can read custom_class_spell_rules" on public.custom_class_spell_rules;
create policy "Anyone can read custom_class_spell_rules"
  on public.custom_class_spell_rules for select to anon, authenticated using (true);

drop policy if exists "Owners insert custom_class_spell_rules" on public.custom_class_spell_rules;
create policy "Owners insert custom_class_spell_rules"
  on public.custom_class_spell_rules for insert to authenticated
  with check (
    exists (
      select 1 from public.custom_classes cc
      where cc.id = custom_class_id and cc.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners update custom_class_spell_rules" on public.custom_class_spell_rules;
create policy "Owners update custom_class_spell_rules"
  on public.custom_class_spell_rules for update to authenticated
  using (
    exists (
      select 1 from public.custom_classes cc
      where cc.id = custom_class_id and cc.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners delete custom_class_spell_rules" on public.custom_class_spell_rules;
create policy "Owners delete custom_class_spell_rules"
  on public.custom_class_spell_rules for delete to authenticated
  using (
    exists (
      select 1 from public.custom_classes cc
      where cc.id = custom_class_id and cc.owner_id = auth.uid()
    )
  );

drop policy if exists "Anyone can read custom_builds" on public.custom_builds;
create policy "Anyone can read custom_builds"
  on public.custom_builds for select to anon, authenticated using (true);

drop policy if exists "Owners insert custom_builds" on public.custom_builds;
create policy "Owners insert custom_builds"
  on public.custom_builds for insert to authenticated with check (auth.uid() = owner_id);

drop policy if exists "Owners update custom_builds" on public.custom_builds;
create policy "Owners update custom_builds"
  on public.custom_builds for update to authenticated using (auth.uid() = owner_id);

drop policy if exists "Owners delete custom_builds" on public.custom_builds;
create policy "Owners delete custom_builds"
  on public.custom_builds for delete to authenticated using (auth.uid() = owner_id);

drop policy if exists "Anyone can read custom_build_spell_selections" on public.custom_build_spell_selections;
create policy "Anyone can read custom_build_spell_selections"
  on public.custom_build_spell_selections for select to anon, authenticated using (true);

drop policy if exists "Owners insert custom_build_spell_selections" on public.custom_build_spell_selections;
create policy "Owners insert custom_build_spell_selections"
  on public.custom_build_spell_selections for insert to authenticated
  with check (
    exists (
      select 1 from public.custom_builds cb
      where cb.id = custom_build_id and cb.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners update custom_build_spell_selections" on public.custom_build_spell_selections;
create policy "Owners update custom_build_spell_selections"
  on public.custom_build_spell_selections for update to authenticated
  using (
    exists (
      select 1 from public.custom_builds cb
      where cb.id = custom_build_id and cb.owner_id = auth.uid()
    )
  );

drop policy if exists "Owners delete custom_build_spell_selections" on public.custom_build_spell_selections;
create policy "Owners delete custom_build_spell_selections"
  on public.custom_build_spell_selections for delete to authenticated
  using (
    exists (
      select 1 from public.custom_builds cb
      where cb.id = custom_build_id and cb.owner_id = auth.uid()
    )
  );
