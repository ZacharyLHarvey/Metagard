export const BATTLEGAME_TYPES = [
  "All",
  "Full-Class",
  "Militia",
  "Ditch",
  "Tournament",
  "Other",
  "Quest",
] as const;

export type BattlegameType = (typeof BATTLEGAME_TYPES)[number];

export const BATTLEGAME_TYPES_WITHOUT_ALL = BATTLEGAME_TYPES.filter((value) => value !== "All");

export type BattlegameRow = {
  id: number;
  owner_id: string;
  name: string;
  description: string | null;
  game_type: string | null;
  lives: string | null;
  respawn: string | null;
  base: string | null;
  teams: string | null;
  objectives: string | null;
  refresh: string | null;
  scenario_rules: string | null;
  image_url: string | null;
  min_players: number | null;
  max_players: number | null;
  min_teams: number | null;
  max_teams: number | null;
};
