import type { BuildSpellSelectionInput, SpellRow } from "@/lib/spellbook/types";
import { isCasterClass } from "@/lib/spellbook/casterBudget";
import { catalogRuleKey } from "@/lib/spellbook/selection";

const MARTIAL_CLASSES = new Set([
  "Anti-Paladin",
  "Archer",
  "Assassin",
  "Barbarian",
  "Monk",
  "Paladin",
  "Scout",
  "Warrior",
]);

export function isMartialClass(className: string): boolean {
  if (MARTIAL_CLASSES.has(className)) return true;
  return !isCasterClass(className);
}

const PICK_ONE_MARKERS = ["Optional, Pick one in edit mode", "Optional, Pick one:"];

function hasPickOneMarker(spell: SpellRow) {
  const haystack = [spell.note, spell.effect, spell.limitation].filter(Boolean).join(" ");
  return PICK_ONE_MARKERS.some((marker) => haystack.includes(marker));
}

export function isPickOneSpell(spell: SpellRow): boolean {
  return (
    spell.source_type === "pick_one" ||
    spell.source_type === "optional_pick_one" ||
    spell.source_type === "optional_pick_one_nested_pickOne" ||
    hasPickOneMarker(spell)
  );
}

export function isPickTwoOfThreeSpell(spell: SpellRow): boolean {
  return spell.source_type === "pick_two_of_three";
}

/** Pick-one group key for Archer Look the Part specialty arrows (Sniper replaces this with Mend grant). */
export const ARCHER_LTP_SPECIALTY_PICK_ONE_GROUP_KEY = "opt:archer:look_the_part" as const;

export function pickOneGroupKey(spell: SpellRow): string | null {
  if (!isPickOneSpell(spell)) return null;
  if (spell.option_group) return `opt:${spell.option_group}`;
  return `lvl:${spell.level ?? 1}:${spell.source_type ?? "pick_one"}`;
}

function parentRuleIdFromOptionGroup(group: string | null | undefined): number | null {
  if (!group) return null;
  const [left] = group.split(":");
  const id = Number(left);
  return Number.isFinite(id) ? id : null;
}

function includeMartialSpell(spell: SpellRow, lookThePart: boolean) {
  if (spell.source_type === "archetype_grant") return false;
  if (spell.source_type === "pick_two_of_three") return false;
  if (isPickOneSpell(spell)) return false;
  if (spell.is_look_the_part) return lookThePart;
  if (spell.source_type === "look_the_part") return lookThePart;
  if (spell.source_type == null) return true;
  return spell.source_type === "base";
}

export type PickOneGroup = {
  groupKey: string;
  level: number;
  options: SpellRow[];
  optionalMartialArchetype: boolean;
  requiredForMartial: boolean;
  /** How many options must be chosen (default 1 for pick-one; 2 for pick-two-of-three). */
  requiredPicks?: number;
};

export function pickTwoOfThreeGroupKey(spell: SpellRow): string | null {
  if (!isPickTwoOfThreeSpell(spell)) return null;
  return `lvl:${spell.level ?? 1}:pick_two_of_three`;
}

/** True when every option in the group is a Look the Part catalog row (e.g. Archer LtP pick-one). */
export function isLookThePartPickOneGroup(group: PickOneGroup): boolean {
  if (group.options.length === 0) return false;
  return group.options.every((s) => Boolean(s.is_look_the_part || s.source_type === "look_the_part"));
}

export function getPickOneGroups(
  spells: SpellRow[],
  className: string,
  selectedRuleIds: Set<number>
): PickOneGroup[] {
  const martial = isMartialClass(className);
  const grouped = new Map<string, SpellRow[]>();
  for (const spell of spells) {
    const key = pickOneGroupKey(spell);
    if (!key) continue;
    if (
      spell.source_type === "optional_pick_one_nested_pickOne" &&
      !selectedRuleIds.has(parentRuleIdFromOptionGroup(spell.option_group) ?? -1)
    ) {
      continue;
    }
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(spell);
  }

  return [...grouped.entries()].map(([groupKey, options]) => {
    const sorted = [...options].sort((a, b) => a.name.localeCompare(b.name));
    const level = sorted[0]?.level ?? 1;
    const optionalMartialArchetype = martial && sorted.every((s) => s.type === "Archetype");
    return {
      groupKey,
      level,
      options: sorted,
      optionalMartialArchetype,
      requiredForMartial: martial && !optionalMartialArchetype,
    };
  });
}

