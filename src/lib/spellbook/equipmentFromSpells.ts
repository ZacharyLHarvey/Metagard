import type { ClassEquipment } from "@/lib/queries/spellbook";
import { findSpellForSelection } from "@/lib/spellbook/selection";
import type { BuildSpellSelectionRow, SpellRow } from "@/lib/spellbook/types";

const EQUIPMENT_SPELL_PREFIX = "Equipment:";

type EquipmentGrantCategory = "armor" | "shield" | "weapon";

type ParsedEquipmentSpell = {
  category: EquipmentGrantCategory;
  /** Display fragment after the category (e.g. "Short", "Small", "1 Point"). */
  label: string;
};

function cloneEq(eq: ClassEquipment): ClassEquipment {
  return { ...eq };
}

/** Parse `Equipment: Shield, Small` → category + label. */
export function parseEquipmentSpellName(spellName: string): ParsedEquipmentSpell | null {
  if (!spellName.startsWith(EQUIPMENT_SPELL_PREFIX)) return null;
  const rest = spellName.slice(EQUIPMENT_SPELL_PREFIX.length).trim();
  const comma = rest.indexOf(",");
  if (comma < 0) return null;
  const categoryRaw = rest.slice(0, comma).trim();
  const label = rest.slice(comma + 1).trim();
  if (!label) return null;
  if (categoryRaw === "Armor") return { category: "armor", label };
  if (categoryRaw === "Shield") return { category: "shield", label };
  if (categoryRaw === "Weapon") return { category: "weapon", label };
  return null;
}

function parseArmorPointsFromClassString(armor: string | null): number {
  if (!armor || armor === "None") return 0;
  const m = armor.match(/(\d+)\s*pt/i);
  return m ? Number(m[1]) : 0;
}

function formatArmorPoints(points: number): string | null {
  if (points <= 0) return null;
  return points === 1 ? "1pt" : `${points}pts`;
}

function parseArmorPointsPerPurchase(label: string): number {
  const m = label.match(/(\d+)\s*point/i);
  return m ? Number(m[1]) : 1;
}

function splitEquipmentList(value: string | null): string[] {
  if (!value || value === "None") return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatCountedLabels(counts: Map<string, number>): string[] {
  const out: string[] = [];
  const sorted = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [label, count] of sorted) {
    out.push(count > 1 ? `${label} (×${count})` : label);
  }
  return out;
}

/** Purchased Equipment: Weapon grants — always show purchase count (e.g. `1x Short`). */
function formatWeaponGrantLabels(counts: Map<string, number>): string[] {
  const out: string[] = [];
  const sorted = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [label, count] of sorted) {
    out.push(`${count}x ${label}`);
  }
  return out;
}

function mergeEquipmentList(
  existing: string | null,
  grantCounts: Map<string, number>,
  formatGrants: (counts: Map<string, number>) => string[] = formatCountedLabels
): string | null {
  const base = splitEquipmentList(existing);
  const grants = formatGrants(grantCounts);
  if (base.length === 0 && grants.length === 0) return existing;
  if (base.length === 0) return grants.join(", ");
  if (grants.length === 0) return existing;
  return [...base, ...grants].join(", ");
}

/**
 * Merge purchased `Equipment: …` spell rows into armor / shields / weapons for build view.
 */
export function applyPurchasedEquipmentSpells(
  base: ClassEquipment,
  selections: BuildSpellSelectionRow[],
  spells: SpellRow[]
): ClassEquipment {
  const shieldCounts = new Map<string, number>();
  const weaponCounts = new Map<string, number>();

  let extraArmorPoints = 0;

  for (const sel of selections) {
    if (sel.purchased <= 0) continue;
    const spell = findSpellForSelection(spells, sel);
    if (!spell) continue;
    const parsed = parseEquipmentSpellName(spell.name);
    if (!parsed) continue;

    const n = sel.purchased;
    if (parsed.category === "armor") {
      extraArmorPoints += parseArmorPointsPerPurchase(parsed.label) * n;
      continue;
    }
    const bucket = parsed.category === "shield" ? shieldCounts : weaponCounts;
    bucket.set(parsed.label, (bucket.get(parsed.label) ?? 0) + n);
  }

  const out = cloneEq(base);

  if (extraArmorPoints > 0) {
    const total = parseArmorPointsFromClassString(base.armor) + extraArmorPoints;
    out.armor = formatArmorPoints(total);
  }

  if (shieldCounts.size > 0) {
    out.shields = mergeEquipmentList(base.shields, shieldCounts);
  }

  if (weaponCounts.size > 0) {
    out.weapons = mergeEquipmentList(base.weapons, weaponCounts, formatWeaponGrantLabels);
  }

  return out;
}
