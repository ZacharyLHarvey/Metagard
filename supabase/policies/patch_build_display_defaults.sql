-- Per-profile default spell display for view/edit build pages.
-- Column defaults preserve current app behavior for existing users.

alter table public.profiles
  add column if not exists build_view_defaults jsonb not null default '{
    "display": "level",
    "showTypeSchool": false,
    "showIncantation": false,
    "showMaterials": false,
    "showRange": false
  }'::jsonb;

alter table public.profiles
  add column if not exists build_edit_defaults jsonb not null default '{
    "showTypeSchool": false,
    "showIncantation": false,
    "showMaterials": false,
    "showRange": false
  }'::jsonb;

comment on column public.profiles.build_view_defaults is
  'Default view-build spell display: display mode (level|type|school) and Show X checkbox defaults.';

comment on column public.profiles.build_edit_defaults is
  'Default edit-build Show X checkbox defaults.';
