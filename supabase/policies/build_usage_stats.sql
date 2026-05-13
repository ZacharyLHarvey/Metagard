-- Build usage stats: save_count / clone_count + triggers.
-- Idempotent where possible. Run in Supabase SQL editor after spellbook schema.

-- ---------------------------------------------------------------------------
-- Columns on builds
-- ---------------------------------------------------------------------------
alter table public.builds
  add column if not exists save_count integer not null default 0,
  add column if not exists clone_count integer not null default 0;

alter table public.builds
  add column if not exists cloned_from_build_id bigint references public.builds(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'builds_save_count_non_negative'
  ) then
    alter table public.builds
      add constraint builds_save_count_non_negative check (save_count >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'builds_clone_count_non_negative'
  ) then
    alter table public.builds
      add constraint builds_clone_count_non_negative check (clone_count >= 0);
  end if;
end $$;

comment on column public.builds.save_count is 'Denormalized count of saved_builds rows for this build; maintained by trigger.';
comment on column public.builds.clone_count is 'Number of times this build was cloned (insert with cloned_from_build_id pointing here).';
comment on column public.builds.cloned_from_build_id is 'If set, this build was created by cloning the referenced build.';

-- ---------------------------------------------------------------------------
-- Backfill save_count from saved_builds (historical clone counts unavailable)
-- ---------------------------------------------------------------------------
update public.builds b
set save_count = coalesce(s.c, 0)
from (
  select build_id, count(*)::integer as c
  from public.saved_builds
  group by build_id
) s
where b.id = s.build_id;

update public.builds b
set save_count = 0
where not exists (select 1 from public.saved_builds sb where sb.build_id = b.id);

-- ---------------------------------------------------------------------------
-- saved_builds -> save_count (INSERT +1, DELETE down to floor 0)
-- ---------------------------------------------------------------------------
create or replace function public.trg_saved_builds_sync_save_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.builds set save_count = save_count + 1 where id = new.build_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.builds
    set save_count = greatest(0, save_count - 1)
    where id = old.build_id
      and save_count > 0;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_saved_builds_sync_save_count on public.saved_builds;
create trigger trg_saved_builds_sync_save_count
  after insert or delete on public.saved_builds
  for each row execute function public.trg_saved_builds_sync_save_count();

-- ---------------------------------------------------------------------------
-- Clone insert -> increment source clone_count
-- ---------------------------------------------------------------------------
create or replace function public.trg_builds_increment_clone_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.cloned_from_build_id is not null then
    update public.builds
    set clone_count = clone_count + 1
    where id = new.cloned_from_build_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_builds_increment_clone_count_ins on public.builds;
create trigger trg_builds_increment_clone_count_ins
  after insert on public.builds
  for each row execute function public.trg_builds_increment_clone_count();
