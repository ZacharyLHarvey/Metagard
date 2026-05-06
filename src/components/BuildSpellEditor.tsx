"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BuildSpellSelectionRow, SpellRow } from "@/lib/spellbook/types";
import SpellDetailModal from "@/components/spellbook/SpellDetailModal";
import TipsAlert from "@/components/spellbook/TipsAlert";
import {
  buildSelectedSpellNameSet,
  computeDisplayRuleOverrides,
  evaluateSpellRules,
} from "@/lib/spellbook/rules";
import {
  casterCascadeBudgetHolds,
  isCasterClass,
  POINTS_PER_SPELL_LEVEL,
  remainingPointsForCircleAndAbove,
} from "@/lib/spellbook/casterBudget";
import {
  catalogRuleKey,
  findSpellForSelection,
  selectionKeyForCatalogSpell,
  selectionKeyFromRow,
} from "@/lib/spellbook/selection";

type Props = {
  buildId: number;
  className: string;
  maxLevel: number;
  /** Look the Part: casters get +1 point at the build’s highest spell circle. */
  lookThePart: boolean;
  spells: SpellRow[];
  initialSelections: BuildSpellSelectionRow[];
};

type Selection = {
  spell_id: number;
  spell_level: number;
  purchased: number;
  experienced: number;
  selection_group: string | null;
  chosen: boolean;
};

function purchasedBySpellIdFromMap(map: Record<string, Selection>) {
  const m: Record<number, number> = {};
  for (const sel of Object.values(map)) {
    m[sel.spell_id] = (m[sel.spell_id] ?? 0) + sel.purchased;
  }
  return m;
}

function pointsSpentForMap(map: Record<string, Selection>, spells: SpellRow[]) {
  const names = buildSelectedSpellNameSet(purchasedBySpellIdFromMap(map), spells);
  let sum = 0;
  for (const sel of Object.values(map)) {
    const spell = findSpellForSelection(spells, sel);
    if (!spell) continue;
    const ev = evaluateSpellRules(spell, names);
    sum += ev.adjustedCost * sel.purchased;
  }
  return sum;
}

function pointsSpentAtSpellLevel(map: Record<string, Selection>, spells: SpellRow[], spellLevel: number) {
  const names = buildSelectedSpellNameSet(purchasedBySpellIdFromMap(map), spells);
  let sum = 0;
  for (const sel of Object.values(map)) {
    if (sel.spell_level !== spellLevel) continue;
    const spell = findSpellForSelection(spells, sel);
    if (!spell) continue;
    const ev = evaluateSpellRules(spell, names);
    sum += ev.adjustedCost * sel.purchased;
  }
  return sum;
}

