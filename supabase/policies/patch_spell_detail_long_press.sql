-- Per-profile preference for long-press to open spell detail modal on builds/sideboard.

alter table public.profiles
  add column if not exists spell_detail_long_press_enabled boolean not null default true;

comment on column public.profiles.spell_detail_long_press_enabled is
  'When true, long-press (and sideboard click-when-tips-off) can open spell details for this user.';
