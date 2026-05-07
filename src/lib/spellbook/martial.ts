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

function includeMartialSpell(spell: SpellRow, lookThePart: boolean) {
  if (spell.is_look_the_part) return lookThePart;
  if (spell.source_type === "look_the_part") return lookThePart;
  if (spell.source_type == null) return true;
  return spell.source_type === "base";
}

export function buildMartialAutoSelections(
  spells: SpellRow[],
  lookThePart: boolean
): BuildSpellSelectionInput[] {
  return spells
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
}
