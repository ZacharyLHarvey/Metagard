-- Sideboard: caster-only scratch list of spell IDs under consideration (not chosen spells).
-- Idempotent. Meaningful for caster builds; martial builds keep an empty array.

alter table public.builds
  add column if not exists sideboard_spell_ids bigint[] not null default '{}';

comment on column public.builds.sideboard_spell_ids is
  'Ordered spell IDs for caster sideboard (consideration list); does not affect spell points or selections.';
