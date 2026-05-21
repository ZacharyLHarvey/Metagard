import { formatSpellFrequency } from "@/lib/spellbook/formatFrequency";
import type { ExperiencedChargeSuffix } from "@/lib/spellbook/experienced";
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

/** Apply display overrides to a spell row (e.g. spell detail modal, long-press). */
export function applyDisplayRuleToSpell(spell: SpellRow, display: DisplayRuleResult): SpellRow {
  return {
    ...spell,
    ...(display.frequency != null ? { frequency: display.frequency } : {}),
    ...(display.range != null ? { range: display.range } : {}),
  };
}

export type ComputeDisplayRuleOptions = {
  experiencedChargeSuffix?: ExperiencedChargeSuffix | null;
};

/** If frequency already has a Charge x# clause, replace it with Experienced's; otherwise append. */
function applyExperiencedChargeToFrequency(
  frequency: string | null,
  experiencedChargeSuffix: ExperiencedChargeSuffix
): string {
  const suffix = experiencedChargeSuffix;
  if (!frequency || !frequency.trim()) return suffix;
  const trimmed = frequency.trim();
  // Avoid matching "Charge" inside e.g. "Recharge"
  const chargeFragment = /(?<![a-zA-Z])Charge\s+x\d+/gi;
  const replaced = trimmed.replace(chargeFragment, suffix);
  if (replaced !== trimmed) return replaced;
  return `${trimmed} ${suffix}`;
}

function hasArchetype(selected: Set<string>, name: string) {
  return selected.has(name);
}

/** Remove Charge x# clauses (and optional trailing modifiers like (ex)). */
function stripChargeFromFrequency(frequency: string | null): string | null {
  if (!frequency || !frequency.trim()) return frequency;
  const stripped = frequency
    .trim()
    .replace(/(?<![a-zA-Z])Charge\s+x\d+(\s+\([^)]+\))?/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripped || null;
}

