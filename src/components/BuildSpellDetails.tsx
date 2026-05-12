"use client";

import { useMemo, useState, type ReactElement } from "react";
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
import AutoQuerySelect from "@/components/AutoQuerySelect";

export type BuildSpellDisplayMode = "level" | "type" | "school";

type Props = {
  selections: BuildSpellSelectionRow[];
  spells: SpellRow[];
  className: string;
  lookThePart: boolean;
  display: BuildSpellDisplayMode;
};

export default function BuildSpellDetails({
  selections,
  spells,
  className,
  lookThePart,
  display,
}: Props) {
  const [showTypeSchool, setShowTypeSchool] = useState(false);
  const [showIncantation, setShowIncantation] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [showRange, setShowRange] = useState(false);
  /** Keys in the set = section body is collapsed (matches edit-build: start expanded). */
  const [collapsedKeys, setCollapsedKeys] = useState(() => new Set<string>());

  function toggleSectionCollapse(key: string) {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function displayNameWithTypeTag(spell: SpellRow | null | undefined, fallbackName: string, purchased: number) {
    const type = spell?.type ?? null;
    const isArchetype = type === "Archetype";
    const isTrait = type === "Trait";
    const tag = isArchetype ? "Archetype" : isTrait ? "Trait" : null;
    const name = spell?.name ?? fallbackName;
    if (tag) return `${name} - (${tag})`;
    return `${purchased}x ${name}`;
  }

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

  const hasUnresolvedPickOne = useMemo(() => {
    for (const arr of unresolvedPickOneByLevel.values()) {
      if (arr.length > 0) return true;
    }
    return false;
  }, [unresolvedPickOneByLevel]);

  const groupedByAttribute = useMemo(() => {
    if (display === "level") return [];
    const showLtpSection = isMartialClass(className) && lookThePart;
    const map = new Map<string, BuildSpellSelectionRow[]>();
    for (const selection of selections) {
      const spell = findSpellForSelection(spells, selection);
      const isLtpSpell = Boolean(
        spell && (spell.is_look_the_part || spell.source_type === "look_the_part")
      );
      if (showLtpSection && isLtpSpell) continue;
      const key =
        display === "type" ? (spell?.type ?? "—") : (spell?.school ?? "—");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(selection);
    }
    for (const rows of map.values()) {
      rows.sort((a, b) => {
        if (a.spell_level !== b.spell_level) return a.spell_level - b.spell_level;
        const na = findSpellForSelection(spells, a)?.name ?? "";
        const nb = findSpellForSelection(spells, b)?.name ?? "";
        return na.localeCompare(nb);
      });
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([title, rows]) => ({ title, rows }));
  }, [display, selections, spells, className, lookThePart]);

  const showEmptyMessage =
    lookThePartSelections.length === 0 &&
    (display === "level"
      ? levelSections.length === 0
      : !hasUnresolvedPickOne && groupedByAttribute.every((s) => s.rows.length === 0));

  function renderSelectionRow(selection: BuildSpellSelectionRow) {
    const spell = findSpellForSelection(spells, selection);
    const evaluated = spell
      ? evaluateSpellRules(spell, selectedSpellNames)
      : { restricted: false, reason: null, adjustedCost: 0 };
    const ruleDisplay = spell
      ? computeDisplayRuleOverrides(spell, selectedSpellNames, selection.purchased)
      : { frequency: null, range: null };
    return (
      <tr key={selection.id}>
        <td className="pl-8 pr-4 py-2 border-b border-neutral-800">
          <p className="font-medium">
            {displayNameWithTypeTag(spell, `Spell #${selection.spell_id}`, selection.purchased)}
          </p>
          <p className="text-xs text-neutral-400">
            {showTypeSchool && spell?.type ? `${spell.type}` : ""}
            {showTypeSchool && spell?.school ? ` (${spell.school})` : ""}
            {showRange && ruleDisplay.range ? ` ${ruleDisplay.range}` : ""}
          </p>
          {ruleDisplay.frequency ? (
            <p className="text-xs text-neutral-500 mt-1">{ruleDisplay.frequency}</p>
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
  }

  function renderLookThePartRows() {
    return lookThePartSelections.map((selection) => {
      const spell = findSpellForSelection(spells, selection);
      const evaluated = spell
        ? evaluateSpellRules(spell, selectedSpellNames)
        : { restricted: false, reason: null, adjustedCost: 0 };
      const ruleDisplay = spell
        ? computeDisplayRuleOverrides(spell, selectedSpellNames, selection.purchased)
        : { frequency: null, range: null };
      return (
        <tr key={selection.id}>
          <td className="pl-8 pr-4 py-2 border-b border-neutral-800">
            <p className="font-medium">
              {displayNameWithTypeTag(spell, `Spell #${selection.spell_id}`, selection.purchased)}
            </p>
            <p className="text-xs text-neutral-400">
              {showTypeSchool && spell?.type ? `${spell.type}` : ""}
              {showTypeSchool && spell?.school ? ` (${spell.school})` : ""}
              {showRange && ruleDisplay.range ? ` ${ruleDisplay.range}` : ""}
            </p>
            {ruleDisplay.frequency ? (
              <p className="text-xs text-neutral-500 mt-1">{ruleDisplay.frequency}</p>
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
    });
  }

  function renderUnresolvedRowsForLevel(level: number) {
    return (unresolvedPickOneByLevel.get(level) ?? []).map((group, idx) => (
      <tr key={`warn-${level}-${idx}`}>
        <td className="pl-8 pr-4 py-2 border-b border-neutral-800">
          <p className="font-medium text-amber-300">⚠️ Pick one in edit mode</p>
          {group.options.map((opt) => (
            <p key={opt.catalog_rule_id ?? opt.name} className="text-sm text-neutral-300 mt-1">
              {displayNameWithTypeTag(opt, opt.name, 1)}
            </p>
          ))}
        </td>
      </tr>
    ));
  }

  function renderAllUnresolvedPickOneRows() {
    const rows: ReactElement[] = [];
    for (const [level, groups] of [...unresolvedPickOneByLevel.entries()].sort((a, b) => a[0] - b[0])) {
      for (let idx = 0; idx < groups.length; idx++) {
        const group = groups[idx];
        rows.push(
          <tr key={`warn-alt-${level}-${idx}`}>
            <td className="pl-8 pr-4 py-2 border-b border-neutral-800">
              <p className="font-medium text-amber-300">
                ⚠️ Pick one in edit mode (level {level})
              </p>
              {group.options.map((opt) => (
                <p key={opt.catalog_rule_id ?? opt.name} className="text-sm text-neutral-300 mt-1">
                  {displayNameWithTypeTag(opt, opt.name, 1)}
                </p>
              ))}
            </td>
          </tr>
        );
      }
    }
    return rows;
  }

  return (
    <section className="space-y-4">
      <div className="rounded border border-neutral-800 p-3 bg-neutral-900/40">
        <div className="flex flex-wrap items-end justify-between gap-4">
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
          <AutoQuerySelect
            name="display"
            label="Display"
            value={display}
            clearValue="level"
            options={[
              { value: "level", label: "Level" },
              { value: "type", label: "Type" },
              { value: "school", label: "School" },
            ]}
          />
        </div>
      </div>

      {showEmptyMessage ? (
        <div className="border border-neutral-800 rounded-lg p-6 text-neutral-400">
          No spell selections saved for this build yet.
        </div>
      ) : (
        <div className="space-y-4">
          {lookThePartSelections.length > 0 ? (
            <section className="border border-neutral-800 rounded-lg p-3 sm:p-4">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 text-left rounded-md px-1 py-2 -mx-1 hover:bg-neutral-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                onClick={() => toggleSectionCollapse("ltp")}
                aria-expanded={!collapsedKeys.has("ltp")}
              >
                <h3 className="text-lg font-semibold">Look the Part</h3>
                <span className="shrink-0 text-neutral-500 text-sm" aria-hidden>
                  {collapsedKeys.has("ltp") ? "▶" : "▼"}
                </span>
              </button>
              {!collapsedKeys.has("ltp") ? (
                <div className="overflow-x-auto">
                <table className="mt-2 w-full text-left border-collapse">
                  <tbody>{renderLookThePartRows()}</tbody>
                </table>
                </div>
              ) : null}
            </section>
          ) : null}

          {display === "level" ? (
            <>
              {levelSections.map(({ level, rows }) => {
                const sectionKey = `level-${level}`;
                const collapsed = collapsedKeys.has(sectionKey);
                return (
                  <section key={level} className="border border-neutral-800 rounded-lg p-3 sm:p-4">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 text-left rounded-md px-1 py-2 -mx-1 hover:bg-neutral-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      onClick={() => toggleSectionCollapse(sectionKey)}
                      aria-expanded={!collapsed}
                    >
                      <h3 className="text-lg font-semibold">Level {level}</h3>
                      <span className="shrink-0 text-neutral-500 text-sm" aria-hidden>
                        {collapsed ? "▶" : "▼"}
                      </span>
                    </button>
                    {!collapsed ? (
                      <div className="overflow-x-auto">
                      <table className="mt-2 w-full text-left border-collapse">
                        <tbody>
                          {renderUnresolvedRowsForLevel(level)}
                          {rows.map((selection) => renderSelectionRow(selection))}
                        </tbody>
                      </table>
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </>
          ) : (
            <>
              {hasUnresolvedPickOne ? (
                <section className="border border-neutral-800 rounded-lg p-3 sm:p-4">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 text-left rounded-md px-1 py-2 -mx-1 hover:bg-neutral-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    onClick={() => toggleSectionCollapse("martial-unresolved")}
                    aria-expanded={!collapsedKeys.has("martial-unresolved")}
                  >
                    <h3 className="text-lg font-semibold text-amber-200">Required Martial Picks</h3>
                    <span className="shrink-0 text-neutral-500 text-sm" aria-hidden>
                      {collapsedKeys.has("martial-unresolved") ? "▶" : "▼"}
                    </span>
                  </button>
                  {!collapsedKeys.has("martial-unresolved") ? (
                    <div className="overflow-x-auto">
                    <table className="mt-2 w-full text-left border-collapse">
                      <tbody>{renderAllUnresolvedPickOneRows()}</tbody>
                    </table>
                    </div>
                  ) : null}
                </section>
              ) : null}
              {groupedByAttribute.map(({ title, rows }) => {
                const sectionKey = `attr-${display}-${title}`;
                const collapsed = collapsedKeys.has(sectionKey);
                return (
                  <section key={title} className="border border-neutral-800 rounded-lg p-3 sm:p-4">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 text-left rounded-md px-1 py-2 -mx-1 hover:bg-neutral-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      onClick={() => toggleSectionCollapse(sectionKey)}
                      aria-expanded={!collapsed}
                    >
                      <h3 className="text-lg font-semibold">{title}</h3>
                      <span className="shrink-0 text-neutral-500 text-sm" aria-hidden>
                        {collapsed ? "▶" : "▼"}
                      </span>
                    </button>
                    {!collapsed ? (
                      <div className="overflow-x-auto">
                      <table className="mt-2 w-full text-left border-collapse">
                        <tbody>{rows.map((selection) => renderSelectionRow(selection))}</tbody>
                      </table>
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </>
          )}
        </div>
      )}
    </section>
  );
}
