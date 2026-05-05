export type BuildRow = {
  id: number;
  name: string;
  class: string;
  level: number;
  average_rating: number | null;
  look_the_part: boolean;
  owner_id: string | null;
  ruleset_version: string | null;
  notes: string | null;
  created_at: string;
};

export type ClassRow = {
  id: number;
  name: string;
};

export type SpellRow = {
  id: number;
  name: string;
  level: number | null;
  school: string | null;
  type: string | null;
  range: string | null;
  materials: string | null;
  incantation: string | null;
  effect: string | null;
  limitation: string | null;
  note: string | null;
  cost: number | null;
  max: number | null;
  frequency: string | null;
};

export type BuildSpellSelectionRow = {
  id: number;
  build_id: number;
  spell_id: number;
  spell_level: number;
  purchased: number;
  experienced: number;
  selection_group: string | null;
  chosen: boolean;
  metadata: Record<string, unknown>;
};

export type BuildSpellSelectionInput = Omit<BuildSpellSelectionRow, "id" | "metadata"> & {
  metadata?: Record<string, unknown>;
};
