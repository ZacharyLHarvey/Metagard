-- Optional equipment and time limit fields for battle games.

alter table public.battle_games
  add column if not exists equipment_needed text,
  add column if not exists time_limit text;
