-- Optional seed data for DB-backed patch notes.

insert into public.patch_notes (version, title, details)
values
  (
    'V8.7',
    'DB-backed spellbook launch',
    array[
      'Moved spellbook persistence to Supabase tables.',
      'Added build spell selections and saved builds.',
      'Enabled build details/edit pages powered by database rows.'
    ]
  ),
  (
    'V8.6.4',
    'Legacy compatibility checkpoint',
    array[
      'Supports older builds while migrating into the V8.7 ruleset.',
      'Read-only compatibility path remains available for old versions.'
    ]
  )
on conflict do nothing;
