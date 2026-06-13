export type CustomClassType = "martial" | "caster";

export type SpellRefKind = "canonical" | "custom";

export type CustomClassRow = {
  id: number;
  owner_id: string;
  name: string;
  description: string | null;
  class_type: CustomClassType;
  armor: string | null;
  shields: string | null;
  weapons: string | null;
  average_rating?: number | null;
  created_at?: string;
};

export type CustomClassSpellRuleRow = {
  id?: number;
  custom_class_id?: number;
  spell_kind: SpellRefKind;
  spell_id: number;
  spell_name?: string;
  spell_level: number;
  cost: number;
  max_count: number | null;
  frequency: SpellFrequencyInput | null;
  restricted: boolean;
  source_type: string;
  option_group: string | null;
  is_look_the_part: boolean;
};

export type SpellFrequencyInput = {
  amount: number | null;
  per: string | null;
  charge: string | null;
};

/** Draft rule in the wizard before save. */
export type WizardRuleDraft = CustomClassSpellRuleRow & {
  clientKey: string;
};

export type CustomClassWizardPayload = {
  name: string;
  description: string | null;
  class_type: CustomClassType;
  armor: string | null;
  shields: string | null;
  weapons: string | null;
  rules: CustomClassSpellRuleRow[];
};

export type CustomBuildRow = {
  id: number;
  name: string;
  custom_class_id: number;
  level: number;
  look_the_part: boolean;
  owner_id: string | null;
  ruleset_version: string | null;
  notes: string | null;
  play_style?: string | null;
  build_priority?: string | null;
  synergy?: string | null;
  enemies?: string | null;
  recommended_gear?: string | null;
  sideboard?: Array<{ kind: SpellRefKind; id: number }>;
  average_rating?: number | null;
  save_count?: number;
  clone_count?: number;
  created_at?: string;
  custom_class?: CustomClassRow | null;
};

export type CustomBuildSpellSelectionRow = {
  id: number;
  custom_build_id: number;
  spell_id: number | null;
  custom_spell_id: number | null;
  spell_level: number;
  purchased: number;
  experienced: number;
  selection_group: string | null;
  chosen: boolean;
  metadata: Record<string, unknown>;
};

export type CustomBuildSpellSelectionInput = Omit<CustomBuildSpellSelectionRow, "id" | "metadata"> & {
  metadata?: Record<string, unknown>;
};

export const MARTIAL_SOURCE_TYPES = [
  "base",
  "look_the_part",
  "pick_one",
  "pick_two_of_three",
  "optional_pick_one",
] as const;

export const PICK_SOURCE_TYPES = ["pick_one", "pick_two_of_three", "optional_pick_one"] as const;

export function isLookThePartRule(rule: {
  source_type: string;
  is_look_the_part: boolean;
}): boolean {
  return rule.source_type === "look_the_part" || rule.is_look_the_part;
}
