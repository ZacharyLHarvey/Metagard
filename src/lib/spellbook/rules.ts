import { formatSpellFrequency } from "@/lib/spellbook/formatFrequency";
import type { SpellRow } from "@/lib/spellbook/types";

type RuleResult = {
  restricted: boolean;
  reason: string | null;
  adjustedCost: number;
};

export type DisplayRuleResult = {
  frequency: string | null;
  range: string | null;
};

function hasArchetype(selected: Set<string>, name: string) {
  return selected.has(name);
}

export function buildSelectedSpellNameSet(
  purchasedById: Record<number, number>,
  spells: SpellRow[]
) {
  const selected = new Set<string>();
  for (const spell of spells) {
    if ((purchasedById[spell.id] ?? 0) > 0) {
      selected.add(spell.name);
    }
  }
  return selected;
}

export function evaluateSpellRules(
  spell: SpellRow,
  selectedSpellNames: Set<string>
): RuleResult {
  let restricted = false;
  let reason: string | null = null;
  let adjustedCost = spell.cost ?? 0;

  // Healer archetypes
  if (hasArchetype(selectedSpellNames, "Warder")) {
    if (spell.school && ["Death", "Command", "Subdual"].includes(spell.school)) {
      restricted = true;
      reason = "Blocked by Warder archetype";
    }
  }
  if (hasArchetype(selectedSpellNames, "Necromancer")) {
    if (spell.school === "Protection") {
      restricted = true;
      reason = "Blocked by Necromancer archetype";
    }
  }
  if (hasArchetype(selectedSpellNames, "Priest")) {
    if (spell.name === "Heal") {
      adjustedCost = 0;
    }
  }

  // Wizard archetypes
  if (hasArchetype(selectedSpellNames, "Evoker")) {
    if (spell.type === "Verbal" && (spell.range === "20'" || spell.range === "50'")) {
      restricted = true;
      reason = "Blocked by Evoker archetype";
    }
  }
  if (hasArchetype(selectedSpellNames, "Warlock")) {
    if (
      spell.type === "Verbal" &&
      spell.school &&
      ["Spirit", "Sorcery", "Command", "Protection", "Neutral"].includes(spell.school)
    ) {
      restricted = true;
      reason = "Blocked by Warlock archetype";
    }
  }
  if (hasArchetype(selectedSpellNames, "Battlemage")) {
    if (spell.type && ["Enchantment", "Magic Ball"].includes(spell.type)) {
      restricted = true;
      reason = "Blocked by Battlemage archetype";
    }
  }

  // Druid archetypes
  if (hasArchetype(selectedSpellNames, "Summoner")) {
    if (spell.type === "Verbal" && (spell.range === "20'" || spell.range === "50'")) {
      restricted = true;
      reason = "Blocked by Summoner archetype";
    }
    if (spell.name.includes("Equipment:") && (spell.level ?? 0) > 2) {
      restricted = true;
      reason = "Blocked by Summoner archetype";
    }
  }
  if (hasArchetype(selectedSpellNames, "Ranger")) {
    if (spell.name.includes("Equipment:")) {
      adjustedCost = 0;
    }
    if (spell.type === "Enchantment") {
      adjustedCost = adjustedCost * 2;
    }
  }

  // Bard archetypes
  if (hasArchetype(selectedSpellNames, "Dervish")) {
    if (spell.name.includes("Equipment:")) {
      adjustedCost = adjustedCost * 2;
    }
  }
  if (hasArchetype(selectedSpellNames, "Legend")) {
    if (spell.name === "Swift") {
      restricted = true;
      reason = "Blocked by Legend archetype";
    }
  }

  // Martial-style restrictions seen in remote logic.
  if (hasArchetype(selectedSpellNames, "Infernal") && spell.name === "Steal Life Essence") {
    restricted = true;
    reason = "Blocked by Infernal archetype";
  }
  if (hasArchetype(selectedSpellNames, "Corruptor") && spell.name === "Flame Blade") {
    restricted = true;
    reason = "Blocked by Corruptor archetype";
  }
  if (hasArchetype(selectedSpellNames, "Raider") && spell.name === "Rage") {
    restricted = true;
    reason = "Blocked by Raider archetype";
  }
  if (hasArchetype(selectedSpellNames, "Berserker") && spell.name === "Blood and Thunder") {
    restricted = true;
    reason = "Blocked by Berserker archetype";
  }
  if (
    hasArchetype(selectedSpellNames, "Guardian") &&
    ["Protection from Magic", "Extend Immunities"].includes(spell.name)
  ) {
    restricted = true;
    reason = "Blocked by Guardian archetype";
  }
  if (hasArchetype(selectedSpellNames, "Inquisitor") && spell.name === "Greater Resurrect") {
    restricted = true;
    reason = "Blocked by Inquisitor archetype";
  }
  if (hasArchetype(selectedSpellNames, "Hunter") && ["Release", "Evolution"].includes(spell.name)) {
    restricted = true;
    reason = "Blocked by Hunter archetype";
  }
  if (
    hasArchetype(selectedSpellNames, "Apex") &&
    ["Evolution", "Hold Person", "Pinning Arrow", "Adaptive Protection"].includes(spell.name)
  ) {
    restricted = true;
    reason = "Blocked by Apex archetype";
  }
  if (
    hasArchetype(selectedSpellNames, "Juggernaut") &&
    ["Ancestral Armor", "True Grit", "Harden"].includes(spell.name)
  ) {
    restricted = true;
    reason = "Blocked by Juggernaut archetype";
  }
  if (hasArchetype(selectedSpellNames, "Mystic") && spell.name === "Resurrect") {
    restricted = true;
    reason = "Blocked by Mystic archetype";
  }
  if (
    hasArchetype(selectedSpellNames, "Artificer") &&
    ["Pinning Arrow", "Destruction Arrow", "Poison Arrow", "Suppression Arrow", "Phase Arrow"].includes(
      spell.name
    )
  ) {
    restricted = true;
    reason = "Blocked by Artificer archetype";
  }

  return { restricted, reason, adjustedCost };
}

