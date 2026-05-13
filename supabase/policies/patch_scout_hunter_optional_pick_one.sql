-- Idempotent: restores Scout level-6 Hunter (spell_id 80) optional_pick_one parent row if missing.
-- Use when a database was loaded from generated_swiftgard_parity.sql produced before emitMartialArray
-- emitted parent rows for martial entries with nested pickOne (see scripts/generate-swiftgard-parity-sql.mjs).
-- Safe to run after npm run db:swiftgard-sql; if the row already exists, this is a no-op.

insert into public.class_spell_rules (
  class_name,
  spell_id,
  spell_level,
  cost,
  max_count,
  frequency,
  restricted,
  source_type,
  option_group,
  is_look_the_part
)
select
  'Scout',
  80,
  6,
  0,
  null,
  '{"amount":null,"per":null,"charge":null}'::jsonb,
  false,
  'optional_pick_one',
  null,
  false
where not exists (
  select 1
  from public.class_spell_rules r
  where r.class_name = 'Scout'
    and r.spell_id = 80
    and r.spell_level = 6
    and r.source_type = 'optional_pick_one'
    and r.option_group is null
    and r.is_look_the_part = false
);
