-- Custom build support for activity feed (requires patch_activity_feed.sql).
-- Run in Supabase SQL editor after patch_custom_class_builder.sql.

create index if not exists idx_custom_builds_created_at on public.custom_builds(created_at desc);

create or replace function public.get_activity_feed(
  p_filter text default 'all',
  p_cursor timestamptz default null,
  p_limit int default 20
)
returns table (
  entity_type text,
  entity_id bigint,
  name text,
  owner_id uuid,
  created_at timestamptz,
  meta jsonb
)
language sql
stable
security invoker
as $$
  with combined as (
    select
      'build'::text as entity_type,
      b.id as entity_id,
      b.name,
      b.owner_id,
      b.created_at,
      jsonb_build_object(
        'class', b.class,
        'level', b.level,
        'look_the_part', coalesce(b.look_the_part, false)
      ) as meta
    from public.builds b

    union all

    select
      'custom_build'::text,
      cb.id,
      cb.name,
      cb.owner_id,
      cb.created_at,
      jsonb_build_object(
        'class', coalesce(cc.name, 'Custom class'),
        'level', cb.level,
        'look_the_part', coalesce(cb.look_the_part, false)
      )
    from public.custom_builds cb
    join public.custom_classes cc on cc.id = cb.custom_class_id

    union all

    select
      'build_group'::text,
      bg.id,
      bg.name,
      bg.owner_id,
      bg.created_at,
      jsonb_build_object(
        'member_count',
        (select count(*)::int from public.build_group_builds bgb where bgb.build_group_id = bg.id)
      )
    from public.build_groups bg

    union all

    select
      'monster'::text,
      m.id,
      m.name,
      m.owner_id,
      m.created_at,
      jsonb_build_object(
        'monster_type', m.monster_type,
        'threat_level', m.threat_level
      )
    from public.monsters m

    union all

    select
      'custom_spell'::text,
      cs.id,
      cs.name,
      cs.owner_id,
      cs.created_at,
      jsonb_build_object('description', cs.description)
    from public.custom_spells cs

    union all

    select
      'custom_class'::text,
      cc2.id,
      cc2.name,
      cc2.owner_id,
      cc2.created_at,
      jsonb_build_object('description', cc2.description)
    from public.custom_classes cc2

    union all

    select
      'battlegame'::text,
      bg2.id,
      bg2.name,
      bg2.owner_id,
      bg2.created_at,
      jsonb_build_object('game_type', bg2.game_type)
    from public.battle_games bg2
  )
  select
    c.entity_type,
    c.entity_id,
    c.name,
    c.owner_id,
    c.created_at,
    c.meta
  from combined c
  where (p_filter = 'all' or c.entity_type = p_filter)
    and (p_cursor is null or c.created_at < p_cursor)
  order by c.created_at desc, c.entity_type asc, c.entity_id desc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
$$;

grant execute on function public.get_activity_feed(text, timestamptz, int) to anon, authenticated;

comment on function public.get_activity_feed(text, timestamptz, int) is
  'Paginated global activity feed across builds, custom builds, build groups, monsters, custom spells/classes, and battlegames.';