export function computeDisplayRuleOverrides(
  spell: SpellRow,
  selectedSpellNames: Set<string>,
  purchasedCount: number
): DisplayRuleResult {
  let frequency = formatSpellFrequency(spell.frequency) ?? spell.frequency;
  let range = spell.range;

  if (frequency && purchasedCount > 1 && frequency.includes("/")) {
    const [lhs, ...rest] = frequency.split("/");
    const parsed = Number(lhs);
    if (!Number.isNaN(parsed)) {
      frequency = `${parsed * purchasedCount}/${rest.join("/")}`;
    }
  }

  // Common remote-style archetype frequency/range adjustments.
  if (hasArchetype(selectedSpellNames, "Necromancer") && spell.school === "Death") {
    frequency = `${frequency ?? ""} Charge x3`.trim();
  }
  if (hasArchetype(selectedSpellNames, "Priest") && spell.type === "Meta-Magic") {
    frequency = `${frequency ?? "1/Life"} Charge x3`.trim();
  }
  if (hasArchetype(selectedSpellNames, "Infernal") && spell.name === "Flame Blade") {
    frequency = `${frequency ?? ""} Charge x5`.trim();
  }
  if (hasArchetype(selectedSpellNames, "Corruptor") && spell.name === "Terror") {
    frequency = `${frequency ?? ""} Charge x10`.trim();
  }
  if (hasArchetype(selectedSpellNames, "Corruptor") && spell.name === "Void Touched") {
    range = "Self";
  }
  if (hasArchetype(selectedSpellNames, "Marauder") && spell.name === "Insult") {
    // V8.7 Marauder: Insult becomes 1/Life Charge x5 (m) (Ambulant) — match swiftgard.com wording.
    frequency = "1/Life Charge x5 (m) (Ambulant)";
  }
  if (hasArchetype(selectedSpellNames, "Spy") && ["Shadow Step", "Blink"].includes(spell.name)) {
    frequency = `${frequency ?? ""} Charge x3`.trim();
  }

  return { frequency, range };
}
