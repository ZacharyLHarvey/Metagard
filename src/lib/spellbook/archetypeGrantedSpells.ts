import { formatSpellFrequency } from "@/lib/spellbook/formatFrequency";
import { findSpellForSelection } from "@/lib/spellbook/selection";
import type { BuildSpellSelectionRow, SpellRow } from "@/lib/spellbook/types";

/** Synthetic selection_group for Sniper + Look the Part Mend grant (shown in LtP section, not persisted). */
export const SNIPER_LTP_MEND_SELECTION_GROUP = "archetype-grant:Sniper:ltp-mend" as const;

/** Synthetic selection_group for Artificer + Look the Part Pinning Arrow grant (shown in LtP section, not persisted). */
export const ARTIFICER_LTP_PINNING_SELECTION_GROUP = "archetype-grant:Artificer:ltp-pinning" as const;

/** Synthetic selection_group for Raider + Look the Part Brutal Strike grant (shown in LtP section, not persisted). */
export const RAIDER_LTP_BRUTAL_STRIKE_SELECTION_GROUP = "archetype-grant:Raider:ltp-brutal" as const;

function catalogHasSpellAtLevel(catalogSpells: SpellRow[], spellId: number, spellLevel: number): boolean {
  return catalogSpells.some((s) => s.id === spellId && (s.level ?? 1) === spellLevel);
}

function catalogHasNonGrantSpellAtLevel(
  catalogSpells: SpellRow[],
  spellId: number,
  spellLevel: number
): boolean {
  return catalogSpells.some(
    (s) =>
      s.id === spellId &&
      (s.level ?? 1) === spellLevel &&
      s.source_type !== "archetype_grant"
  );
}

export type ArchetypeGrantedSpellDescriptor = {
  spellId: number;
  spellLevel: number;
  purchased?: number;
  displayFrequency?: string;
  /** Copy formatted frequency from a catalog spell (e.g. Harden) and append (ex). */
  deriveDisplayFrequencyFromSpellName?: string;
  displayRange?: string;
  /** When true, only include this grant if the build has Look the Part enabled. */
  requiresLookThePart?: boolean;
  /** Still merge / create selection when catalog already has this spell id + level. */
  allowCatalogCollision?: boolean;
  /** Always grant even if build already purchased a catalog row with the same spell name. */
  replaceBlockedCatalogSpells?: boolean;
  selectionGroup?: string;
};

function frequencyWithExperiencedSuffix(base: string | null): string | null {
  if (!base || !base.trim()) return "(ex)";
  if (/\(ex\)/i.test(base)) return base.trim();
  return `${base.trim()} (ex)`;
}

function resolveDerivedDisplayFrequency(catalogSpells: SpellRow[], spellName: string): string | null {
  const source = catalogSpells.find((s) => s.name === spellName);
  if (!source) return null;
  const base = formatSpellFrequency(source.frequency) ?? source.frequency;
  return frequencyWithExperiencedSuffix(base);
}

