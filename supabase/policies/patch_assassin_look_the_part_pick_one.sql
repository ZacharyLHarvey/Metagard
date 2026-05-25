-- Assassin Look the Part: single pick-one between Poison and Poison Arrow (level 1).
-- Idempotent for DBs that still use look_the_part for these rows.

update public.class_spell_rules
set
  source_type = 'pick_one',
  option_group = 'assassin:look_the_part'
where class_name = 'Assassin'
  and spell_level = 1
  and is_look_the_part = true
  and spell_id in (111, 201);
