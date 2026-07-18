"use client";

import { useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";
import type { BuildSpellSelectionRow, SpellRow } from "@/lib/spellbook/types";
import {
  buildPurchasedCountBySpellNameFromSelections,
  buildSelectedSpellNameSet,
  applyDisplayRuleToSpell,
  computeDisplayRuleOverrides,
} from "@/lib/spellbook/rules";
import { catalogRuleKey, findSpellForSelection, selectionKeyFromRow } from "@/lib/spellbook/selection";
import {
  getPickOneGroups,
  getPickTwoOfThreeGroups,
  ARCHER_LTP_SPECIALTY_PICK_ONE_GROUP_KEY,
  isPickOneGroupFullyBlockedByArchetype,
} from "@/lib/spellbook/martial";
import {
  buildExperiencedChargeSuffixByTargetKey,
} from "@/lib/spellbook/experienced";
import { mergeViewDisplaySpellSelectionRows, partitionViewBuildSpellDisplayRows } from "@/lib/spellbook/viewBuildSpellSelections";
import AutoQuerySelect from "@/components/AutoQuerySelect";
import SpellDetailModal from "@/components/spellbook/SpellDetailModal";
import TipsAlert from "@/components/spellbook/TipsAlert";

export type BuildSpellDisplayMode = "level" | "type" | "school";

/** Long-press (ms) to open spell detail modal. */
const LONG_PRESS_MS = 1000;

function SpellRowTouchCell({
  spell,
  className,
  onOpenDetail,
  enabled = true,
  children,
}: {
  spell: SpellRow | undefined;
  className?: string;
  onOpenDetail: (s: SpellRow) => void;
  enabled?: boolean;
  children: ReactNode;
}) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = () => {
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  if (!spell || !enabled) {
    return <td className={className}>{children}</td>;
  }

  return (
    <td
      className={className}
      onMouseDown={() => {
        clearTimer();
        timeoutRef.current = setTimeout(() => onOpenDetail(spell), LONG_PRESS_MS);
      }}
      onMouseUp={clearTimer}
      onMouseLeave={clearTimer}
      onTouchStart={() => {
        clearTimer();
        timeoutRef.current = setTimeout(() => onOpenDetail(spell), LONG_PRESS_MS);
      }}
      onTouchEnd={clearTimer}
    >
      {children}
    </td>
  );
}

/** Long-press inside a single table cell (e.g. unresolved pick-one option list). */
function SpellRowLongPressWrap({
  spell,
  onOpenDetail,
  enabled = true,
  children,
}: {
  spell: SpellRow;
  onOpenDetail: (s: SpellRow) => void;
  enabled?: boolean;
  children: ReactNode;
}) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = () => {
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  if (!enabled) {
    return <div className="mt-1">{children}</div>;
  }

  return (
    <div
      className="mt-1"
      onMouseDown={() => {
        clearTimer();
        timeoutRef.current = setTimeout(() => onOpenDetail(spell), LONG_PRESS_MS);
      }}
      onMouseUp={clearTimer}
      onMouseLeave={clearTimer}
      onTouchStart={() => {
        clearTimer();
        timeoutRef.current = setTimeout(() => onOpenDetail(spell), LONG_PRESS_MS);
      }}
      onTouchEnd={clearTimer}
    >
      {children}
    </div>
  );
}

type Props = {
  selections: BuildSpellSelectionRow[];
  spells: SpellRow[];
  /** View-only synthetic rows (e.g. archetype-granted spells not persisted on the build). */
  extraSelections?: BuildSpellSelectionRow[];
  className: string;
  lookThePart: boolean;
  display: BuildSpellDisplayMode;
  /** When false, hides the long-press hint banner (modal still works). Matches edit-build. */
  spellbookTipsEnabled?: boolean;
  /** When false, disables long-press (and all detail opening) on spell rows. */
  spellDetailLongPressEnabled?: boolean;
  /** Build spell circle cap for unresolved pick-two warnings (same as build level). */
  buildMaxLevel?: number;
  initialShowTypeSchool?: boolean;
  initialShowIncantation?: boolean;
  initialShowMaterials?: boolean;
  initialShowRange?: boolean;
};

export default function BuildSpellDetails({
  selections,
  spells,
  extraSelections = [],
  className,
  lookThePart,
  display,
  spellbookTipsEnabled = true,
  spellDetailLongPressEnabled = true,
  buildMaxLevel = 6,
  initialShowTypeSchool = false,
  initialShowIncantation = false,
  initialShowMaterials = false,
  initialShowRange = false,
}: Props) {
  const [selectedSpell, setSelectedSpell] = useState<SpellRow | null>(null);
  const [showTypeSchool, setShowTypeSchool] = useState(initialShowTypeSchool);
  const [showIncantation, setShowIncantation] = useState(initialShowIncantation);
  const [showMaterials, setShowMaterials] = useState(initialShowMaterials);
  const [showRange, setShowRange] = useState(initialShowRange);
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

  function displayNameWithTypeTag(
    spell: SpellRow | null | undefined,
    fallbackName: string,
    purchased: number,
    opts?: { isExperiencedTarget?: boolean; displayTag?: string | null }
  ) {
    const type = spell?.type ?? null;
    const name = spell?.name ?? fallbackName;
    const isArchetype = type === "Archetype";
    const isTrait = type === "Trait";
    const typeTag = isArchetype ? "Archetype" : isTrait ? "Trait" : null;
    if (typeTag) return `${name} - (${typeTag})`;
    if (opts?.isExperiencedTarget) return `${purchased}x ${name} - (Experienced)`;
    if (opts?.displayTag) return `${purchased}x ${name} - (${opts.displayTag})`;
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
  const ruleContext = useMemo(
    () => ({
      purchasedCountBySpellName: buildPurchasedCountBySpellNameFromSelections(selections, spells),
    }),
    [selections, spells]
  );
  const experiencedSuffixByTargetKey = useMemo(
    () => buildExperiencedChargeSuffixByTargetKey(selections, spells),
    [selections, spells]
  );
  const displaySelections = useMemo(
    () => mergeViewDisplaySpellSelectionRows(selections, extraSelections, spells),
    [selections, extraSelections, spells]
  );
  const { lookThePartSelections, mainRowsForSpellTables } = useMemo(() => {
    const { lookThePartRows, mainRows } = partitionViewBuildSpellDisplayRows(
      displaySelections,
      spells,
      { className, lookThePart, selectedSpellNames }
    );
    return {
      lookThePartSelections: lookThePartRows,
      mainRowsForSpellTables: mainRows,
    };
  }, [displaySelections, spells, className, lookThePart, selectedSpellNames]);
  const groupedSelections = useMemo(() => {
    const byLevel = new Map<number, BuildSpellSelectionRow[]>();
    for (const selection of mainRowsForSpellTables) {
      const level = selection.spell_level;
      if (!byLevel.has(level)) byLevel.set(level, []);
      byLevel.get(level)!.push(selection);
    }
    return [...byLevel.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([level, rows]) => ({ level, rows }));
  }, [mainRowsForSpellTables]);
  const unresolvedPickOneByLevel = useMemo(() => {
    const selectedRuleIds = new Set<number>();
    for (const selection of selections) {
      if (!selection.selection_group?.startsWith("csr:") || selection.purchased <= 0) continue;
      const rid = Number(selection.selection_group.slice(4));
      if (Number.isFinite(rid)) selectedRuleIds.add(rid);
    }
    let groups = getPickOneGroups(spells, className, selectedRuleIds);
    if (
      className === "Archer" &&
      (selectedSpellNames.has("Sniper") || selectedSpellNames.has("Artificer"))
    ) {
      groups = groups.filter((g) => g.groupKey !== ARCHER_LTP_SPECIALTY_PICK_ONE_GROUP_KEY);
    }
    const unresolved = groups.filter((g) => {
      if (!g.requiredForMartial) return false;
      if (isPickOneGroupFullyBlockedByArchetype(g, selectedSpellNames, ruleContext)) return false;
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
  }, [selections, spells, className, selectedSpellNames, ruleContext]);
  const hasUnresolvedPickOne = useMemo(() => {
    for (const arr of unresolvedPickOneByLevel.values()) {
      if (arr.length > 0) return true;
    }
    return false;
  }, [unresolvedPickOneByLevel]);
  const unresolvedPickTwoByLevel = useMemo(() => {
    const selectedRuleIds = new Set<number>();
    for (const selection of selections) {
      if (!selection.selection_group?.startsWith("csr:") || selection.purchased <= 0) continue;
      const rid = Number(selection.selection_group.slice(4));
      if (Number.isFinite(rid)) selectedRuleIds.add(rid);
    }
    const groups = getPickTwoOfThreeGroups(spells, className, selectedRuleIds);
    const unresolved = groups.filter((g) => {
      if (!g.requiredForMartial) return false;
      if (g.level > buildMaxLevel) return false;
      const count = g.options.filter((opt) => {
        const rid = opt.catalog_rule_id;
        if (rid == null) return false;
        return selections.some((s) => s.selection_group === catalogRuleKey(rid) && s.purchased > 0);
      }).length;
      return count < 2;
    });
    const byLevel = new Map<number, typeof unresolved>();
    for (const group of unresolved) {
      if (!byLevel.has(group.level)) byLevel.set(group.level, []);
      byLevel.get(group.level)!.push(group);
    }
    return byLevel;
  }, [selections, spells, className, buildMaxLevel]);
  const levelSections = useMemo(() => {
    const byLevel = new Map<number, BuildSpellSelectionRow[]>();
    for (const group of groupedSelections) {
      byLevel.set(group.level, group.rows);
    }
    for (const level of unresolvedPickOneByLevel.keys()) {
      if (!byLevel.has(level)) byLevel.set(level, []);
    }
    for (const level of unresolvedPickTwoByLevel.keys()) {
      if (!byLevel.has(level)) byLevel.set(level, []);
    }
    return [...byLevel.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([level, rows]) => ({ level, rows }))
      .filter(
        ({ level, rows }) =>
          rows.length > 0 ||
          (unresolvedPickOneByLevel.get(level)?.length ?? 0) > 0 ||
          (unresolvedPickTwoByLevel.get(level)?.length ?? 0) > 0
      );
  }, [groupedSelections, unresolvedPickOneByLevel, unresolvedPickTwoByLevel]);

  const hasUnresolvedPickTwo = useMemo(() => {
    for (const arr of unresolvedPickTwoByLevel.values()) {
      if (arr.length > 0) return true;
    }
    return false;
  }, [unresolvedPickTwoByLevel]);

  const groupedByAttribute = useMemo(() => {
    if (display === "level") return [];
    const map = new Map<string, BuildSpellSelectionRow[]>();
    for (const selection of mainRowsForSpellTables) {
      const spell = findSpellForSelection(spells, selection);
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
      .map(([title, rows]) => ({ title, rows }))
      .filter((s) => s.rows.length > 0);
  }, [display, mainRowsForSpellTables, spells]);

  const showEmptyMessage =
    lookThePartSelections.length === 0 &&
    (display === "level"
      ? levelSections.length === 0
      : !hasUnresolvedPickOne && !hasUnresolvedPickTwo && groupedByAttribute.length === 0);

  function renderSelectionRow(selection: BuildSpellSelectionRow) {
    const spell = findSpellForSelection(spells, selection);
    const rowKey = selectionKeyFromRow(selection);
    const expSuffix = experiencedSuffixByTargetKey.get(rowKey);
    const ruleDisplay = spell
      ? computeDisplayRuleOverrides(
          spell,
          selectedSpellNames,
          selection.purchased,
          className,
          expSuffix ? { experiencedChargeSuffix: expSuffix } : undefined
        )
      : { frequency: null, range: null, tag: null };
    const detailSpell = spell ? applyDisplayRuleToSpell(spell, ruleDisplay) : null;
    return (
      <tr key={rowKey}>
        <SpellRowTouchCell
          spell={detailSpell ?? spell}
          className="pl-8 pr-4 py-2 border-b border-neutral-800"
          onOpenDetail={setSelectedSpell}
          enabled={spellDetailLongPressEnabled}
        >
          <p className="font-medium">
            {displayNameWithTypeTag(spell, `Spell #${selection.spell_id}`, selection.purchased, {
              isExperiencedTarget: experiencedSuffixByTargetKey.has(rowKey),
              displayTag: ruleDisplay.tag,
            })}
          </p>
          <p className="text-xs text-neutral-400">
            {showTypeSchool && spell?.type ? `${spell.type}` : ""}
            {showTypeSchool && spell?.school ? ` (${spell.school})` : ""}
            {showRange && ruleDisplay.range ? ` (${ruleDisplay.range})` : ""}
          </p>
          {ruleDisplay.frequency ? (
            <p className="text-xs text-neutral-500 mt-1">{ruleDisplay.frequency}</p>
          ) : null}
          {showIncantation && spell?.incantation ? (
            <p className="text-xs text-neutral-500 whitespace-pre-wrap mt-1">{spell.incantation}</p>
          ) : null}
          {showMaterials && spell?.materials ? (
            <p className="text-xs text-neutral-500 mt-1">({spell.materials})</p>
          ) : null}
        </SpellRowTouchCell>
      </tr>
    );
  }

  function renderLookThePartRows() {
    return lookThePartSelections.map((selection) => {
      const spell = findSpellForSelection(spells, selection);
      const rowKey = selectionKeyFromRow(selection);
      const expSuffix = experiencedSuffixByTargetKey.get(rowKey);
      const ruleDisplay = spell
        ? computeDisplayRuleOverrides(
            spell,
            selectedSpellNames,
            selection.purchased,
            className,
            expSuffix ? { experiencedChargeSuffix: expSuffix } : undefined
          )
        : { frequency: null, range: null, tag: null };
      return (
        <tr key={rowKey}>
          <SpellRowTouchCell
            spell={spell}
            className="pl-8 pr-4 py-2 border-b border-neutral-800"
            onOpenDetail={setSelectedSpell}
            enabled={spellDetailLongPressEnabled}
          >
            <p className="font-medium">
              {displayNameWithTypeTag(spell, `Spell #${selection.spell_id}`, selection.purchased, {
                isExperiencedTarget: experiencedSuffixByTargetKey.has(rowKey),
                displayTag: ruleDisplay.tag,
              })}
            </p>
            <p className="text-xs text-neutral-400">
              {showTypeSchool && spell?.type ? `${spell.type}` : ""}
              {showTypeSchool && spell?.school ? ` (${spell.school})` : ""}
              {showRange && ruleDisplay.range ? ` (${ruleDisplay.range})` : ""}
            </p>
            {ruleDisplay.frequency ? (
              <p className="text-xs text-neutral-500 mt-1">{ruleDisplay.frequency}</p>
            ) : null}
            {showIncantation && spell?.incantation ? (
              <p className="text-xs text-neutral-500 whitespace-pre-wrap mt-1">{spell.incantation}</p>
            ) : null}
            {showMaterials && spell?.materials ? (
              <p className="text-xs text-neutral-500 mt-1">({spell.materials})</p>
            ) : null}
          </SpellRowTouchCell>
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
            <SpellRowLongPressWrap
              key={opt.catalog_rule_id ?? opt.name}
              spell={opt}
              onOpenDetail={setSelectedSpell}
              enabled={spellDetailLongPressEnabled}
            >
              <p className="text-sm text-neutral-300">{displayNameWithTypeTag(opt, opt.name, 1)}</p>
            </SpellRowLongPressWrap>
          ))}
        </td>
      </tr>
    ));
  }

  function renderUnresolvedPickTwoRowsForLevel(level: number) {
    return (unresolvedPickTwoByLevel.get(level) ?? []).map((group, idx) => (
      <tr key={`warn-p2-${level}-${idx}`}>
        <td className="pl-8 pr-4 py-2 border-b border-neutral-800">
          <p className="font-medium text-amber-300">⚠️ Pick two of three in edit mode</p>
          {group.options.map((opt) => (
            <SpellRowLongPressWrap
              key={opt.catalog_rule_id ?? opt.name}
              spell={opt}
              onOpenDetail={setSelectedSpell}
              enabled={spellDetailLongPressEnabled}
            >
              <p className="text-sm text-neutral-300">{displayNameWithTypeTag(opt, opt.name, 1)}</p>
            </SpellRowLongPressWrap>
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
                <SpellRowLongPressWrap
                  key={opt.catalog_rule_id ?? opt.name}
                  spell={opt}
                  onOpenDetail={setSelectedSpell}
                  enabled={spellDetailLongPressEnabled}
                >
                  <p className="text-sm text-neutral-300">{displayNameWithTypeTag(opt, opt.name, 1)}</p>
                </SpellRowLongPressWrap>
              ))}
            </td>
          </tr>
        );
      }
    }
    return rows;
  }

  function renderAllUnresolvedPickTwoRows() {
    const rows: ReactElement[] = [];
    for (const [level, groups] of [...unresolvedPickTwoByLevel.entries()].sort((a, b) => a[0] - b[0])) {
      for (let idx = 0; idx < groups.length; idx++) {
        const group = groups[idx];
        rows.push(
          <tr key={`warn-p2-alt-${level}-${idx}`}>
            <td className="pl-8 pr-4 py-2 border-b border-neutral-800">
              <p className="font-medium text-amber-300">
                ⚠️ Pick two of three in edit mode (level {level})
              </p>
              {group.options.map((opt) => (
                <SpellRowLongPressWrap
                  key={opt.catalog_rule_id ?? opt.name}
                  spell={opt}
                  onOpenDetail={setSelectedSpell}
                  enabled={spellDetailLongPressEnabled}
                >
                  <p className="text-sm text-neutral-300">{displayNameWithTypeTag(opt, opt.name, 1)}</p>
                </SpellRowLongPressWrap>
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
      <TipsAlert
        tipsEnabled={spellbookTipsEnabled}
        message="Long Press a Spell Row to View Detailed Spell Text, Restrictions, and Notes"
      />
      <SpellDetailModal spell={selectedSpell} onClose={() => setSelectedSpell(null)} />
      <div className="rounded border border-neutral-800 p-3 bg-neutral-900/40">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showTypeSchool} onChange={(e) => setShowTypeSchool(e.target.checked)} />
              Show Type/School
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showIncantation} onChange={(e) => setShowIncantation(e.target.checked)} />
              Show Incantation
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showMaterials} onChange={(e) => setShowMaterials(e.target.checked)} />
              Show Materials
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showRange} onChange={(e) => setShowRange(e.target.checked)} />
              Show Range
            </label>
          </div>
          <AutoQuerySelect
            name="display"
            label="Display"
            value={display}
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
                          {renderUnresolvedPickTwoRowsForLevel(level)}
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
              {hasUnresolvedPickOne || hasUnresolvedPickTwo ? (
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
                      <tbody>
                        {renderAllUnresolvedPickOneRows()}
                        {renderAllUnresolvedPickTwoRows()}
                      </tbody>
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
