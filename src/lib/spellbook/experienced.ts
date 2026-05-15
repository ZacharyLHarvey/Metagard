import { formatSpellFrequency } from "@/lib/spellbook/formatFrequency";
import type { BuildSpellSelectionRow, SpellRow } from "@/lib/spellbook/types";
import { findSpellForSelection, selectionKeyFromRow } from "@/lib/spellbook/selection";

/** Metadata on the Experienced spell row: one target selection key per purchased count. */
export const EXPERIENCED_TARGET_KEYS = "experiencedTargetKeys" as const;

export type ExperiencedChargeSuffix = "Charge x5" | "Charge x10";

export function isExperiencedCatalogSpell(spell: SpellRow | null | undefined): boolean {
  return spell?.name === "Experienced";
}

export function readExperiencedTargetKeys(metadata: Record<string, unknown> | undefined): string[] {
  if (!metadata) return [];
  const v = metadata[EXPERIENCED_TARGET_KEYS];
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

/** Classify catalog frequency for Experienced eligibility (per-Life vs per-Refresh only). */
export function classifyExperiencedBaseFrequency(spell: SpellRow): "life" | "refresh" | null {
  const raw = formatSpellFrequency(spell.frequency) ?? spell.frequency;
  if (raw == null || typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  if (/^unlimited\b/i.test(lower) && !/\/\s*life/i.test(s) && !/\/\s*refresh/i.test(s)) {
    return null;
  }
  if (/\/\s*refresh/i.test(s) || /\bper[\s-]*refresh\b/i.test(lower)) return "refresh";
  if (/\/\s*life/i.test(s) || /\bper[\s-]*life\b/i.test(lower)) return "life";
  if (/\d+\s*\/\s*life/i.test(s)) return "life";
  return null;
}

export function isValidExperiencedTargetSpell(spell: SpellRow | null | undefined): boolean {
  if (!spell) return false;
  if (spell.type !== "Verbal") return false;
  if ((spell.level ?? 0) > 4) return false;
  if (isExperiencedCatalogSpell(spell)) return false;
  return classifyExperiencedBaseFrequency(spell) != null;
}

export function chargeSuffixForExperiencedKind(kind: "life" | "refresh"): ExperiencedChargeSuffix {
  return kind === "refresh" ? "Charge x10" : "Charge x5";
}

/** All target keys currently assigned by any Experienced row on the build. */
export function collectAllExperiencedTargetKeys(
  selections: BuildSpellSelectionRow[],
  spells: SpellRow[]
): Set<string> {
  const used = new Set<string>();
  for (const row of selections) {
    const spell = findSpellForSelection(spells, row);
    if (!isExperiencedCatalogSpell(spell) || row.purchased <= 0) continue;
    for (const k of readExperiencedTargetKeys(row.metadata)) {
      used.add(k);
    }
  }
  return used;
}

function findPurchasedRowBySelectionKey(
  selections: BuildSpellSelectionRow[],
  targetKey: string
): BuildSpellSelectionRow | undefined {
  return selections.find((r) => selectionKeyFromRow(r) === targetKey && r.purchased > 0);
}

export function buildExperiencedChargeSuffixByTargetKey(
  selections: BuildSpellSelectionRow[],
  spells: SpellRow[]
): Map<string, ExperiencedChargeSuffix> {
  const out = new Map<string, ExperiencedChargeSuffix>();
  const used = collectAllExperiencedTargetKeys(selections, spells);
  for (const key of used) {
    const row = findPurchasedRowBySelectionKey(selections, key);
    if (!row) continue;
    const targetSpell = findSpellForSelection(spells, row);
    if (!targetSpell) continue;
    const kind = classifyExperiencedBaseFrequency(targetSpell);
    if (!kind) continue;
    out.set(key, chargeSuffixForExperiencedKind(kind));
  }
  return out;
}

export function validateExperiencedState(
  selections: BuildSpellSelectionRow[],
  spells: SpellRow[]
): { ok: true } | { ok: false; message: string } {
  const globalUsed = new Set<string>();

  for (const row of selections) {
    const spell = findSpellForSelection(spells, row);
    if (!isExperiencedCatalogSpell(spell)) continue;

    const keys = readExperiencedTargetKeys(row.metadata);

    if (row.purchased <= 0) {
      if (keys.length > 0) {
        return {
          ok: false,
          message:
            "Experienced has target spell entries but purchased count is zero. Remove targets or purchase Experienced again.",
        };
      }
      continue;
    }

    if (keys.length !== row.purchased) {
      return {
        ok: false,
        message: `Experienced: need exactly one target verbal per purchase (${row.purchased} purchase(s), ${keys.length} target(s) saved).`,
      };
    }

    const seenLocal = new Set<string>();
    for (const targetKey of keys) {
      if (seenLocal.has(targetKey)) {
        return { ok: false, message: "Experienced: duplicate target spell in the same Experienced row." };
      }
      seenLocal.add(targetKey);
      if (globalUsed.has(targetKey)) {
        return {
          ok: false,
          message: "Experienced: the same verbal cannot be targeted by more than one Experienced purchase.",
        };
      }
      globalUsed.add(targetKey);

      const targetRow = findPurchasedRowBySelectionKey(selections, targetKey);
      if (!targetRow) {
        return {
          ok: false,
          message: "Experienced: a saved target spell is missing from this build or has zero purchases.",
        };
      }

      const targetSpell = findSpellForSelection(spells, targetRow);
      if (!isValidExperiencedTargetSpell(targetSpell)) {
        return {
          ok: false,
          message:
            "Experienced: a target spell is invalid (must be Verbal, circle 4 or below, per-Life or per-Refresh).",
        };
      }
    }
  }

  return { ok: true };
}

export type ExperiencedPickerOption = { targetKey: string; spell: SpellRow };

/**
 * Verbals on the build (purchased &gt; 0) that may be chosen for the next Experienced purchase.
 */
export function listExperiencedPickerOptions(
  selections: BuildSpellSelectionRow[],
  spells: SpellRow[],
  excludeTargetKeys: Set<string>
): ExperiencedPickerOption[] {
  const out: ExperiencedPickerOption[] = [];
  for (const row of selections) {
    if (row.purchased <= 0) continue;
    const spell = findSpellForSelection(spells, row);
    if (!spell || !isValidExperiencedTargetSpell(spell)) continue;
    const key = selectionKeyFromRow(row);
    if (excludeTargetKeys.has(key)) continue;
    if (!spell) continue;
    out.push({ targetKey: key, spell });
  }
  out.sort((a, b) => a.spell.name.localeCompare(b.spell.name));
  return out;
}
