-- Archer Look the Part: single pick-one among Destruction / Pinning / Poison Arrow (level 1).
-- Idempotent for DBs that still use look_the_part for these rows.

update public.class_spell_rules
set
  source_type = 'pick_one',
  option_group = 'archer:look_the_part'
where class_name = 'Archer'
  and spell_level = 1
  and is_look_the_part = true
  and spell_id in (37, 109, 112);
