import { findSpellForSelection } from "@/lib/spellbook/selection";
import type { BuildSpellSelectionRow, SpellRow } from "@/lib/spellbook/types";
import { getViewBuildPurchasedSpellRows } from "@/lib/spellbook/viewBuildSpellSelections";

export type MaterialColorTotal = { color: string; total: number };

export type MaterialTotals = {
  enchantmentStrips: MaterialColorTotal[];
  magicBalls: MaterialColorTotal[];
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
};

function titleCaseColor(color: string): string {
  return color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();
}

function parseQuantity(prefix: string | undefined): number {
  if (!prefix) return 1;
  const lower = prefix.toLowerCase();
  if (NUMBER_WORDS[lower] != null) return NUMBER_WORDS[lower];
  const numeric = Number.parseInt(prefix, 10);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
}

function addToMap(map: Map<string, number>, color: string, count: number): void {
  if (count <= 0) return;
  const key = titleCaseColor(color);
  map.set(key, (map.get(key) ?? 0) + count);
}

function parseMaterialSegment(
  segment: string,
  strips: Map<string, number>,
  magicBalls: Map<string, number>
): void {
  const trimmed = segment.trim();
  if (!trimmed) return;

  const magicBallMatch = trimmed.match(/^(\w+)\s+Magic\s+Ball$/i);
  if (magicBallMatch) {
    addToMap(magicBalls, magicBallMatch[1], 1);
    return;
  }

  const stripMatch = trimmed.match(/^(?:(\w+)\s+)?(\w+)\s+strips?$/i);
  if (stripMatch) {
    const count = parseQuantity(stripMatch[1]);
    addToMap(strips, stripMatch[2], count);
  }
}

export function parseSpellMaterials(materials: string): {
  strips: Map<string, number>;
  magicBalls: Map<string, number>;
} {
  const strips = new Map<string, number>();
  const magicBalls = new Map<string, number>();
  for (const segment of materials.split(/\s+and\s+/i)) {
    parseMaterialSegment(segment, strips, magicBalls);
  }
  return { strips, magicBalls };
}

function sortedTotals(map: Map<string, number>): MaterialColorTotal[] {
  return [...map.entries()]
    .map(([color, total]) => ({ color, total }))
    .sort((a, b) => a.color.localeCompare(b.color));
}

function mergeParsedMaterials(
  strips: Map<string, number>,
  magicBalls: Map<string, number>,
  parsed: { strips: Map<string, number>; magicBalls: Map<string, number> },
  multiplier: number
): void {
  for (const [color, count] of parsed.strips) {
    addToMap(strips, color, count * multiplier);
  }
  for (const [color, count] of parsed.magicBalls) {
    addToMap(magicBalls, color, count * multiplier);
  }
}

export function computeMaterialTotals(
  selections: BuildSpellSelectionRow[],
  extraSelections: BuildSpellSelectionRow[],
  spells: SpellRow[],
  opts: { className: string; lookThePart: boolean }
): MaterialTotals {
  const rows = getViewBuildPurchasedSpellRows(selections, extraSelections, spells, opts);
  const strips = new Map<string, number>();
  const magicBalls = new Map<string, number>();

  for (const row of rows) {
    const spell = findSpellForSelection(spells, row);
    if (!spell?.materials) continue;
    const parsed = parseSpellMaterials(spell.materials);
    mergeParsedMaterials(strips, magicBalls, parsed, row.purchased);
  }

  return {
    enchantmentStrips: sortedTotals(strips),
    magicBalls: sortedTotals(magicBalls),
  };
}
