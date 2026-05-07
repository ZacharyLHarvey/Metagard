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
