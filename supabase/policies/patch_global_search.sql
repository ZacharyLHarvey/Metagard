-- Global search: denormalized FTS index + pg_trgm fuzzy matching.
-- Run in Supabase SQL Editor after activity feed / UGC tables exist.

create extension if not exists pg_trgm;

-- Sentinel UUID for non-profile rows (part of primary key).
-- Profiles use entity_id = 0 and entity_uuid = profiles.id.

create table if not exists public.search_documents (
  entity_type text not null,
  entity_id bigint not null default 0,
  entity_uuid uuid not null default '00000000-0000-0000-0000-000000000000'::uuid,
  title text not null,
  body text not null default '',
  search_vector tsvector not null,
  owner_id uuid,
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (entity_type, entity_id, entity_uuid)
);

create index if not exists idx_search_documents_vector
  on public.search_documents using gin (search_vector);

create index if not exists idx_search_documents_title_trgm
  on public.search_documents using gin (title gin_trgm_ops);

create index if not exists idx_search_documents_type_updated
  on public.search_documents (entity_type, updated_at desc);

alter table public.search_documents enable row level security;

drop policy if exists "Anyone can read search documents" on public.search_documents;
create policy "Anyone can read search documents"
  on public.search_documents
  for select
  to anon, authenticated
  using (true);

grant select on public.search_documents to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Index helpers
-- ---------------------------------------------------------------------------

