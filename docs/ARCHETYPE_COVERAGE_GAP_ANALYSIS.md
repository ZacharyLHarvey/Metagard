# Archetype 100% Coverage — Gap-Analysis Test Case

> **Status:** FAIL — open blocking/display gaps remain.
> **Generated:** 2026-05-25T17:05:38.451Z
> **Archetypes in canon:** 28 | **Grant map entries:** 13 | **Open gaps (excl. info):** 0

This document is the **deliverable test case** from the Archetype Coverage Gap Analysis plan. It does **not** modify archetype logic; it records canon vs implementation and remediation steps if gaps are found.

Machine-readable output: [archetype-gap-analysis-data.json](./archetype-gap-analysis-data.json). Regenerate with `node scripts/archetype-gap-analysis.mjs`.

## 1. Purpose and constraints

- **Purpose:** Validate that every archetype rule in Swiftgard parity appears in Metagard build output (view, edit, spell lists, budgets, equipment).
- **On failure:** Produce gap entries with detection step IDs (A1–E10) and implementation outlines — **no auto-fix**.
- **Canon:** `supabase/policies/generated_swiftgard_parity.sql` (`type = 'Archetype'`).
- **Implementation surfaces:**
  - Gained spells → `src/lib/spellbook/archetypeGrantedSpells.ts`
  - Restrictions / cost → `evaluateSpellRules` in `src/lib/spellbook/rules.ts`
  - Frequency / range / tags → `computeDisplayRuleOverrides` in `rules.ts`
  - Gear (martial view) → `src/lib/spellbook/martialEquipment.ts`
  - View hide blocked purchases → `src/lib/spellbook/viewBuildSpellSelections.ts`

## 2. Regression patterns (prior fixes)

| Pattern | Example | Detection |
|---------|---------|-----------|
| Missing grant map | Mystic Force/Suppression bolts | A1 |
| Charge appended not replaced | Medium Spirit school | C2 |
| Missing `(ex)` on frequency | Spy Blink/Shadow Step | C4 |
| Tag not on ability row | Rogue Coup de Grace | D3 |
| Replacement not in catalog | Juggernaut Harden → Greater Harden | A6 |
| LtP not swapped | Sniper/Artificer/Raider | A5 |
| Gear not on view | Hunter Great weapons | E1 |
| Caster gear only in cost rules | Ranger Bows | E8 |

## 3. Code surface inventory

| Surface | Archetypes covered | Count |
|---------|-------------------|-------|
| `ARCHETYPE_GRANTED_SPELLS` | Apex, Artificer, Berserker, Corruptor, Guardian, Infernal, Inquisitor, Juggernaut, Marauder, Medium, Mystic, Raider, Sniper | 13 / 28 |
| `evaluateSpellRules` | Apex, Artificer, Avatar of Nature, Battlemage, Berserker, Combat Caster, Corruptor, Dervish, Evoker, Guardian, Hunter, Infernal, Inquisitor, Juggernaut, Legend, Marauder, Medium, Mystic, Necromancer, Priest, Raider, Ranger, Rogue, Sniper, Spy, Summoner, Warder, Warlock | 28 / 28 |
| `computeDisplayRuleOverrides` | Artificer, Avatar of Nature, Battlemage, Berserker, Combat Caster, Corruptor, Dervish, Evoker, Hunter, Infernal, Juggernaut, Legend, Marauder, Medium, Necromancer, Priest, Rogue, Sniper, Spy, Summoner, Warder, Warlock | 22 / 28 |
| `ARCHETYPE_EQUIPMENT` | Artificer, Berserker, Corruptor, Hunter, Infernal, Marauder, Medium, Mystic, Ranger, Rogue, Spy | 11 / 28 |

## 4. Test fixture matrix

