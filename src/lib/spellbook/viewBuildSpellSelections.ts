import {
  ARTIFICER_LTP_PINNING_SELECTION_GROUP,
  SNIPER_LTP_MEND_SELECTION_GROUP,
} from "@/lib/spellbook/archetypeGrantedSpells";
import { isMartialClass } from "@/lib/spellbook/martial";
import { buildSelectedSpellNameSet, evaluateSpellRules } from "@/lib/spellbook/rules";
import { findSpellForSelection } from "@/lib/spellbook/selection";
import type { BuildSpellSelectionRow, SpellRow } from "@/lib/spellbook/types";

/** View build page: omit selections that are blocked by an active archetype (edit page still shows them). */
function isSelectionHiddenByArchetypeOnView(
  selection: BuildSpellSelectionRow,
  spells: SpellRow[],
  selectedSpellNames: Set<string>
): boolean {
  if (selection.purchased <= 0) return false;
  const spell = findSpellForSelection(spells, selection);
  if (!spell) return false;
  return evaluateSpellRules(spell, selectedSpellNames).restricted;
}

/**
 * Same merge as BuildSpellDetails: persisted selections visible on view, plus synthetic extras
 * (e.g. archetype grants), using the same archetype restriction filter.
 */
export function mergeViewDisplaySpellSelectionRows(
  selections: BuildSpellSelectionRow[],
  extraSelections: BuildSpellSelectionRow[],
  spells: SpellRow[]
): BuildSpellSelectionRow[] {
  const purchasedBySpellId: Record<number, number> = {};
  for (const s of selections) {
    purchasedBySpellId[s.spell_id] = (purchasedBySpellId[s.spell_id] ?? 0) + s.purchased;
  }
  const selectedSpellNames = buildSelectedSpellNameSet(purchasedBySpellId, spells);
  const visible = selections.filter(
    (s) => !isSelectionHiddenByArchetypeOnView(s, spells, selectedSpellNames)
  );
  return [...visible, ...extraSelections];
}

/**
 * Split merged view rows into Look the Part vs main spell tables (matches BuildSpellDetails).
 * Rows hidden for Archer Sniper/Artificer + LtP (archer:look_the_part options) are omitted from both.
 */
export function partitionViewBuildSpellDisplayRows(
  displaySelections: BuildSpellSelectionRow[],
  spells: SpellRow[],
  opts: { className: string; lookThePart: boolean; selectedSpellNames: Set<string> }
): { lookThePartRows: BuildSpellSelectionRow[]; mainRows: BuildSpellSelectionRow[] } {
  const showLtpSection = isMartialClass(opts.className) && opts.lookThePart;
  const archerSniperLtP =
    opts.className === "Archer" && opts.lookThePart && opts.selectedSpellNames.has("Sniper");
  const archerArtificerLtP =
    opts.className === "Archer" && opts.lookThePart && opts.selectedSpellNames.has("Artificer");
  const lookThePartRows: BuildSpellSelectionRow[] = [];
  const mainRows: BuildSpellSelectionRow[] = [];
  for (const selection of displaySelections) {
    const spell = findSpellForSelection(spells, selection);
    if (
      (archerSniperLtP || archerArtificerLtP) &&
      spell?.option_group === "archer:look_the_part"
    ) {
      continue;
    }
    const isLtpSpell = Boolean(
      spell && (spell.is_look_the_part || spell.source_type === "look_the_part")
    );
    if (
      showLtpSection &&
      (selection.selection_group === SNIPER_LTP_MEND_SELECTION_GROUP ||
        selection.selection_group === ARTIFICER_LTP_PINNING_SELECTION_GROUP)
    ) {
      lookThePartRows.push(selection);
      continue;
    }
    if (showLtpSection && isLtpSpell) {
      lookThePartRows.push(selection);
      continue;
    }
    mainRows.push(selection);
  }
  return { lookThePartRows, mainRows };
}

/** Purchased spell rows visible on view build (main + LtP tables), same pipeline as BuildSpellDetails. */
export function getViewBuildPurchasedSpellRows(
  selections: BuildSpellSelectionRow[],
  extraSelections: BuildSpellSelectionRow[],
  spells: SpellRow[],
  opts: { className: string; lookThePart: boolean }
): BuildSpellSelectionRow[] {
  const purchasedBySpellId: Record<number, number> = {};
  for (const s of selections) {
    purchasedBySpellId[s.spell_id] = (purchasedBySpellId[s.spell_id] ?? 0) + s.purchased;
  }
  const selectedSpellNames = buildSelectedSpellNameSet(purchasedBySpellId, spells);
  const displaySelections = mergeViewDisplaySpellSelectionRows(
    selections,
    extraSelections,
    spells
  );
  const { mainRows, lookThePartRows } = partitionViewBuildSpellDisplayRows(
    displaySelections,
    spells,
    { className: opts.className, lookThePart: opts.lookThePart, selectedSpellNames }
  );
  return [...mainRows, ...lookThePartRows].filter((row) => row.purchased > 0);
}
