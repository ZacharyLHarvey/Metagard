-- Custom build support for global search (requires patch_global_search.sql).
-- Run in Supabase SQL editor after patch_custom_class_builder.sql.

create or replace function public.trg_search_custom_builds_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body text;
  v_meta jsonb;
  v_class_name text;
begin
  if tg_op = 'DELETE' then
    perform public.search_delete_document('custom_build', old.id);
    return old;
  end if;

  select cc.name into v_class_name
  from public.custom_classes cc
  where cc.id = new.custom_class_id;

  v_body := concat_ws(' ',
    v_class_name,
    new.notes,
    new.play_style,
    new.build_priority,
    new.synergy,
    new.enemies,
    new.recommended_gear
  );
  v_meta := jsonb_build_object(
    'class', coalesce(v_class_name, 'Custom class'),
    'level', new.level,
    'look_the_part', coalesce(new.look_the_part, false)
  );

  perform public.search_upsert_document(
    'custom_build', new.id, '00000000-0000-0000-0000-000000000000'::uuid,
    new.name, v_body, new.owner_id, v_meta
  );
  return new;
end;
$$;

drop trigger if exists trg_search_custom_builds_sync on public.custom_builds;
create trigger trg_search_custom_builds_sync
after insert or update or delete on public.custom_builds
for each row execute function public.trg_search_custom_builds_sync();

insert into public.search_documents (
  entity_type, entity_id, entity_uuid, title, body, search_vector, owner_id, meta, updated_at
)
select
  'custom_build',
  cb.id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  cb.name,
  concat_ws(' ', cc.name, cb.notes, cb.play_style, cb.build_priority, cb.synergy, cb.enemies, cb.recommended_gear),
  public.search_make_vector(
    cb.name,
    concat_ws(' ', cc.name, cb.notes, cb.play_style, cb.build_priority, cb.synergy, cb.enemies, cb.recommended_gear)
  ),
  cb.owner_id,
  jsonb_build_object(
    'class', coalesce(cc.name, 'Custom class'),
    'level', cb.level,
    'look_the_part', coalesce(cb.look_the_part, false)
  ),
  now()
from public.custom_builds cb
join public.custom_classes cc on cc.id = cb.custom_class_id
on conflict (entity_type, entity_id, entity_uuid) do update set
  title = excluded.title,
  body = excluded.body,
  search_vector = excluded.search_vector,
  owner_id = excluded.owner_id,
  meta = excluded.meta,
  updated_at = excluded.updated_at;

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
  v_limit := greatest(1, least(coalesce(p_limit, 20), 50));

  if char_length(v_query) = 0 then
    return query
    with browse as (
      select
        sd.entity_type,
        sd.entity_id,
        sd.entity_uuid,
        sd.title,
        sd.owner_id,
        sd.meta,
        extract(epoch from sd.updated_at)::double precision as rank
      from public.search_documents sd
      where (
        p_types is null
        or cardinality(p_types) = 0
        or sd.entity_type = any (p_types)
      )
    )
    select
      b.entity_type,
      b.entity_id,
      b.entity_uuid,
      b.title,
      b.owner_id,
      b.meta,
      b.rank
    from browse b
    where (
      p_cursor_rank is null
      or b.rank < p_cursor_rank
      or (
        b.rank = p_cursor_rank
        and (
          b.entity_type > p_cursor_type
          or (
            b.entity_type = p_cursor_type
            and (
              b.entity_id < p_cursor_id
              or (
                b.entity_id = p_cursor_id
                and b.entity_uuid < coalesce(p_cursor_uuid, '00000000-0000-0000-0000-000000000000'::uuid)
              )
            )
          )
        )
      )
    )
    order by b.rank desc, b.entity_type asc, b.entity_id desc, b.entity_uuid desc
    limit v_limit;
  end if;

  if char_length(v_query) < 2 then
    return;
  end if;

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
            when sd.entity_type in ('spell', 'build', 'custom_build') then 0.5
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
  'Paginated global search across builds, custom builds, UGC, catalog spells/classes, and profiles.';
