import { findSpellForSelection } from "@/lib/spellbook/selection";
import type { BuildSpellSelectionRow, SpellRow } from "@/lib/spellbook/types";

/** Synthetic selection_group for Sniper + Look the Part Mend grant (shown in LtP section, not persisted). */
export const SNIPER_LTP_MEND_SELECTION_GROUP = "archetype-grant:Sniper:ltp-mend" as const;

function catalogHasSpellAtLevel(catalogSpells: SpellRow[], spellId: number, spellLevel: number): boolean {
  return catalogSpells.some((s) => s.id === spellId && (s.level ?? 1) === spellLevel);
}

export type ArchetypeGrantedSpellDescriptor = {
  spellId: number;
  spellLevel: number;
  displayFrequency?: string;
  /** When true, only include this grant if the build has Look the Part enabled. */
  requiresLookThePart?: boolean;
};

/** Archetype name (spell name) -> granted abilities for view-build display only. */
const ARCHETYPE_GRANTED_SPELLS: Record<string, ArchetypeGrantedSpellDescriptor[]> = {
  Apex: [
    { spellId: 98, spellLevel: 6, displayFrequency: "1/Life (ex)" },
    { spellId: 136, spellLevel: 6, displayFrequency: "1/Life (ex)" },
  ],
  Sniper: [
    { spellId: 100, spellLevel: 6, displayFrequency: "Unlimited (ex) (Ambulant)" },
    { spellId: 98, spellLevel: 1, displayFrequency: "1/Life", requiresLookThePart: true },
  ],
};

export function getArchetypeGrantedSpellDescriptors(archetypeName: string): ArchetypeGrantedSpellDescriptor[] {
  return ARCHETYPE_GRANTED_SPELLS[archetypeName] ?? [];
}

export function collectGrantedSpellIdsForArchetypes(archetypeNames: string[]): number[] {
  const ids = new Set<number>();
  for (const name of archetypeNames) {
    for (const d of getArchetypeGrantedSpellDescriptors(name)) {
      ids.add(d.spellId);
    }
  }
  return [...ids];
}

export type FlatArchetypeGrantDescriptor = ArchetypeGrantedSpellDescriptor & { archetype: string };

export function flattenArchetypeGrantDescriptors(archetypeNames: string[]): FlatArchetypeGrantDescriptor[] {
  const out: FlatArchetypeGrantDescriptor[] = [];
  for (const archetype of archetypeNames) {
    for (const d of getArchetypeGrantedSpellDescriptors(archetype)) {
      out.push({ archetype, ...d });
    }
  }
  return out;
}

/** Append canonical grant spells not already on the catalog at the same spell id and level. */
export function mergeGrantSpellsIntoCatalog(
  catalogSpells: SpellRow[],
  fetchedGrantSpells: SpellRow[],
  descriptors: FlatArchetypeGrantDescriptor[],
  lookThePart = false
): SpellRow[] {
  const merged = [...catalogSpells];
  const hasRow = (spellId: number, spellLevel: number) =>
    merged.some((s) => s.id === spellId && (s.level ?? 1) === spellLevel);

  for (const d of descriptors) {
    if (d.requiresLookThePart && !lookThePart) continue;
    if (hasRow(d.spellId, d.spellLevel)) continue;
    const base = fetchedGrantSpells.find((s) => s.id === d.spellId);
    if (!base) continue;
    merged.push({
      ...base,
      level: d.spellLevel,
      frequency: d.displayFrequency ?? base.frequency,
      catalog_rule_id: undefined,
      source_type: "archetype_grant",
      option_group: undefined,
      is_look_the_part: undefined,
    });
  }
  return merged.sort((a, b) => {
    const levelA = a.level ?? 0;
    const levelB = b.level ?? 0;
    if (levelA !== levelB) return levelA - levelB;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Synthetic selections for archetype-granted spells (view only).
 * Skips spells the build already has purchased (by resolved spell name).
 */
export function buildArchetypeGrantExtraSelections(
  buildId: number,
  realSelections: BuildSpellSelectionRow[],
  catalogSpells: SpellRow[],
  fetchedGrantSpells: SpellRow[],
  archetypeNames: string[],
  lookThePart = false
): BuildSpellSelectionRow[] {
  const ownedNames = new Set<string>();
  for (const sel of realSelections) {
    if (sel.purchased <= 0) continue;
    const sp = findSpellForSelection(catalogSpells, sel);
    if (sp) ownedNames.add(sp.name);
  }

  const spellNameById = new Map(fetchedGrantSpells.map((s) => [s.id, s.name]));
  const descriptors = flattenArchetypeGrantDescriptors(archetypeNames);
  const out: BuildSpellSelectionRow[] = [];
  let virtualId = -1;
  for (const d of descriptors) {
    if (d.requiresLookThePart && !lookThePart) continue;
    const name = spellNameById.get(d.spellId);
    if (name && !d.requiresLookThePart && ownedNames.has(name)) continue;
    if (catalogHasSpellAtLevel(catalogSpells, d.spellId, d.spellLevel)) continue;
    out.push({
      id: virtualId,
      build_id: buildId,
      spell_id: d.spellId,
      spell_level: d.spellLevel,
      purchased: 1,
      experienced: 0,
      selection_group:
        d.requiresLookThePart && d.archetype === "Sniper" ? SNIPER_LTP_MEND_SELECTION_GROUP : `archetype-grant:${d.archetype}`,
      chosen: true,
      metadata: {},
    });
    virtualId -= 1;
  }
  return out;
}