export function getPickTwoOfThreeGroups(
  spells: SpellRow[],
  className: string,
  selectedRuleIds: Set<number>
): PickOneGroup[] {
  const martial = isMartialClass(className);
  const grouped = new Map<string, SpellRow[]>();
  for (const spell of spells) {
    const key = pickTwoOfThreeGroupKey(spell);
    if (!key) continue;
    if (
      spell.source_type === "optional_pick_one_nested_pickOne" &&
      !selectedRuleIds.has(parentRuleIdFromOptionGroup(spell.option_group) ?? -1)
    ) {
      continue;
    }
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(spell);
  }

  return [...grouped.entries()].map(([groupKey, options]) => {
    const sorted = [...options].sort((a, b) => a.name.localeCompare(b.name));
    const level = sorted[0]?.level ?? 1;
    const optionalMartialArchetype = martial && sorted.every((s) => s.type === "Archetype");
    return {
      groupKey,
      level,
      options: sorted,
      optionalMartialArchetype,
      requiredForMartial: martial && !optionalMartialArchetype,
      requiredPicks: 2,
    };
  });
}

export function buildMartialAutoSelections(
  spells: SpellRow[],
  lookThePart: boolean,
  className: string,
  priorSelections: BuildSpellSelectionInput[] = []
): BuildSpellSelectionInput[] {
  const selectedRuleIds = new Set<number>();
  for (const sel of priorSelections) {
    if (sel.selection_group?.startsWith("csr:")) {
      const id = Number(sel.selection_group.slice(4));
      if (Number.isFinite(id) && sel.purchased > 0) selectedRuleIds.add(id);
    }
  }

  const base = spells
    .filter((spell) => includeMartialSpell(spell, lookThePart))
    .map((spell) => ({
      build_id: 0,
      spell_id: spell.id,
      spell_level: spell.level ?? 1,
      purchased: 1,
      experienced: 0,
      selection_group: spell.catalog_rule_id != null ? catalogRuleKey(spell.catalog_rule_id) : null,
      chosen: true,
    }));
  for (const spell of spells) {
    const rid = spell.catalog_rule_id;
    if (rid != null && base.some((s) => s.selection_group === catalogRuleKey(rid))) {
      selectedRuleIds.add(rid);
    }
  }

  const groups = getPickOneGroups(spells, className, selectedRuleIds);
  const pickOneSelections: BuildSpellSelectionInput[] = [];
  for (const group of groups) {
    const options = group.options;
    const existing = options.find((opt) =>
      priorSelections.some((sel) => sel.selection_group === (opt.catalog_rule_id != null ? catalogRuleKey(opt.catalog_rule_id) : null) && sel.purchased > 0)
    );
    const chosen = existing ?? null;
    if (!chosen) continue;
    pickOneSelections.push({
      build_id: 0,
      spell_id: chosen.id,
      spell_level: chosen.level ?? 1,
      purchased: 1,
      experienced: 0,
      selection_group: chosen.catalog_rule_id != null ? catalogRuleKey(chosen.catalog_rule_id) : null,
      chosen: true,
    });
  }

  const pickTwoGroups = getPickTwoOfThreeGroups(spells, className, selectedRuleIds);
  const pickTwoSelections: BuildSpellSelectionInput[] = [];
  for (const group of pickTwoGroups) {
    const chosenOpts = group.options.filter((opt) => {
      const rid = opt.catalog_rule_id;
      if (rid == null) return false;
      return priorSelections.some((sel) => sel.selection_group === catalogRuleKey(rid) && sel.purchased > 0);
    });
    for (const opt of chosenOpts.slice(0, 2)) {
      if (opt.catalog_rule_id == null) continue;
      pickTwoSelections.push({
        build_id: 0,
        spell_id: opt.id,
        spell_level: opt.level ?? 1,
        purchased: 1,
        experienced: 0,
        selection_group: catalogRuleKey(opt.catalog_rule_id),
        chosen: true,
      });
    }
  }

  return [...base, ...pickOneSelections, ...pickTwoSelections];
}