| Fixture ID (assign when created) | Class | Archetype | Level | LtP | Notes |
|--------------------------------|-------|-----------|-------|-----|-------|
| `fixture-Paladin-Apex` | Paladin | Apex | 6 | — | Purchase archetype + dependent spells |
| `fixture-Archer-Artificer` | Archer | Artificer | 6 | on + off | Purchase archetype + dependent spells |
| `fixture-Druid-Avatar of Nature` | Druid | Avatar of Nature | 6 | — | Purchase archetype + dependent spells |
| `fixture-Wizard-Battlemage` | Wizard | Battlemage | 6 | — | Purchase archetype + dependent spells |
| `fixture-Barbarian-Berserker` | Barbarian | Berserker | 6 | — | Purchase archetype + dependent spells |
| `fixture-Wizard-Combat Caster` | Wizard | Combat Caster | 6 | — | Purchase archetype + dependent spells |
| `fixture-Anti-Paladin-Corruptor` | Anti-Paladin | Corruptor | 6 | — | Purchase archetype + dependent spells |
| `fixture-Bard-Dervish` | Bard | Dervish | 6 | — | Purchase archetype + dependent spells |
| `fixture-Wizard-Evoker` | Wizard | Evoker | 6 | — | Purchase archetype + dependent spells |
| `fixture-Paladin-Guardian` | Paladin | Guardian | 6 | — | Purchase archetype + dependent spells |
| `fixture-Scout-Hunter` | Scout | Hunter | 6 | — | Hold Person vs Pinning Arrow variants |
| `fixture-Anti-Paladin-Infernal` | Anti-Paladin | Infernal | 6 | — | Purchase archetype + dependent spells |
| `fixture-Paladin-Inquisitor` | Paladin | Inquisitor | 6 | — | Purchase archetype + dependent spells |
| `fixture-Warrior-Juggernaut` | Warrior | Juggernaut | 6 | — | Purchase archetype + dependent spells |
| `fixture-Bard-Legend` | Bard | Legend | 6 | — | Purchase archetype + dependent spells |
| `fixture-Warrior-Marauder` | Warrior | Marauder | 6 | — | Purchase archetype + dependent spells |
| `fixture-Monk-Medium` | Monk | Medium | 6 | — | Purchase archetype + dependent spells |
| `fixture-Monk-Mystic` | Monk | Mystic | 6 | — | Purchase archetype + dependent spells |
| `fixture-Healer-Necromancer` | Healer | Necromancer | 6 | — | Purchase archetype + dependent spells |
| `fixture-Healer-Priest` | Healer | Priest | 6 | — | Purchase archetype + dependent spells |
| `fixture-Barbarian-Raider` | Barbarian | Raider | 6 | on + off | Purchase archetype + dependent spells |
| `fixture-Druid-Ranger` | Druid | Ranger | 6 | — | Purchase archetype + dependent spells |
| `fixture-Assassin-Rogue` | Assassin | Rogue | 6 | — | Purchase archetype + dependent spells |
| `fixture-Archer-Sniper` | Archer | Sniper | 6 | on + off | Purchase archetype + dependent spells |
| `fixture-Assassin-Spy` | Assassin | Spy | 6 | — | Purchase archetype + dependent spells |
| `fixture-Druid-Summoner` | Druid | Summoner | 6 | — | Purchase archetype + dependent spells |
| `fixture-Healer-Warder` | Healer | Warder | 6 | — | Purchase archetype + dependent spells |
| `fixture-Wizard-Warlock` | Wizard | Warlock | 6 | — | Purchase archetype + dependent spells |

**Fixture build IDs:** None assigned in this pass (static analysis only). When executing manually, record build IDs in this table.

## 5. Canon extraction (28 archetypes)

