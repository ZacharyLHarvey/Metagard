"use client";

import AbilityFrequencyEditor from "@/components/customClass/AbilityFrequencyEditor";
import type { SpellFrequencyInput, WizardRuleDraft } from "@/lib/customClass/types";
import SpellPicker, { type SpellPickerResult } from "@/components/customClass/SpellPicker";

function newClientKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type Props = {
  rules: WizardRuleDraft[];
  onChange: (rules: WizardRuleDraft[]) => void;
};

export default function CasterAbilityEditor({ rules, onChange }: Props) {
  function addRule(level: number) {
    onChange([
      ...rules,
      {
        clientKey: newClientKey(),
        spell_kind: "canonical",
        spell_id: 0,
        spell_name: "",
        spell_level: level,
        cost: 1,
        max_count: null,
        frequency: null,
        restricted: false,
        source_type: "level_spell",
        option_group: null,
        is_look_the_part: false,
      },
    ]);
  }

  function updateRule(clientKey: string, patch: Partial<WizardRuleDraft>) {
    onChange(rules.map((r) => (r.clientKey === clientKey ? { ...r, ...patch } : r)));
  }

  function removeRule(clientKey: string) {
    onChange(rules.filter((r) => r.clientKey !== clientKey));
  }

  function setSpell(clientKey: string, spell: SpellPickerResult | null) {
    if (!spell) {
      updateRule(clientKey, { spell_id: 0, spell_name: "", spell_kind: "canonical" });
      return;
    }
    updateRule(clientKey, {
      spell_kind: spell.kind,
      spell_id: spell.id,
      spell_name: spell.name,
    });
  }

  function updateFrequency(clientKey: string, frequency: SpellFrequencyInput | null) {
    updateRule(clientKey, { frequency });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-400">
        Add spells available at each circle with point costs. Caster builds use the standard 5×level
        cascade budget when players create builds from this class.
      </p>
      {[1, 2, 3, 4, 5, 6].map((level) => {
        const levelRules = rules.filter((r) => r.spell_level === level);
        return (
          <section key={level} className="border border-neutral-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">Circle {level}</h3>
              <button
                type="button"
                onClick={() => addRule(level)}
                className="text-sm px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded"
              >
                + Add spell
              </button>
            </div>
            {levelRules.length === 0 ? (
              <p className="text-xs text-neutral-500">No spells at this circle.</p>
            ) : null}
            {levelRules.map((rule) => (
              <div key={rule.clientKey} className="border border-neutral-700 rounded p-3 space-y-3 bg-neutral-900/40">
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
                  onChange={(s) => setSpell(rule.clientKey, s)}
                />
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Cost</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded"
                      value={rule.cost}
                      onChange={(e) => updateRule(rule.clientKey, { cost: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Max count</label>
                    <input
                      type="number"
                      min={0}
                      className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded"
                      value={rule.max_count ?? ""}
                      onChange={(e) =>
                        updateRule(rule.clientKey, {
                          max_count: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      placeholder="Unlimited"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm text-neutral-300 pb-2">
                      <input
                        type="checkbox"
                        checked={rule.restricted}
                        onChange={(e) => updateRule(rule.clientKey, { restricted: e.target.checked })}
                      />
                      Restricted
                    </label>
                  </div>
                </div>
                <AbilityFrequencyEditor
                  value={rule.frequency}
                  onChange={(frequency) => updateFrequency(rule.clientKey, frequency)}
                />
                <button
                  type="button"
                  onClick={() => removeRule(rule.clientKey)}
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