/** Multiply the leading uses count in `N/Per…` (e.g. `1/Life Charge x3` → `2/Life Charge x3`). */
function multiplyLeadingSlashFrequency(frequency: string, factor: number): string {
  const m = frequency.match(/^(\d+)(\/.*)$/);
  if (!m) return frequency;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return frequency;
  return `${n * factor}${m[2]}`;
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
  purchasedCount: number,
  buildClassName?: string | null,
  options?: ComputeDisplayRuleOptions | null
): DisplayRuleResult {
  let frequency = formatSpellFrequency(spell.frequency) ?? spell.frequency;
  let range = spell.range;
  const cls = buildClassName ?? null;

  if (frequency && purchasedCount > 1 && frequency.includes("/")) {
    const [lhs, ...rest] = frequency.split("/");
    const parsed = Number(lhs);
    if (!Number.isNaN(parsed)) {
      frequency = `${parsed * purchasedCount}/${rest.join("/")}`;
    }
  }

  const canMultiplyLeading = Boolean(frequency && !frequency.includes("Unlimited"));

  // Druid Summoner: each Enchantment purchased gets double the listed uses (1/Life → 2/Life, etc.).
  if (
    frequency &&
    canMultiplyLeading &&
    hasArchetype(selectedSpellNames, "Summoner") &&
    spell.type === "Enchantment"
  ) {
    frequency = multiplyLeadingSlashFrequency(frequency, 2);
  }
  if (
    frequency &&
    canMultiplyLeading &&
    hasArchetype(selectedSpellNames, "Warder") &&
    spell.school === "Protection"
  ) {
    frequency = multiplyLeadingSlashFrequency(frequency, 2);
  }
  // Bard Dervish: each Verbal purchased gives double the uses.
  if (
    frequency &&
    canMultiplyLeading &&
    hasArchetype(selectedSpellNames, "Dervish") &&
    spell.type === "Verbal"
  ) {
    frequency = multiplyLeadingSlashFrequency(frequency, 2);
  }
  // Bard Legend: each Extension purchased gives double the uses.
  if (
    frequency &&
    canMultiplyLeading &&
    hasArchetype(selectedSpellNames, "Legend") &&
    spell.type === "Meta-Magic" &&
    spell.name === "Extension"
  ) {
    frequency = multiplyLeadingSlashFrequency(frequency, 2);
  }
  // Wizard Warlock: Verbals in Death and Flame schools only.
  if (
    frequency &&
    canMultiplyLeading &&
    hasArchetype(selectedSpellNames, "Warlock") &&
    spell.type === "Verbal" &&
    (spell.school === "Death" || spell.school === "Flame")
  ) {
    frequency = multiplyLeadingSlashFrequency(frequency, 2);
  }

  // School / type charge suffixes (Priest replaces Meta-Magic before Medium appends to Spirit non-MM).
  if (hasArchetype(selectedSpellNames, "Necromancer") && spell.school === "Death") {
    frequency = `${frequency ?? ""} Charge x3`.trim();
  }
  if (hasArchetype(selectedSpellNames, "Priest") && spell.type === "Meta-Magic") {
    frequency = `${frequency ?? "1/Life"} Charge x3`.trim();
  }
  if (
    hasArchetype(selectedSpellNames, "Medium") &&
    spell.school === "Spirit" &&
    spell.type !== "Meta-Magic" &&
    frequency &&
    !frequency.includes("Unlimited")
  ) {
    frequency = `${frequency} Charge x3`.trim();
  }

  if (hasArchetype(selectedSpellNames, "Battlemage") && spell.name === "Ambulant") {
    frequency = "Unlimited";
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
  if (cls === "Warrior" && hasArchetype(selectedSpellNames, "Marauder") && spell.name === "Momentum") {
    frequency = "Unlimited (ex) (Ambulant)";
  }
  if (hasArchetype(selectedSpellNames, "Spy") && ["Shadow Step", "Blink"].includes(spell.name)) {
    frequency = `${frequency ?? ""} Charge x3`.trim();
  }

  if (hasArchetype(selectedSpellNames, "Evoker") && spell.name === "Elemental Barrage") {
    frequency = `${frequency ?? ""} Charge x10`.trim();
  }

  if (cls === "Archer" && hasArchetype(selectedSpellNames, "Artificer")) {
    if (spell.name === "Mend") {
      frequency = "2/Life Charge x3 (ex)";
    } else if (spell.name === "Greater Mend") {
      frequency = "2/Refresh Charge x10 (ex)";
    }
  }

  if (cls === "Scout" && hasArchetype(selectedSpellNames, "Hunter")) {
    if (spell.name === "Hold Person") {
      frequency = "1/Life Charge x3 (m)";
    } else if (spell.name === "Pinning Arrow") {
      frequency = "2 Arrows / Unlimited (ex)";
    }
  }

  if (cls === "Archer" && hasArchetype(selectedSpellNames, "Sniper")) {
    if (spell.type === "Specialty Arrow") {
      frequency = "1 Arrow/Life Charge x3";
    } else if (spell.name === "Momentum") {
      frequency = "Unlimited (ex) (Ambulant)";
    }
  }

  if (cls === "Barbarian" && hasArchetype(selectedSpellNames, "Berserker") && spell.name === "Momentum") {
    frequency = "Unlimited (ex) (Ambulant)";
  }

  if (cls === "Warrior" && hasArchetype(selectedSpellNames, "Juggernaut") && spell.name === "Greater Harden") {
    range = "Self";
    if (frequency && !/\(ex\)/i.test(frequency)) {
      frequency = `${frequency.trim()} (ex)`;
    }
  }
  if (cls === "Warrior" && hasArchetype(selectedSpellNames, "Juggernaut") && spell.name === "Phoenix Tears") {
    frequency = "3/Refresh (ex) (Swift)";
    range = "Self";
  }

  const expSuffix = options?.experiencedChargeSuffix;
  if (expSuffix) {
    frequency = applyExperiencedChargeToFrequency(frequency, expSuffix);
  }

  if (cls === "Warrior" && hasArchetype(selectedSpellNames, "Marauder") && spell.name === "Ancestral Armor") {
    frequency = stripChargeFromFrequency(frequency);
  }

  return { frequency, range };
}