create or replace function public.search_make_vector(p_title text, p_body text)
returns tsvector
language sql
immutable
as $$
  select
    setweight(to_tsvector('english', coalesce(p_title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(p_body, '')), 'B');
$$;

create or replace function public.search_upsert_document(
  p_entity_type text,
  p_entity_id bigint,
  p_entity_uuid uuid,
  p_title text,
  p_body text,
  p_owner_id uuid default null,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(btrim(p_title), '') = '' then
    delete from public.search_documents
    where entity_type = p_entity_type
      and entity_id = p_entity_id
      and entity_uuid = p_entity_uuid;
    return;
  end if;

  insert into public.search_documents (
    entity_type,
    entity_id,
    entity_uuid,
    title,
    body,
    search_vector,
    owner_id,
    meta,
    updated_at
  )
  values (
    p_entity_type,
    p_entity_id,
    p_entity_uuid,
    btrim(p_title),
    coalesce(p_body, ''),
    public.search_make_vector(p_title, p_body),
    p_owner_id,
    coalesce(p_meta, '{}'::jsonb),
    now()
  )
  on conflict (entity_type, entity_id, entity_uuid) do update set
    title = excluded.title,
    body = excluded.body,
    search_vector = excluded.search_vector,
    owner_id = excluded.owner_id,
    meta = excluded.meta,
    updated_at = now();
end;
$$;

create or replace function public.search_delete_document(
  p_entity_type text,
  p_entity_id bigint,
  p_entity_uuid uuid default '00000000-0000-0000-0000-000000000000'::uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.search_documents
  where entity_type = p_entity_type
    and entity_id = p_entity_id
    and entity_uuid = p_entity_uuid;
end;
$$;

-- ---------------------------------------------------------------------------
-- Per-table sync triggers
-- ---------------------------------------------------------------------------

create or replace function public.trg_search_builds_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body text;
  v_meta jsonb;
begin
  if tg_op = 'DELETE' then
    perform public.search_delete_document('build', old.id);
    return old;
  end if;

  v_body := concat_ws(' ',
    new.class,
    new.notes,
    new.play_style,
    new.build_priority,
    new.synergy,
    new.enemies,
    new.recommended_gear
  );
  v_meta := jsonb_build_object(
    'class', new.class,
    'level', new.level,
    'look_the_part', coalesce(new.look_the_part, false)
  );

  perform public.search_upsert_document(
    'build', new.id, '00000000-0000-0000-0000-000000000000'::uuid,
    new.name, v_body, new.owner_id, v_meta
  );
  return new;
end;
$$;

drop trigger if exists trg_search_builds_sync on public.builds;
create trigger trg_search_builds_sync
after insert or update or delete on public.builds
for each row execute function public.trg_search_builds_sync();

create or replace function public.trg_search_build_groups_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.search_delete_document('build_group', old.id);
    return old;
  end if;

  perform public.search_upsert_document(
    'build_group', new.id, '00000000-0000-0000-0000-000000000000'::uuid,
    new.name,
    coalesce(new.description, ''),
    new.owner_id,
    jsonb_build_object(
      'member_count',
      (select count(*)::int from public.build_group_builds bgb where bgb.build_group_id = new.id)
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_search_build_groups_sync on public.build_groups;
create trigger trg_search_build_groups_sync
after insert or update or delete on public.build_groups
for each row execute function public.trg_search_build_groups_sync();

create or replace function public.trg_search_monsters_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body text;
begin
  if tg_op = 'DELETE' then
    perform public.search_delete_document('monster', old.id);
    return old;
  end if;

  v_body := concat_ws(' ',
    new.description,
    new.monster_type,
    new.threat_level,
    new.abilities,
    new.immunities
  );

  perform public.search_upsert_document(
    'monster', new.id, '00000000-0000-0000-0000-000000000000'::uuid,
    new.name, v_body, new.owner_id,
    jsonb_build_object(
      'monster_type', new.monster_type,
      'threat_level', new.threat_level
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_search_monsters_sync on public.monsters;
create trigger trg_search_monsters_sync
after insert or update or delete on public.monsters
for each row execute function public.trg_search_monsters_sync();

create or replace function public.trg_search_custom_spells_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body text;
begin
  if tg_op = 'DELETE' then
    perform public.search_delete_document('custom_spell', old.id);
    return old;
  end if;

  v_body := concat_ws(' ',
    new.description,
    new.spell_type,
    new.school,
    new.range,
    new.incantation,
    new.materials,
    new.effect,
    new.limitations,
    new.notes
  );

  perform public.search_upsert_document(
    'custom_spell', new.id, '00000000-0000-0000-0000-000000000000'::uuid,
    new.name, v_body, new.owner_id,
    jsonb_build_object('description', new.description)
  );
  return new;
end;
$$;

drop trigger if exists trg_search_custom_spells_sync on public.custom_spells;
create trigger trg_search_custom_spells_sync
after insert or update or delete on public.custom_spells
for each row execute function public.trg_search_custom_spells_sync();

create or replace function public.trg_search_custom_classes_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.search_delete_document('custom_class', old.id);
    return old;
  end if;

  perform public.search_upsert_document(
    'custom_class', new.id, '00000000-0000-0000-0000-000000000000'::uuid,
    new.name,
    coalesce(new.description, ''),
    new.owner_id,
    jsonb_build_object('description', new.description)
  );
  return new;
end;
$$;

drop trigger if exists trg_search_custom_classes_sync on public.custom_classes;
create trigger trg_search_custom_classes_sync
after insert or update or delete on public.custom_classes
for each row execute function public.trg_search_custom_classes_sync();

create or replace function public.trg_search_battle_games_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body text;
begin
  if tg_op = 'DELETE' then
    perform public.search_delete_document('battlegame', old.id);
    return old;
  end if;

  v_body := concat_ws(' ',
    new.description,
    new.game_type,
    new.lives,
    new.respawn,
    new.base,
    new.teams,
    new.objectives,
    new.refresh,
    new.scenario_rules
  );

  perform public.search_upsert_document(
    'battlegame', new.id, '00000000-0000-0000-0000-000000000000'::uuid,
    new.name, v_body, new.owner_id,
    jsonb_build_object('game_type', new.game_type)
  );
  return new;
end;
$$;

drop trigger if exists trg_search_battle_games_sync on public.battle_games;
create trigger trg_search_battle_games_sync
after insert or update or delete on public.battle_games
for each row execute function public.trg_search_battle_games_sync();

create or replace function public.trg_search_spells_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body text;
begin
  if tg_op = 'DELETE' then
    perform public.search_delete_document('spell', old.id);
    return old;
  end if;

  v_body := concat_ws(' ',
    new.type,
    new.school,
    new.range,
    new.materials,
    new.incantation,
    new.effect,
    new.limitation,
    new.note
  );

  perform public.search_upsert_document(
    'spell', new.id, '00000000-0000-0000-0000-000000000000'::uuid,
    new.name, v_body, null,
    jsonb_build_object(
      'type', new.type,
      'school', new.school
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_search_spells_sync on public.spells;
create trigger trg_search_spells_sync
after insert or update or delete on public.spells
for each row execute function public.trg_search_spells_sync();

create or replace function public.trg_search_classes_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body text;
begin
  if tg_op = 'DELETE' then
    perform public.search_delete_document('class', old.id);
    return old;
  end if;

  v_body := concat_ws(' ', new.armor, new.shields, new.weapons);

  perform public.search_upsert_document(
    'class', new.id, '00000000-0000-0000-0000-000000000000'::uuid,
    new.name, v_body, null, '{}'::jsonb
  );
  return new;
end;
$$;

drop trigger if exists trg_search_classes_sync on public.classes;
create trigger trg_search_classes_sync
after insert or update or delete on public.classes
for each row execute function public.trg_search_classes_sync();

create or replace function public.trg_search_profiles_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.search_delete_document('profile', 0, old.id);
    return old;
  end if;

  perform public.search_upsert_document(
    'profile', 0, new.id,
    coalesce(new.display_name, ''),
    concat_ws(' ', new.favorite_class, new.favorite_battle_game, new.favorite_spell),
    new.id,
    '{}'::jsonb
  );
  return new;
end;
$$;

drop trigger if exists trg_search_profiles_sync on public.profiles;
create trigger trg_search_profiles_sync
after insert or update or delete on public.profiles
for each row execute function public.trg_search_profiles_sync();

-- ---------------------------------------------------------------------------
-- Initial backfill
-- ---------------------------------------------------------------------------

insert into public.search_documents (
  entity_type, entity_id, entity_uuid, title, body, search_vector, owner_id, meta, updated_at
)
select
  'build',
  b.id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  b.name,
  concat_ws(' ', b.class, b.notes, b.play_style, b.build_priority, b.synergy, b.enemies, b.recommended_gear),
  public.search_make_vector(
    b.name,
    concat_ws(' ', b.class, b.notes, b.play_style, b.build_priority, b.synergy, b.enemies, b.recommended_gear)
  ),
  b.owner_id,
  jsonb_build_object('class', b.class, 'level', b.level, 'look_the_part', coalesce(b.look_the_part, false)),
  now()
from public.builds b
on conflict (entity_type, entity_id, entity_uuid) do nothing;

insert into public.search_documents (
  entity_type, entity_id, entity_uuid, title, body, search_vector, owner_id, meta, updated_at
)
select
  'build_group',
  bg.id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  bg.name,
  coalesce(bg.description, ''),
  public.search_make_vector(bg.name, coalesce(bg.description, '')),
  bg.owner_id,
  jsonb_build_object(
    'member_count',
    (select count(*)::int from public.build_group_builds bgb where bgb.build_group_id = bg.id)
  ),
  now()
from public.build_groups bg
on conflict (entity_type, entity_id, entity_uuid) do nothing;

insert into public.search_documents (
  entity_type, entity_id, entity_uuid, title, body, search_vector, owner_id, meta, updated_at
)
select
  'monster',
  m.id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  m.name,
  concat_ws(' ', m.description, m.monster_type, m.threat_level, m.abilities, m.immunities),
  public.search_make_vector(
    m.name,
    concat_ws(' ', m.description, m.monster_type, m.threat_level, m.abilities, m.immunities)
  ),
  m.owner_id,
  jsonb_build_object('monster_type', m.monster_type, 'threat_level', m.threat_level),
  now()
from public.monsters m
on conflict (entity_type, entity_id, entity_uuid) do nothing;

insert into public.search_documents (
  entity_type, entity_id, entity_uuid, title, body, search_vector, owner_id, meta, updated_at
)
select
  'custom_spell',
  cs.id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  cs.name,
  concat_ws(' ', cs.description, cs.spell_type, cs.school, cs.range, cs.incantation, cs.materials, cs.effect, cs.limitations, cs.notes),
  public.search_make_vector(
    cs.name,
    concat_ws(' ', cs.description, cs.spell_type, cs.school, cs.range, cs.incantation, cs.materials, cs.effect, cs.limitations, cs.notes)
  ),
  cs.owner_id,
  jsonb_build_object('description', cs.description),
  now()
from public.custom_spells cs
on conflict (entity_type, entity_id, entity_uuid) do nothing;

insert into public.search_documents (
  entity_type, entity_id, entity_uuid, title, body, search_vector, owner_id, meta, updated_at
)
select
  'custom_class',
  cc.id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  cc.name,
  coalesce(cc.description, ''),
  public.search_make_vector(cc.name, coalesce(cc.description, '')),
  cc.owner_id,
  jsonb_build_object('description', cc.description),
  now()
from public.custom_classes cc
on conflict (entity_type, entity_id, entity_uuid) do nothing;

insert into public.search_documents (
  entity_type, entity_id, entity_uuid, title, body, search_vector, owner_id, meta, updated_at
)
select
  'battlegame',
  bg.id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  bg.name,
  concat_ws(' ', bg.description, bg.game_type, bg.lives, bg.respawn, bg.base, bg.teams, bg.objectives, bg.refresh, bg.scenario_rules),
  public.search_make_vector(
    bg.name,
    concat_ws(' ', bg.description, bg.game_type, bg.lives, bg.respawn, bg.base, bg.teams, bg.objectives, bg.refresh, bg.scenario_rules)
  ),
  bg.owner_id,
  jsonb_build_object('game_type', bg.game_type),
  now()
from public.battle_games bg
on conflict (entity_type, entity_id, entity_uuid) do nothing;

insert into public.search_documents (
  entity_type, entity_id, entity_uuid, title, body, search_vector, owner_id, meta, updated_at
)
select
  'spell',
  s.id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  s.name,
  concat_ws(' ', s.type, s.school, s.range, s.materials, s.incantation, s.effect, s.limitation, s.note),
  public.search_make_vector(
    s.name,
    concat_ws(' ', s.type, s.school, s.range, s.materials, s.incantation, s.effect, s.limitation, s.note)
  ),
  null,
  jsonb_build_object('type', s.type, 'school', s.school),
  now()
from public.spells s
on conflict (entity_type, entity_id, entity_uuid) do nothing;

insert into public.search_documents (
  entity_type, entity_id, entity_uuid, title, body, search_vector, owner_id, meta, updated_at
)
select
  'class',
  c.id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  c.name,
  concat_ws(' ', c.armor, c.shields, c.weapons),
  public.search_make_vector(c.name, concat_ws(' ', c.armor, c.shields, c.weapons)),
  null,
  '{}'::jsonb,
  now()
from public.classes c
on conflict (entity_type, entity_id, entity_uuid) do nothing;

insert into public.search_documents (
  entity_type, entity_id, entity_uuid, title, body, search_vector, owner_id, meta, updated_at
)
select
  'profile',
  0,
  p.id,
  coalesce(p.display_name, ''),
  concat_ws(' ', p.favorite_class, p.favorite_battle_game, p.favorite_spell),
  public.search_make_vector(
    coalesce(p.display_name, ''),
    concat_ws(' ', p.favorite_class, p.favorite_battle_game, p.favorite_spell)
  ),
  p.id,
  '{}'::jsonb,
  now()
from public.profiles p
where coalesce(btrim(p.display_name), '') <> ''
on conflict (entity_type, entity_id, entity_uuid) do nothing;

-- ---------------------------------------------------------------------------
-- search_global RPC
-- ---------------------------------------------------------------------------

create or replace function public.search_global(
  p_query text,
  p_types text[] default null,
  p_cursor_rank double precision default null,
  p_cursor_type text default null,
  p_cursor_id bigint default null,
  p_cursor_uuid uuid default null,
  p_limit int default 20
)
returns table (
  entity_type text,
  entity_id bigint,
  entity_uuid uuid,
  title text,
  owner_id uuid,
  meta jsonb,
  rank double precision
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_query text;
  v_tsquery tsquery;
  v_limit int;
begin
  v_query := btrim(coalesce(p_query, ''));
  if char_length(v_query) < 2 then
    return;
  end if;

  v_limit := greatest(1, least(coalesce(p_limit, 20), 50));

  begin
    v_tsquery := websearch_to_tsquery('english', v_query);
  exception when others then
    v_tsquery := plainto_tsquery('english', v_query);
  end;

  if v_tsquery is null then
    return;
  end if;

  return query
  with scored as (
    select
      sd.entity_type,
      sd.entity_id,
      sd.entity_uuid,
      sd.title,
      sd.owner_id,
      sd.meta,
      (
        coalesce(ts_rank(sd.search_vector, v_tsquery), 0) * 1.0
        + similarity(sd.title, v_query) * 2.0
        + case when lower(sd.title) = lower(v_query) then 10.0 else 0.0 end
        + case when sd.title ilike v_query || '%' then 5.0 else 0.0 end
        + case
            when sd.entity_type in ('spell', 'build') then 0.5
            when sd.entity_type = 'profile' then 0.0
            else 0.25
          end
      )::double precision as rank
    from public.search_documents sd
    where (
      sd.search_vector @@ v_tsquery
      or similarity(sd.title, v_query) > 0.3
    )
    and (
      p_types is null
      or cardinality(p_types) = 0
      or sd.entity_type = any (p_types)
    )
  )
  select
    s.entity_type,
    s.entity_id,
    s.entity_uuid,
    s.title,
    s.owner_id,
    s.meta,
    s.rank
  from scored s
  where (
    p_cursor_rank is null
    or s.rank < p_cursor_rank
    or (
      s.rank = p_cursor_rank
      and (
        s.entity_type > p_cursor_type
        or (
          s.entity_type = p_cursor_type
          and (
            s.entity_id < p_cursor_id
            or (
              s.entity_id = p_cursor_id
              and s.entity_uuid < coalesce(p_cursor_uuid, '00000000-0000-0000-0000-000000000000'::uuid)
            )
          )
        )
      )
    )
  )
  order by s.rank desc, s.entity_type asc, s.entity_id desc, s.entity_uuid desc
  limit v_limit;
end;
$$;

grant execute on function public.search_global(text, text[], double precision, text, bigint, uuid, int) to anon, authenticated;

comment on function public.search_global(text, text[], double precision, text, bigint, uuid, int) is
  'Paginated global search across builds, UGC, catalog spells/classes, and profiles.';
