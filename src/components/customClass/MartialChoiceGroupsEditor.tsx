"use client";

import { PICK_SOURCE_TYPES, type WizardRuleDraft } from "@/lib/customClass/types";

type Props = {
  rules: WizardRuleDraft[];
  onChange: (rules: WizardRuleDraft[]) => void;
};

export default function MartialChoiceGroupsEditor({ rules, onChange }: Props) {
  const pickRules = rules.filter((r) =>
    (PICK_SOURCE_TYPES as readonly string[]).includes(r.source_type)
  );

  function setGroup(clientKey: string, option_group: string) {
    onChange(
      rules.map((r) =>
        r.clientKey === clientKey ? { ...r, option_group: option_group.trim() || null } : r
      )
    );
  }

  if (pickRules.length === 0) {
    return (
      <p className="text-sm text-neutral-400">
        No pick-one or pick-two abilities defined. Skip this step or add pick-type abilities on the
        previous tab.
      </p>
    );
  }

  const grouped = new Map<string, WizardRuleDraft[]>();
  for (const rule of pickRules) {
    const key = rule.option_group?.trim() || "(ungrouped)";
    const list = grouped.get(key) ?? [];
    list.push(rule);
    grouped.set(key, list);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-400">
        Assign a shared group name to abilities that form a pick-one or pick-two-of-three cluster.
        Pick-two groups need exactly 3 options; pick-one groups need at least 2.
      </p>
      {pickRules.map((rule) => (
        <div key={rule.clientKey} className="border border-neutral-800 rounded p-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{rule.spell_name || `Spell #${rule.spell_id}`}</p>
            <p className="text-xs text-neutral-500">
              Level {rule.spell_level} · {rule.source_type}
            </p>
          </div>
          <div className="sm:w-64">
            <label className="block text-xs text-neutral-500 mb-1">Option group</label>
            <input
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm"
              value={rule.option_group ?? ""}
              onChange={(e) => setGroup(rule.clientKey, e.target.value)}
              placeholder="e.g. lvl6:archetype"
            />
          </div>
        </div>
      ))}
      <div className="border border-neutral-800 rounded p-3 bg-neutral-900/30">
        <p className="text-sm font-medium mb-2">Group summary</p>
        <ul className="text-xs text-neutral-400 space-y-1">
          {[...grouped.entries()].map(([name, members]) => (
            <li key={name}>
              {name}: {members.length} option{members.length === 1 ? "" : "s"} ({members[0]?.source_type})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
