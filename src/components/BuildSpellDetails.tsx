"use client";

import { useMemo, useState } from "react";
import type { BuildSpellSelectionRow, SpellRow } from "@/lib/spellbook/types";
import {
  buildSelectedSpellNameSet,
  computeDisplayRuleOverrides,
  evaluateSpellRules,
} from "@/lib/spellbook/rules";
import { findSpellForSelection } from "@/lib/spellbook/selection";
import { isMartialClass } from "@/lib/spellbook/martial";
import { catalogRuleKey } from "@/lib/spellbook/selection";
import { getPickOneGroups } from "@/lib/spellbook/martial";

type Props = {
  selections: BuildSpellSelectionRow[];
  spells: SpellRow[];
  className: string;
  lookThePart: boolean;
};

export default function BuildSpellDetails({ selections, spells, className, lookThePart }: Props) {
  const [showTypeSchool, setShowTypeSchool] = useState(false);
  const [showIncantation, setShowIncantation] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [showRange, setShowRange] = useState(false);

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
  const { lookThePartSelections, groupedSelections } = useMemo(() => {
    const showLtpSection = isMartialClass(className) && lookThePart;
    const ltpRows: BuildSpellSelectionRow[] = [];
    const byLevel = new Map<number, BuildSpellSelectionRow[]>();
    for (const selection of selections) {
      const spell = findSpellForSelection(spells, selection);
      const isLtpSpell = Boolean(
        spell && (spell.is_look_the_part || spell.source_type === "look_the_part")
      );
      if (showLtpSection && isLtpSpell) {
        ltpRows.push(selection);
        continue;
      }
      const level = selection.spell_level;
      if (!byLevel.has(level)) byLevel.set(level, []);
      byLevel.get(level)!.push(selection);
    }
    return {
      lookThePartSelections: ltpRows,
      groupedSelections: [...byLevel.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([level, rows]) => ({ level, rows })),
    };
  }, [selections, spells, className, lookThePart]);
  const unresolvedPickOneByLevel = useMemo(() => {
    const selectedRuleIds = new Set<number>();
    for (const selection of selections) {
      if (!selection.selection_group?.startsWith("csr:") || selection.purchased <= 0) continue;
      const rid = Number(selection.selection_group.slice(4));
      if (Number.isFinite(rid)) selectedRuleIds.add(rid);
    }
    const groups = getPickOneGroups(spells, className, selectedRuleIds);
    const unresolved = groups.filter((g) => {
      if (!g.requiredForMartial) return false;
      return !g.options.some(
        (opt) => {
          if (opt.catalog_rule_id == null) return false;
          const key = catalogRuleKey(opt.catalog_rule_id);
          return selections.some((s) => s.selection_group === key && s.purchased > 0);
        }
      );
    });
    const byLevel = new Map<number, typeof unresolved>();
    for (const group of unresolved) {
      if (!byLevel.has(group.level)) byLevel.set(group.level, []);
      byLevel.get(group.level)!.push(group);
    }
    return byLevel;
  }, [selections, spells, className]);
  const levelSections = useMemo(() => {
    const byLevel = new Map<number, BuildSpellSelectionRow[]>();
    for (const group of groupedSelections) {
      byLevel.set(group.level, group.rows);
    }
    for (const level of unresolvedPickOneByLevel.keys()) {
      if (!byLevel.has(level)) byLevel.set(level, []);
    }
    return [...byLevel.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([level, rows]) => ({ level, rows }));
  }, [groupedSelections, unresolvedPickOneByLevel]);

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

      {levelSections.length === 0 && lookThePartSelections.length === 0 ? (
        <div className="border border-neutral-800 rounded-lg p-6 text-neutral-400">
          No spell selections saved for this build yet.
        </div>
      ) : (
        <div className="space-y-4">
          {lookThePartSelections.length > 0 ? (
            <section className="border border-neutral-800 rounded-lg overflow-hidden">
              <h3 className="px-4 py-2 bg-neutral-900 border-b border-neutral-800 font-semibold">Look the Part</h3>
              <table className="w-full text-left border-collapse">
                <tbody>
                  {lookThePartSelections.map((selection) => {
                    const spell = findSpellForSelection(spells, selection);
                    const evaluated = spell
                      ? evaluateSpellRules(spell, selectedSpellNames)
                      : { restricted: false, reason: null, adjustedCost: 0 };
                    const display = spell
                      ? computeDisplayRuleOverrides(spell, selectedSpellNames, selection.purchased)
                      : { frequency: null, range: null };
                    return (
                      <tr key={selection.id}>
                        <td className="pl-8 pr-4 py-2 border-b border-neutral-800">
                          <p className="font-medium">
                            {selection.purchased}x {spell?.name ?? `Spell #${selection.spell_id}`}
                          </p>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          ) : null}
          {levelSections.map(({ level, rows }) => (
            <section key={level} className="border border-neutral-800 rounded-lg overflow-hidden">
              <h3 className="px-4 py-2 bg-neutral-900 border-b border-neutral-800 font-semibold">Level {level}</h3>
              <table className="w-full text-left border-collapse">
                <tbody>
                  {(unresolvedPickOneByLevel.get(level) ?? []).map((group, idx) => (
                    <tr key={`warn-${level}-${idx}`}>
                      <td className="pl-8 pr-4 py-2 border-b border-neutral-800">
                        <p className="font-medium text-amber-300">⚠️ Pick one in edit mode</p>
                        {group.options.map((opt) => (
                          <p key={opt.catalog_rule_id ?? opt.name} className="text-sm text-neutral-300 mt-1">
                            1x {opt.name}
                          </p>
                        ))}
                      </td>
                    </tr>
                  ))}
                  {rows.map((selection) => {
                    const spell = findSpellForSelection(spells, selection);
                    const evaluated = spell
                      ? evaluateSpellRules(spell, selectedSpellNames)
                      : { restricted: false, reason: null, adjustedCost: 0 };
                    const display = spell
                      ? computeDisplayRuleOverrides(spell, selectedSpellNames, selection.purchased)
                      : { frequency: null, range: null };
                    return (
                      <tr key={selection.id}>
                        <td className="pl-8 pr-4 py-2 border-b border-neutral-800">
                          <p className="font-medium">
                            {selection.purchased}x {spell?.name ?? `Spell #${selection.spell_id}`}
                          </p>
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