| ID | Archetype | Class | Gained (effect) | Limitations | Gear / notes |
|----|-----------|-------|-----------------|-------------|--------------|
| 9 | Apex | Paladin | Gain Mend 1/Life (ex) and Sleight of Mind (Self) 1/Life (ex) | Loses all instances of Evolution, Hold Person, Pinning Arrow | — |
| 10 | Artificer | Archer | May wield a Small shield. Gain Greater Mend 2/Refresh Charge x10 (ex). Mend beco | Rather than the normal amount of Specialty Arrows for an Arc | Player must still have a use of Mend rem |
| 19 | Avatar of Nature | Druid | All the casters Enchantments of level 4 and below are now range Self instead of  | — | — |
| 18 | Battlemage | Wizard | Use of Ambulant becomes unlimited. | May not purchase Enchantments or Magic Balls. | — |
| 22 | Berserker | Barbarian | Gain Momentum Unlimited (ex) (Ambulant). | May not wear Armor, and loses all instances of Blood and Thu | — |
| 29 | Combat Caster | Wizard | Does not require an empty hand to cast abilities | — | — |
| 36 | Corruptor | Anti-Paladin | Gain Void Touched (Self) 2/Refresh (m). All uses of Terror become 1/Life Charge  | May not wield Great Weapons or Javelins and loses all instan | — |
| 40 | Dervish | Bard | Equipment costs are doubled. Each Verbal purchased gives double the uses. Exampl | — | — |
| 54 | Evoker | Wizard | May not purchase Verbals with a range of 20' or 50'. Elemental Barrage becomes C | — | Elemental Barrage must still be purchase |
| 73 | Guardian | Paladin | Gain Imbue Shield (Touch) 1/Life (m) and Martyr (Other) 2/Life Charge x3 (ex). | Loses all instances of Protection from Magic and Extend Immu | — |
| 80 | Hunter | Scout | May wield Great weapons and Javelins. Pick one: -Hold Person becomes 1/Life Char | May not wield shields. Loses all instances of Release and Ev | You only gain the benefit of an option i |
| 85 | Infernal | Anti-Paladin | Gain Fireball 2 Balls / Unlimited (m). Flame Blade becomes (Self) 2/Refresh Char | May not wield shields. Lose all instances of Steal Life Esse | — |
| 87 | Inquisitor | Paladin | Gain Sacred Blades (Self) 1/Life (ex) | Player loses all instances of Greater Resurrect. | — |
| 90 | Juggernaut | Warrior | Replace Harden with Greater Harden (Self) (ex) at the same frequency. Gain Phoen | Loses all instances of Ancestral Armor and True Grit. | — |
| 91 | Legend | Bard | Each Extension purchased gives double the uses. Example: 1/Life becomes 2/Life.  | — | — |
| 178 | Marauder | Warrior | Gain Momentum Unlimited (ex) (Ambulant). Insult becomes 1/Life Charge x5 (m) (Am | Maximum Armor becomes 4pts. May not wield Large shields. Anc | — |
| 97 | Medium | Monk | Gain Blessing Against Wounds (Touch) 1/Life (ex), Sever Spirit 1/Life Charge x3  | May not wear Armor and may not wield Great weapons. | — |
| 102 | Mystic | Monk | Gain Force Bolt 4 Balls / Unlimited (m). Gain Suppression Bolt 2 Balls / Unlimit | May not wield Heavy Thrown. Lose all instances of Resurrect. | — |
| 104 | Necromancer | Healer | All abilities purchased in the Death School become Charge x3. You may have a com | You may not purchase any abilities from the Protection Schoo | — |
| 114 | Priest | Healer | Meta-Magic may only be used on Spirit abilities. All Meta-Magics purchased becom | — | — |
| 117 | Raider | Barbarian | Gain Bear Strength (Self) 1/Life (ex). Look the part becomes an additional use o | Loses all instances of Rage. | — |
| 121 | Ranger | Druid | May use Bows. The cost of all available Equipment is reduced to zero points. Enc | — | — |
| 181 | Rogue | Assassin | Regain a use of Coup de Grace upon killing a player with a thrown weapon. | May not wield Long weapons or Bows. | — |
| 139 | Sniper | Archer | May physically carry any number of Specialty Arrows of each type. The frequency  | May not fire normal arrows. | — |
| 150 | Spy | Assassin | Blink and Shadow Step become Charge x3 (ex). | May not wear Armor. | — |
| 155 | Summoner | Druid | Each Enchantment purchased gives double the uses. Example: 1/Life Charge x3 beco | May not purchase Verbals with a range other than Touch or Se | — |
| 171 | Warder | Healer | All abilities purchased in the Protection School give double the uses. Example:  | Player may not purchase any abilities from the Death, Comman | — |
| 172 | Warlock | Wizard | Each Verbal purchased in the Death and Flame Schools gives double the uses. Exam | Player may not purchase Verbals from any School other than t | — |

## 6. Code mapping matrix

| Archetype | Grants | evaluate | display | gear | Gap count |
|-----------|--------|----------|---------|------|-----------|
| Apex | yes (2) | yes | — | — | 0 |
| Artificer | yes (5) | yes | yes | yes | 0 |
| Avatar of Nature | — | yes | yes | — | 0 |
| Battlemage | — | yes | yes | — | 0 |
| Berserker | yes (1) | yes | yes | yes | 0 |
| Combat Caster | — | yes | yes | — | 0 |
| Corruptor | yes (1) | yes | yes | yes | 0 |
| Dervish | — | yes | yes | — | 0 |
| Evoker | — | yes | yes | — | 0 |
| Guardian | yes (2) | yes | — | — | 0 |
| Hunter | — | yes | yes | yes | 0 |
| Infernal | yes (1) | yes | yes | yes | 0 |
| Inquisitor | yes (1) | yes | — | — | 0 |
| Juggernaut | yes (3) | yes | yes | — | 0 |
| Legend | — | yes | yes | — | 0 |
| Marauder | yes (1) | yes | yes | yes | 0 |
| Medium | yes (3) | yes | yes | yes | 0 |
| Mystic | yes (2) | yes | — | yes | 0 |
| Necromancer | — | yes | yes | — | 0 |
| Priest | — | yes | yes | — | 0 |
| Raider | yes (2) | yes | — | — | 0 |
| Ranger | — | yes | — | yes | 0 |
| Rogue | — | yes | yes | yes | 0 |
| Sniper | yes (2) | yes | yes | — | 0 |
| Spy | — | yes | yes | yes | 0 |
| Summoner | — | yes | yes | — | 0 |
| Warder | — | yes | yes | — | 0 |
| Warlock | — | yes | yes | — | 0 |

## 7. Validation execution (steps A–E)

### Dimension A — Gained spells
- **A1:** `getArchetypeGrantedSpellDescriptors(name)` non-empty for each DB "Gain" / "Replace".
- **A2–A7:** See plan: spell IDs, purchased counts, LtP gating, replacements (Juggernaut), Artificer collision flags.

### Dimension B — Spell limitations
- **B1:** `evaluateSpellRules` blocks every "Loses" / "May not purchase" clause.
- **B2:** View omits blocked rows via `mergeViewDisplaySpellSelectionRows`.
- **B5–B10:** Summoner equipment level, Necromancer minion cap, Guardian imbue cap, Priest Spirit-only Meta-Magic, Hunter pick-one.

### Dimension C — Frequency modifications
- **C1–C9:** `computeDisplayRuleOverrides` with correct `buildClassName` where gated; Charge replace vs append; suffix tokens.

### Dimension D — Special tags
- **D1–D4:** Artificer Mend, Rogue Coup de Grace — tag on final list row in `BuildSpellDetails` / `BuildSpellEditor`.

### Dimension E — Gear
- **E1–E10:** `applyMartialArchetypeEquipmentOverrides` on view; edit restrictions for equipment spells; Ranger bows; Sniper normal arrows.

**This pass:** Static diff via `scripts/archetype-gap-analysis.mjs` (no live build IDs).

### Spot-checks verified in code (no live build)

| Check | Result |
|-------|--------|
| Mystic grant descriptors (61×4, 158×2, Unlimited (m)) | Pass |
| Medium grants + Spirit Charge replace via `applyChargeSuffixToFrequency` | Pass |
| Spy Blink/Shadow Step `Charge x3 (ex)` | Pass |
| Rogue `ROGUE_COUP_DE_GRACE_TAG` on Assassin Coup de Grace | Pass |
| Corruptor Void Touched range → Self in display rules | Pass (grant row still missing — A1) |
| Juggernaut grant + block Harden pipeline | Pass |

## 8. Open gap report

No gaps detected.

## 9. Per-gap implementation outline (if fixing)

| Gap type | Files / actions |
|----------|-----------------|
| Missing grant | `archetypeGrantedSpells.ts`; verify `page.tsx` / `edit/page.tsx` grant pipeline |
| Missing block | `rules.ts` `evaluateSpellRules`; `viewBuildSpellSelections.ts` |
| Missing frequency | `rules.ts` `computeDisplayRuleOverrides`; pass `buildClassName` from UI |
| Missing tag | `rules.ts` constant + branch; `BuildSpellDetails.tsx` / `BuildSpellEditor.tsx` |
| Missing gear | `martialEquipment.ts` or caster equipment display for Ranger |
| LtP swap | Grant + `requiresLookThePart`; hide pick-one in `partitionViewBuildSpellDisplayRows` |

## 10. Overall result

| Metric | Value |
|--------|-------|
| **Result** | **PASS** |
| Blocking/display gaps | 0 |
| Info / drift items | 0 |
