"use client";

import { useMemo, useState } from "react";
import type { BuildSpellSelectionRow, SpellRow } from "@/lib/spellbook/types";
import {
  buildSelectedSpellNameSet,
  computeDisplayRuleOverrides,
  evaluateSpellRules,
} from "@/lib/spellbook/rules";

type Props = {
  selections: BuildSpellSelectionRow[];
  spells: SpellRow[];
};

export default function BuildSpellDetails({ selections, spells }: Props) {
  const [showTypeSchool, setShowTypeSchool] = useState(false);
  const [showIncantation, setShowIncantation] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [showRange, setShowRange] = useState(false);

  const spellById = useMemo(() => new Map(spells.map((s) => [s.id, s])), [spells]);
  const purchasedBySpellId = useMemo(() => {
    const map: Record<number, number> = {};
    for (const s of selections) {
      map[s.spell_id] = (map[s.spell_id] ?? 0) + s.purchased;
    }
    return map;
  }, [selections]);
  const selectedSpellNames = useMemo(
    () => buildSelectedSpellNameSet(purchasedBySpellId, spells),
    [purchasedBySpellId, spells]
  );

  return (
    <section className="space-y-4">
      <div className="rounded border border-neutral-800 p-3 bg-neutral-900/40">
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showTypeSchool} onChange={(e) => setShowTypeSchool(e.target.checked)} />
            show type/school
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showIncantation} onChange={(e) => setShowIncantation(e.target.checked)} />
            show incantation
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showMaterials} onChange={(e) => setShowMaterials(e.target.checked)} />
            show materials
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showRange} onChange={(e) => setShowRange(e.target.checked)} />
            show range
          </label>
        </div>
      </div>

      <div className="border border-neutral-800 rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-neutral-900">
            <tr>
              <th className="px-4 py-2 border-b border-neutral-800">Level</th>
              <th className="px-4 py-2 border-b border-neutral-800">Spell</th>
              <th className="px-4 py-2 border-b border-neutral-800">Purchased</th>
            </tr>
          </thead>
          <tbody>
            {selections.map((selection) => {
              const spell = spellById.get(selection.spell_id);
              const evaluated = spell
                ? evaluateSpellRules(spell, selectedSpellNames)
                : { restricted: false, reason: null, adjustedCost: 0 };
              const display = spell
                ? computeDisplayRuleOverrides(spell, selectedSpellNames, selection.purchased)
                : { frequency: null, range: null };
              return (
                <tr key={selection.id}>
                  <td className="px-4 py-2 border-b border-neutral-800 align-top">{selection.spell_level}</td>
                  <td className="px-4 py-2 border-b border-neutral-800">
                    <p className="font-medium">{spell?.name ?? `Spell #${selection.spell_id}`}</p>
                    <p className="text-xs text-neutral-400">
                      {showTypeSchool && spell?.type ? `${spell.type}` : ""}
                      {showTypeSchool && spell?.school ? ` (${spell.school})` : ""}
                      {showRange && display.range ? ` ${display.range}` : ""}
                    </p>
                    {display.frequency ? (
                      <p className="text-xs text-neutral-500 mt-1">{display.frequency}</p>
                    ) : null}
                    {evaluated.restricted && evaluated.reason ? (
                      <p className="text-xs text-red-300 mt-1">{evaluated.reason}</p>
                    ) : null}
                    {showIncantation && spell?.incantation ? (
                      <p className="text-xs text-neutral-500 whitespace-pre-wrap mt-1">{spell.incantation}</p>
                    ) : null}
                    {showMaterials && spell?.materials ? (
                      <p className="text-xs text-neutral-500 mt-1">({spell.materials})</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-2 border-b border-neutral-800 align-top">{selection.purchased}</td>
                </tr>
              );
            })}
            {selections.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-neutral-400">
                  No spell selections saved for this build yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