export default function BuildSpellEditor({
  buildId,
  className,
  maxLevel,
  lookThePart,
  spells,
  initialSelections,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedSpell, setSelectedSpell] = useState<SpellRow | null>(null);
  const [showTypeSchool, setShowTypeSchool] = useState(false);
  const [showIncantation, setShowIncantation] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [ruleWarning, setRuleWarning] = useState<string>("");
  const [collapsedLevels, setCollapsedLevels] = useState<Set<number>>(() => new Set());

  const [selectionMap, setSelectionMap] = useState<Record<string, Selection>>(() => {
    const base: Record<string, Selection> = {};
    for (const s of initialSelections) {
      base[selectionKeyFromRow(s)] = {
        spell_id: s.spell_id,
        spell_level: s.spell_level,
        purchased: s.purchased,
        experienced: s.experienced,
        selection_group: s.selection_group,
        chosen: s.chosen,
      };
    }
    return base;
  });

  const grouped = useMemo(() => {
    const byLevel: Record<number, SpellRow[]> = {};
    for (let i = 1; i <= maxLevel; i += 1) byLevel[i] = [];
    for (const spell of spells) {
      const level = spell.level ?? 1;
      if (level >= 1 && level <= maxLevel) {
        byLevel[level].push(spell);
      }
    }
    return byLevel;
  }, [maxLevel, spells]);

  const caster = isCasterClass(className);
  const casterLtpBonus = caster && lookThePart ? 1 : 0;
  const totalBudget = useMemo(
    () => maxLevel * POINTS_PER_SPELL_LEVEL + casterLtpBonus,
    [maxLevel, casterLtpBonus]
  );
  const pointsSpentBySpellLevel = useMemo(() => {
    const out: Record<number, number> = {};
    for (let L = 1; L <= maxLevel; L += 1) {
      out[L] = pointsSpentAtSpellLevel(selectionMap, spells, L);
    }
    return out;
  }, [selectionMap, spells, maxLevel]);
  const purchasedBySpellId = useMemo(() => purchasedBySpellIdFromMap(selectionMap), [selectionMap]);
  const pointsSpent = useMemo(
    () => pointsSpentForMap(selectionMap, spells),
    [selectionMap, spells]
  );
  const pointsRemaining = Math.max(totalBudget - pointsSpent, 0);
  const selectedSpellNames = useMemo(
    () => buildSelectedSpellNameSet(purchasedBySpellId, spells),
    [purchasedBySpellId, spells]
  );

  function increment(spell: SpellRow, level: number) {
    const evaluated = evaluateSpellRules(spell, selectedSpellNames);
    if (evaluated.restricted) {
      setRuleWarning(evaluated.reason ?? "Spell restricted by active archetype limitations.");
      return;
    }

    const key = selectionKeyForCatalogSpell(spell);
    const max = spell.max ?? 99;
    const group =
      spell.catalog_rule_id != null ? catalogRuleKey(spell.catalog_rule_id) : null;

    setSelectionMap((prev) => {
      const existing = prev[key];
      const purchased = Math.min((existing?.purchased ?? 0) + 1, max);
      const nextMap = {
        ...prev,
        [key]: {
          spell_id: spell.id,
          spell_level: level,
          purchased,
          experienced: existing?.experienced ?? 0,
          selection_group: existing?.selection_group ?? group,
          chosen: purchased > 0,
        },
      };
      const spentAfter = pointsSpentForMap(nextMap, spells);
      if (spentAfter > totalBudget) return prev;
      if (caster) {
        if (!casterCascadeBudgetHolds(nextMap, spells, maxLevel, casterLtpBonus)) return prev;
      } else {
        const spentThisLevelAfter = pointsSpentAtSpellLevel(nextMap, spells, level);
        if (spentThisLevelAfter > POINTS_PER_SPELL_LEVEL) return prev;
      }
      return nextMap;
    });
  }

  function decrement(spell: SpellRow, level: number) {
    const key = selectionKeyForCatalogSpell(spell);
    setSelectionMap((prev) => {
      const existing = prev[key];
      if (!existing) return prev;
      const purchased = Math.max(existing.purchased - 1, 0);
      if (purchased === 0) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return {
        ...prev,
        [key]: { ...existing, purchased },
      };
    });
  }

  async function saveSelections() {
    setSaving(true);
    setError("");
    const payload = Object.values(selectionMap);

    const response = await fetch(`/api/builds/${buildId}/spells`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selections: payload }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Failed to save selections");
      setSaving(false);
      return;
    }

    setSaving(false);
    router.push(`/builds/${buildId}`);
    router.refresh();
  }

  function startLongPress(spell: SpellRow) {
    const timeout = setTimeout(() => setSelectedSpell(spell), 450);
    return timeout;
  }

  return (
    <div className="space-y-6">
      <TipsAlert message="Long press a spell row to view detailed spell text, restrictions, and notes." />
      <SpellDetailModal spell={selectedSpell} onClose={() => setSelectedSpell(null)} />
      {ruleWarning ? (
        <div className="rounded border border-amber-800 bg-amber-950/30 p-3 text-sm text-amber-200">
          <div className="flex items-start justify-between gap-3">
            <p>{ruleWarning}</p>
            <button className="px-2 py-1 bg-amber-800 rounded" onClick={() => setRuleWarning("")}>
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
      <div className="rounded border border-neutral-800 p-3 bg-neutral-900/40">
        <p className="text-sm text-neutral-300">
          Points: <span className="font-semibold">{pointsSpent}</span> spent /{" "}
          <span className="font-semibold">{totalBudget}</span> total /{" "}
          <span className="font-semibold">{pointsRemaining}</span> remaining
        </p>
        {caster ? (
          <p className="mt-2 text-xs text-neutral-500">
            Caster: unused points from higher circles can be spent on lower-circle spells (up to {POINTS_PER_SPELL_LEVEL}{" "}
            pts per circle into the shared pool).
            {lookThePart ? (
              <>
                {" "}
                Look the Part adds +1 pt at circle {maxLevel} (total {totalBudget}).
              </>
            ) : null}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
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
        </div>
      </div>

      {Array.from({ length: maxLevel }, (_, idx) => idx + 1).map((level) => {
        const spentHere = pointsSpentBySpellLevel[level] ?? 0;
        const remainingHere = caster
          ? remainingPointsForCircleAndAbove(
              selectionMap,
              spells,
              maxLevel,
              level,
              casterLtpBonus
            )
          : Math.max(POINTS_PER_SPELL_LEVEL - spentHere, 0);
        const collapsed = collapsedLevels.has(level);
        return (
        <section key={level} className="border border-neutral-800 rounded-lg p-4">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 text-left rounded-md px-1 py-2 -mx-1 hover:bg-neutral-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            onClick={() =>
              setCollapsedLevels((prev) => {
                const next = new Set(prev);
                if (next.has(level)) next.delete(level);
                else next.add(level);
                return next;
              })
            }
            aria-expanded={!collapsed}
          >
            <h2 className="text-lg font-semibold">
              Level {level}
              <span className="ml-2 text-sm font-normal text-neutral-400 tabular-nums">
                {caster
                  ? `(${remainingHere} pt${remainingHere === 1 ? "" : "s"} left for circle ${level}+)`
                  : `(${remainingHere} pt${remainingHere === 1 ? "" : "s"} left at this level)`}
              </span>
            </h2>
            <span className="shrink-0 text-neutral-500 text-sm" aria-hidden>
              {collapsed ? "▶" : "▼"}
            </span>
          </button>
          {!collapsed ? (
          <div className="space-y-2 mt-2">
            {(grouped[level] ?? []).map((spell) => {
              const key = selectionKeyForCatalogSpell(spell);
              const purchased = selectionMap[key]?.purchased ?? 0;
              const evaluated = evaluateSpellRules(spell, selectedSpellNames);
              const display = computeDisplayRuleOverrides(spell, selectedSpellNames, purchased);
              let longPressTimeout: ReturnType<typeof setTimeout> | null = null;
              return (
                <div
                  key={key}
                  className={`flex items-center justify-between rounded border p-2 ${
                    evaluated.restricted ? "border-red-800 bg-red-950/20" : "border-neutral-800"
                  }`}
                  onMouseDown={() => {
                    longPressTimeout = startLongPress(spell);
                  }}
                  onMouseUp={() => {
                    if (longPressTimeout) clearTimeout(longPressTimeout);
                  }}
                  onMouseLeave={() => {
                    if (longPressTimeout) clearTimeout(longPressTimeout);
                  }}
                  onTouchStart={() => {
                    longPressTimeout = startLongPress(spell);
                  }}
                  onTouchEnd={() => {
                    if (longPressTimeout) clearTimeout(longPressTimeout);
                  }}
                >
                  <div>
                    <p className="font-medium">{spell.name}</p>
                    <p className="text-xs text-neutral-400">
                      cost {evaluated.adjustedCost}
                      {showTypeSchool && spell.type ? ` - ${spell.type}` : ""}
                      {showTypeSchool && spell.school ? ` (${spell.school})` : ""}
                    </p>
                    {display.frequency ? <p className="text-xs text-neutral-500 mt-1">{display.frequency}</p> : null}
                    {evaluated.restricted && evaluated.reason ? (
                      <p className="text-xs text-red-300 mt-1">{evaluated.reason}</p>
                    ) : null}
                    {showIncantation && spell.incantation ? (
                      <p className="text-xs text-neutral-500 whitespace-pre-wrap mt-1">{spell.incantation}</p>
                    ) : null}
                    {showMaterials && spell.materials ? (
                      <p className="text-xs text-neutral-500 mt-1">({spell.materials})</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => decrement(spell, level)}
                      className="px-2 py-1 bg-neutral-700 rounded"
                    >
                      -
                    </button>
                    <span className="w-8 text-center">{purchased}</span>
                    <button
                      onClick={() => increment(spell, level)}
                      disabled={evaluated.restricted}
                      className="px-2 py-1 bg-blue-600 rounded"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          ) : null}
        </section>
        );
      })}

      <div className="flex items-center gap-3">
        <button
          onClick={saveSelections}
          disabled={saving}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
        >
          {saving ? "Saving..." : "Save Build Spells"}
        </button>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </div>
    </div>
  );
}
