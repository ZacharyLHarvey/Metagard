"use client";

import AbilityFrequencyEditor from "@/components/customClass/AbilityFrequencyEditor";
import SegmentedToggle from "@/components/ui/SegmentedToggle";
import SpellPicker, { type SpellPickerResult } from "@/components/customClass/SpellPicker";
import {
  MARTIAL_SOURCE_TYPES,
  isLookThePartRule,
  type SpellFrequencyInput,
  type WizardRuleDraft,
} from "@/lib/customClass/types";

function newClientKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const CORE_MARTIAL_SOURCE_TYPES = MARTIAL_SOURCE_TYPES.filter((t) => t !== "look_the_part");

type Props = {
  rules: WizardRuleDraft[];
  onChange: (rules: WizardRuleDraft[]) => void;
  lookThePartIncluded: boolean;
  onLookThePartIncludedChange: (included: boolean) => void;
};

export default function MartialAbilityEditor({
  rules,
  onChange,
  lookThePartIncluded,
  onLookThePartIncludedChange,
}: Props) {
  const baseRules = rules.filter((r) => !isLookThePartRule(r));
  const ltpRules = rules.filter(isLookThePartRule);

  function replaceBaseRules(nextBase: WizardRuleDraft[]) {
    onChange([...nextBase, ...ltpRules]);
  }

  function replaceLtpRules(nextLtp: WizardRuleDraft[]) {
    onChange([...baseRules, ...nextLtp]);
  }

  function handleLookThePartChange(next: "none" | "included") {
    const included = next === "included";
    if (!included && ltpRules.length > 0) {
      const ok = window.confirm(
        "Turning off Look the Part will remove all Look the Part abilities. Continue?"
      );
      if (!ok) return;
      onChange(baseRules);
    }
    onLookThePartIncludedChange(included);
  }

  function addBaseRule(level: number) {
    replaceBaseRules([
      ...baseRules,
      {
        clientKey: newClientKey(),
        spell_kind: "canonical",
        spell_id: 0,
        spell_name: "",
        spell_level: level,
        cost: 0,
        max_count: null,
        frequency: null,
        restricted: false,
        source_type: "base",
        option_group: null,
        is_look_the_part: false,
      },
    ]);
  }

  function addLtpRule() {
    replaceLtpRules([
      ...ltpRules,
      {
        clientKey: newClientKey(),
        spell_kind: "canonical",
        spell_id: 0,
        spell_name: "",
        spell_level: 1,
        cost: 0,
        max_count: null,
        frequency: null,
        restricted: false,
        source_type: "look_the_part",
        option_group: null,
        is_look_the_part: true,
      },
    ]);
  }

  function updateBaseRule(clientKey: string, patch: Partial<WizardRuleDraft>) {
    replaceBaseRules(
      baseRules.map((r) => (r.clientKey === clientKey ? { ...r, ...patch } : r))
    );
  }

  function updateLtpRule(clientKey: string, patch: Partial<WizardRuleDraft>) {
    replaceLtpRules(
      ltpRules.map((r) =>
        r.clientKey === clientKey
          ? { ...r, ...patch, source_type: "look_the_part", is_look_the_part: true }
          : r
      )
    );
  }

  function removeBaseRule(clientKey: string) {
    replaceBaseRules(baseRules.filter((r) => r.clientKey !== clientKey));
  }

  function removeLtpRule(clientKey: string) {
    replaceLtpRules(ltpRules.filter((r) => r.clientKey !== clientKey));
  }

  function setBaseSpell(clientKey: string, spell: SpellPickerResult | null) {
    if (!spell) {
      updateBaseRule(clientKey, { spell_id: 0, spell_name: "", spell_kind: "canonical" });
      return;
    }
    updateBaseRule(clientKey, {
      spell_kind: spell.kind,
      spell_id: spell.id,
      spell_name: spell.name,
    });
  }

  function setLtpSpell(clientKey: string, spell: SpellPickerResult | null) {
    if (!spell) {
      updateLtpRule(clientKey, { spell_id: 0, spell_name: "", spell_kind: "canonical" });
      return;
    }
    updateLtpRule(clientKey, {
      spell_kind: spell.kind,
      spell_id: spell.id,
      spell_name: spell.name,
    });
  }

  function updateBaseFrequency(clientKey: string, frequency: SpellFrequencyInput | null) {
    updateBaseRule(clientKey, { frequency });
  }

  function updateLtpFrequency(clientKey: string, frequency: SpellFrequencyInput | null) {
    updateLtpRule(clientKey, { frequency });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-400">
        Define martial abilities by level. Use source types for base grants, pick-one groups, and
        optional archetypes.
      </p>

      <section className="border border-neutral-800 rounded-lg p-4 space-y-3 bg-neutral-900/30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-semibold">Look the Part</h3>
            <p className="text-xs text-neutral-500 mt-1">
              When a player enables Look the Part on a build, these abilities are added from the
              class catalog (in addition to base abilities up to build level).
            </p>
          </div>
          <SegmentedToggle
            name="Look the Part"
            value={lookThePartIncluded ? "included" : "none"}
            options={[
              { value: "none", label: "Not included" },
              { value: "included", label: "Included" },
            ]}
            onChange={handleLookThePartChange}
          />
        </div>

        {lookThePartIncluded ? (
          <div className="space-y-3 pt-2 border-t border-neutral-800">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-neutral-300">Look the Part abilities</p>
              <button
                type="button"
                onClick={addLtpRule}
                className="text-sm px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded"
              >
                + Add LtP ability
              </button>
            </div>
            {ltpRules.length === 0 ? (
              <p className="text-xs text-amber-400/90">
                Add at least one Look the Part ability, or set Look the Part to Not included.
              </p>
            ) : null}
            {ltpRules.map((rule) => (
              <div
                key={rule.clientKey}
                className="border border-neutral-700 rounded p-3 space-y-3 bg-neutral-900/40"
              >
                <div className="grid sm:grid-cols-2 gap-3">
                  <SpellPicker
                    label="Ability"
                    value={
                      rule.spell_id
                        ? {
                            kind: rule.spell_kind,
                            id: rule.spell_id,
                            name: rule.spell_name ?? `#${rule.spell_id}`,
                            type: null,
                            level: rule.spell_level,
                          }
                        : null
                    }
                    onChange={(s) => setLtpSpell(rule.clientKey, s)}
                  />
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Grant at level</label>
                    <select
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded"
                      value={rule.spell_level}
                      onChange={(e) =>
                        updateLtpRule(rule.clientKey, { spell_level: Number(e.target.value) })
                      }
                    >
                      {[1, 2, 3, 4, 5, 6].map((lvl) => (
                        <option key={lvl} value={lvl}>
                          Level {lvl}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-neutral-300">
                  <input
                    type="checkbox"
                    checked={rule.restricted}
                    onChange={(e) =>
                      updateLtpRule(rule.clientKey, { restricted: e.target.checked })
                    }
                  />
                  Restricted
                </label>
                <AbilityFrequencyEditor
                  compact
                  value={rule.frequency}
                  onChange={(frequency) => updateLtpFrequency(rule.clientKey, frequency)}
                />
                <button
                  type="button"
                  onClick={() => removeLtpRule(rule.clientKey)}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {[1, 2, 3, 4, 5, 6].map((level) => {
        const levelRules = baseRules.filter((r) => r.spell_level === level);
        return (
          <section key={level} className="border border-neutral-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">Level {level}</h3>
              <button
                type="button"
                onClick={() => addBaseRule(level)}
                className="text-sm px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded"
              >
                + Add ability
              </button>
            </div>
            {levelRules.length === 0 ? (
              <p className="text-xs text-neutral-500">No abilities at this level.</p>
            ) : null}
            {levelRules.map((rule) => (
              <div
                key={rule.clientKey}
                className="border border-neutral-700 rounded p-3 space-y-3 bg-neutral-900/40"
              >
                <div className="grid sm:grid-cols-2 gap-3">
                  <SpellPicker
                    value={
                      rule.spell_id
                        ? {
                            kind: rule.spell_kind,
                            id: rule.spell_id,
                            name: rule.spell_name ?? `#${rule.spell_id}`,
                            type: null,
                            level: rule.spell_level,
                          }
                        : null
                    }
                    onChange={(s) => setBaseSpell(rule.clientKey, s)}
                  />
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Source type</label>
                    <select
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded"
                      value={rule.source_type}
                      onChange={(e) => {
                        const source_type = e.target.value;
                        updateBaseRule(rule.clientKey, {
                          source_type,
                          option_group:
                            ["pick_one", "pick_two_of_three", "optional_pick_one"].includes(
                              source_type
                            )
                              ? rule.option_group
                              : null,
                        });
                      }}
                    >
                      {CORE_MARTIAL_SOURCE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-neutral-300">
                  <input
                    type="checkbox"
                    checked={rule.restricted}
                    onChange={(e) =>
                      updateBaseRule(rule.clientKey, { restricted: e.target.checked })
                    }
                  />
                  Restricted
                </label>
                <AbilityFrequencyEditor
                  compact
                  value={rule.frequency}
                  onChange={(frequency) => updateBaseFrequency(rule.clientKey, frequency)}
                />
                <button
                  type="button"
                  onClick={() => removeBaseRule(rule.clientKey)}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