function selectionGroupForGrant(d: FlatArchetypeGrantDescriptor): string {
  if (d.selectionGroup) return d.selectionGroup;
  if (d.requiresLookThePart && d.archetype === "Sniper") return SNIPER_LTP_MEND_SELECTION_GROUP;
  if (d.requiresLookThePart && d.archetype === "Artificer") return ARTIFICER_LTP_PINNING_SELECTION_GROUP;
  if (d.requiresLookThePart && d.archetype === "Raider") return RAIDER_LTP_BRUTAL_STRIKE_SELECTION_GROUP;
  return `archetype-grant:${d.archetype}`;
}

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
  Marauder: [{ spellId: 100, spellLevel: 6, displayFrequency: "Unlimited (ex) (Ambulant)" }],
  Berserker: [{ spellId: 100, spellLevel: 6, displayFrequency: "Unlimited (ex) (Ambulant)" }],
  Juggernaut: [
    {
      spellId: 69,
      spellLevel: 1,
      deriveDisplayFrequencyFromSpellName: "Harden",
      displayRange: "Self",
    },
    {
      spellId: 200,
      spellLevel: 6,
      displayFrequency: "3/Refresh (ex) (Swift)",
      displayRange: "Self",
    },
    { spellId: 199, spellLevel: 6 },
  ],
  Artificer: [
    {
      spellId: 71,
      spellLevel: 6,
      displayFrequency: "2/Refresh Charge x10 (ex)",
    },
    {
      spellId: 109,
      spellLevel: 6,
      purchased: 3,
      displayFrequency: "Unlimited (ex)",
      replaceBlockedCatalogSpells: true,
    },
    {
      spellId: 106,
      spellLevel: 6,
      purchased: 1,
      displayFrequency: "Unlimited (ex)",
      replaceBlockedCatalogSpells: true,
    },
    {
      spellId: 157,
      spellLevel: 4,
      purchased: 1,
      displayFrequency: "Unlimited (ex)",
      replaceBlockedCatalogSpells: true,
    },
    {
      spellId: 109,
      spellLevel: 1,
      purchased: 1,
      displayFrequency: "Unlimited (ex)",
      requiresLookThePart: true,
      allowCatalogCollision: true,
      selectionGroup: ARTIFICER_LTP_PINNING_SELECTION_GROUP,
    },
  ],
  Mystic: [
    { spellId: 61, spellLevel: 6, purchased: 4, displayFrequency: "Unlimited (m)" },
    { spellId: 158, spellLevel: 6, purchased: 2, displayFrequency: "Unlimited (m)" },
  ],
  Medium: [
    {
      spellId: 26,
      spellLevel: 6,
      displayFrequency: "1/Life (ex)",
      displayRange: "Touch",
    },
    { spellId: 130, spellLevel: 6, displayFrequency: "1/Life Charge x3 (ex)" },
    { spellId: 159, spellLevel: 6, displayFrequency: "2/Life (ex)" },
  ],
  Corruptor: [
    {
      spellId: 169,
      spellLevel: 6,
      displayFrequency: "2/Refresh (m)",
      displayRange: "Self",
    },
  ],
  Infernal: [{ spellId: 60, spellLevel: 6, purchased: 2, displayFrequency: "Unlimited (m)" }],
  Inquisitor: [
    {
      spellId: 187,
      spellLevel: 6,
      displayFrequency: "1/Life (ex)",
      displayRange: "Self",
    },
  ],
  Guardian: [
    {
      spellId: 81,
      spellLevel: 6,
      displayFrequency: "1/Life (m)",
      displayRange: "Touch",
    },
    { spellId: 95, spellLevel: 6, displayFrequency: "2/Life Charge x3 (ex)", displayRange: "Other" },
  ],
  Raider: [
    {
      spellId: 179,
      spellLevel: 6,
      displayFrequency: "1/Life (ex)",
      displayRange: "Self",
    },
    {
      spellId: 32,
      spellLevel: 1,
      requiresLookThePart: true,
      allowCatalogCollision: true,
      selectionGroup: RAIDER_LTP_BRUTAL_STRIKE_SELECTION_GROUP,
    },
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

  for (const d of descriptors) {
    if (d.requiresLookThePart && !lookThePart) continue;
    if (
      !d.allowCatalogCollision &&
      !d.replaceBlockedCatalogSpells &&
      catalogHasNonGrantSpellAtLevel(merged, d.spellId, d.spellLevel)
    ) {
      continue;
    }
    const base = fetchedGrantSpells.find((s) => s.id === d.spellId);
    if (!base) continue;
    const derivedFrequency = d.deriveDisplayFrequencyFromSpellName
      ? resolveDerivedDisplayFrequency(catalogSpells, d.deriveDisplayFrequencyFromSpellName)
      : null;
    merged.push({
      ...base,
      level: d.spellLevel,
      frequency: d.displayFrequency ?? derivedFrequency ?? base.frequency,
      range: d.displayRange ?? base.range,
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
 * Skips spells the build already has purchased (by resolved spell name) unless replaceBlockedCatalogSpells.
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
    if (
      name &&
      !d.requiresLookThePart &&
      !d.replaceBlockedCatalogSpells &&
      ownedNames.has(name)
    ) {
      continue;
    }
    if (
      !d.allowCatalogCollision &&
      !d.replaceBlockedCatalogSpells &&
      catalogHasSpellAtLevel(catalogSpells, d.spellId, d.spellLevel)
    ) {
      continue;
    }
    out.push({
      id: virtualId,
      build_id: buildId,
      spell_id: d.spellId,
      spell_level: d.spellLevel,
      purchased: d.purchased ?? 1,
      experienced: 0,
      selection_group: selectionGroupForGrant(d),
      chosen: true,
      metadata: {},
    });
    virtualId -= 1;
  }
  return out;
}
