import type { SpellRow } from "@/lib/spellbook/types";
import { buildSelectedSpellNameSet, evaluateSpellRules } from "@/lib/spellbook/rules";
import { findSpellForSelection } from "@/lib/spellbook/selection";

export const POINTS_PER_SPELL_LEVEL = 5;

export const CASTER_CLASSES = ["Bard", "Druid", "Healer", "Wizard"] as const;

export function isCasterClass(className: string): boolean {
  return (CASTER_CLASSES as readonly string[]).includes(className);
}

/** Selection fields needed for cost / spell lookup (matches BuildSpellEditor Selection). */
export type BudgetSelection = {
  spell_id: number;
  spell_level: number;
  purchased: number;
  selection_group: string | null;
};

function purchasedBySpellId(map: Record<string, BudgetSelection>) {
  const m: Record<number, number> = {};
  for (const sel of Object.values(map)) {
    m[sel.spell_id] = (m[sel.spell_id] ?? 0) + sel.purchased;
  }
  return m;
}

/** Sum of (adjusted cost × purchased) for spells on this circle or any higher circle. */
export function pointsSpentAtOrAboveCircle(
  map: Record<string, BudgetSelection>,
  spells: SpellRow[],
  fromCircle: number
): number {
  const names = buildSelectedSpellNameSet(purchasedBySpellId(map), spells);
  let sum = 0;
  for (const sel of Object.values(map)) {
    if (sel.spell_level < fromCircle) continue;
    const spell = findSpellForSelection(spells, sel);
    if (!spell) continue;
    const ev = evaluateSpellRules(spell, names);
    sum += ev.adjustedCost * sel.purchased;
  }
  return sum;
}

/**
 * Caster rule: points from circle k..max can pay for spells on circles k..max.
 * Equivalent check: for every cutoff k, spending on circles ≥ k is at most 5 × (# of circles from k to max).
 *
 * **Look the Part (casters only):** +1 point at the build’s max circle — add `lookThePartBonus` (0 or 1) to every cutoff cap so total budget becomes `5 * maxLevel + 1`.
 */
export function casterCascadeBudgetHolds(
  map: Record<string, BudgetSelection>,
  spells: SpellRow[],
  maxLevel: number,
  lookThePartBonus = 0
): boolean {
  for (let k = 1; k <= maxLevel; k += 1) {
    const sum = pointsSpentAtOrAboveCircle(map, spells, k);
    const cap = POINTS_PER_SPELL_LEVEL * (maxLevel - k + 1) + lookThePartBonus;
    if (sum > cap) return false;
  }
  return true;
}

/** Slack in the combined pool for circles `level` through `maxLevel` (what casters can still spend on those rows). */
export function remainingPointsForCircleAndAbove(
  map: Record<string, BudgetSelection>,
  spells: SpellRow[],
  maxLevel: number,
  level: number,
  lookThePartBonus = 0
): number {
  const cap = POINTS_PER_SPELL_LEVEL * (maxLevel - level + 1) + lookThePartBonus;
  const spent = pointsSpentAtOrAboveCircle(map, spells, level);
  return Math.max(cap - spent, 0);
}
