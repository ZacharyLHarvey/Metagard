import type { ClassEquipment } from "@/lib/queries/spellbook";
import { findSpellForSelection } from "@/lib/spellbook/selection";
import type { BuildSpellSelectionRow, SpellRow } from "@/lib/spellbook/types";

/** Purchased catalog rows whose spell type is Archetype, de-duplicated by name, sorted for deterministic overrides. */
export function selectedMartialArchetypeSpells(
  selections: BuildSpellSelectionRow[],
  spells: SpellRow[]
): SpellRow[] {
  const byName = new Map<string, SpellRow>();
  for (const sel of selections) {
    if (sel.purchased <= 0) continue;
    const spell = findSpellForSelection(spells, sel);
    if (!spell || spell.type !== "Archetype") continue;
    byName.set(spell.name, spell);
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

type Equipment = ClassEquipment;

function cloneEq(eq: Equipment): Equipment {
  return { ...eq };
}

/** Hunter (Scout): Great weapons + Javelins; no shields. */
function applyHunter(eq: Equipment): Equipment {
  const next = cloneEq(eq);
  next.shields = "None";
  next.weapons = eq.weapons
    ? `${eq.weapons}, Great weapons, Javelins`
    : "Great weapons, Javelins";
  return next;
}

/** Infernal (Anti-Paladin): no shields. */
function applyInfernal(eq: Equipment): Equipment {
  const next = cloneEq(eq);
  next.shields = "None";
  return next;
}

/** Corruptor (Anti-Paladin): no Great Weapons, no Javelins. */
function applyCorruptor(eq: Equipment): Equipment {
  const next = cloneEq(eq);
  next.weapons = "All Melee (excluding Great Weapons), no Javelins";
  return next;
}

/** Berserker (Barbarian): no armor. */
function applyBerserker(eq: Equipment): Equipment {
  const next = cloneEq(eq);
  next.armor = "None";
  return next;
}

/** Marauder (Warrior): max 4pts armor; no Large shields. */
function applyMarauder(eq: Equipment): Equipment {
  const next = cloneEq(eq);
  next.armor = "4pts (maximum)";
  next.shields = "Small, Medium";
  return next;
}

/** Artificer (Archer): may wield a Small shield. */
function applyArtificer(eq: Equipment): Equipment {
  const next = cloneEq(eq);
  next.shields = "Small";
  return next;
}

/** Spy (Assassin): no armor. */
function applySpy(eq: Equipment): Equipment {
  const next = cloneEq(eq);
  next.armor = "None";
  return next;
}

/** Rogue (Assassin): no Long weapons or Bows. */
function applyRogue(eq: Equipment): Equipment {
  const next = cloneEq(eq);
  next.weapons = "Dagger, Short, Light Thrown, Heavy Thrown";
  return next;
}

/** Medium (Monk): no armor; no Great weapons. */
function applyMedium(eq: Equipment): Equipment {
  const next = cloneEq(eq);
  next.armor = "None";
  next.weapons = "All Melee (excluding Great weapons), Heavy Thrown";
  return next;
}

/** Mystic (Monk): no Heavy Thrown. */
function applyMystic(eq: Equipment): Equipment {
  const next = cloneEq(eq);
  next.weapons = "All Melee";
  return next;
}

/** Ranger (Druid): may use Bows. */
function applyRanger(eq: Equipment): Equipment {
  const next = cloneEq(eq);
  next.weapons = eq.weapons ? `${eq.weapons}, Bow` : "Bow";
  return next;
}

const ARCHETYPE_EQUIPMENT: Record<string, (eq: Equipment) => Equipment> = {
  Hunter: applyHunter,
  Infernal: applyInfernal,
  Corruptor: applyCorruptor,
  Berserker: applyBerserker,
  Marauder: applyMarauder,
  Artificer: applyArtificer,
  Spy: applySpy,
  Rogue: applyRogue,
  Medium: applyMedium,
  Mystic: applyMystic,
  Ranger: applyRanger,
};

/**
 * Starts from `public.classes` equipment and applies archetype-specific display overrides
 * for martial optional archetypes that change armor/shields/weapons.
 */
export function applyMartialArchetypeEquipmentOverrides(
  base: ClassEquipment,
  archetypes: SpellRow[]
): ClassEquipment {
  let out = cloneEq(base);
  for (const arch of archetypes) {
    const fn = ARCHETYPE_EQUIPMENT[arch.name];
    if (fn) out = fn(out);
  }
  return out;
}

/** Martial and caster builds: apply archetype equipment overrides from purchased archetype rows. */
export function applyArchetypeEquipmentOverrides(
  base: ClassEquipment,
  archetypes: SpellRow[],
  _className?: string
): ClassEquipment {
  return applyMartialArchetypeEquipmentOverrides(base, archetypes);
}
