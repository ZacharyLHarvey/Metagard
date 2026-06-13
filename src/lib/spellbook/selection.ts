import type { BuildSpellSelectionRow, SpellRow } from "@/lib/spellbook/types";

/** Prefix for selection_group / UI keys tied to public.class_spell_rules.id */
export const CATALOG_RULE_PREFIX = "csr:";

export function catalogRuleKey(ruleId: number): string {
  return `${CATALOG_RULE_PREFIX}${ruleId}`;
}

export function parseCatalogRuleId(selection_group: string | null | undefined): number | null {
  if (!selection_group?.startsWith(CATALOG_RULE_PREFIX)) return null;
  const n = Number(selection_group.slice(CATALOG_RULE_PREFIX.length));
  return Number.isFinite(n) ? n : null;
}

/** Stable key for a saved row or in-progress selection. */
export function selectionKeyFromRow(row: Pick<BuildSpellSelectionRow, "spell_id" | "spell_level" | "selection_group">): string {
  const rid = parseCatalogRuleId(row.selection_group);
  if (rid !== null) return catalogRuleKey(rid);
  return `${row.spell_level}:${row.spell_id}`;
}

export function selectionKeyForCatalogSpell(spell: SpellRow): string {
  if (spell.catalog_rule_id != null) return catalogRuleKey(spell.catalog_rule_id);
  const lvl = spell.level ?? 1;
  return `${lvl}:${spell.id}`;
}

export type SpellSelectionLookup = Pick<
  BuildSpellSelectionRow,
  "spell_id" | "spell_level" | "selection_group"
>;

export function findSpellForSelection(spells: SpellRow[], row: SpellSelectionLookup): SpellRow | undefined {
  const rid = parseCatalogRuleId(row.selection_group);
  if (rid !== null) {
    return spells.find((s) => s.catalog_rule_id === rid);
  }
  const extended = row as SpellSelectionLookup & { custom_spell_id?: number | null };
  if (extended.custom_spell_id != null) {
    const byCustom = spells.find(
      (s) => s.spell_kind === "custom" && (s.custom_spell_id ?? s.id) === extended.custom_spell_id
    );
    if (byCustom) return byCustom;
  }
  const matches = spells.filter(
    (s) => s.id === row.spell_id && (s.level ?? 1) === row.spell_level
  );
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) return undefined;
  const withoutRule = matches.find((s) => s.catalog_rule_id == null);
  return withoutRule ?? matches[0];
}

export function spellRefFieldsFromRow(
  spell: SpellRow
): Pick<BuildSpellSelectionRow, "spell_id"> & {
  custom_spell_id?: number | null;
  spell_kind?: "canonical" | "custom";
} {
  if (spell.spell_kind === "custom") {
    const id = spell.custom_spell_id ?? spell.id;
    return { spell_id: id, custom_spell_id: id, spell_kind: "custom" };
  }
  return { spell_id: spell.id, custom_spell_id: null, spell_kind: "canonical" };
}
