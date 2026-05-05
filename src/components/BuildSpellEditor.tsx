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

type Props = {
  buildId: number;
  maxLevel: number;
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

function keyFor(spellId: number, spellLevel: number) {
  return `${spellLevel}:${spellId}`;
}

export default function BuildSpellEditor({ buildId, maxLevel, spells, initialSelections }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedSpell, setSelectedSpell] = useState<SpellRow | null>(null);
  const [showTypeSchool, setShowTypeSchool] = useState(false);
  const [showIncantation, setShowIncantation] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);
  const [ruleWarning, setRuleWarning] = useState<string>("");

  const [selectionMap, setSelectionMap] = useState<Record<string, Selection>>(() => {
    const base: Record<string, Selection> = {};
    for (const s of initialSelections) {
      base[keyFor(s.spell_id, s.spell_level)] = {
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

  const totalBudget = useMemo(() => maxLevel * 5, [maxLevel]);
  const pointsSpent = useMemo(() => {
    return Object.values(selectionMap).reduce((sum, selection) => {
      const spell = spells.find((s) => s.id === selection.spell_id);
      const cost = spell?.cost ?? 0;
      return sum + cost * selection.purchased;
    }, 0);
  }, [selectionMap, spells]);
  const pointsRemaining = Math.max(totalBudget - pointsSpent, 0);
  const purchasedBySpellId = useMemo(() => {
    const map: Record<number, number> = {};
    for (const selection of Object.values(selectionMap)) {
      map[selection.spell_id] = (map[selection.spell_id] ?? 0) + selection.purchased;
    }
    return map;
  }, [selectionMap]);
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

    const key = keyFor(spell.id, level);
    const max = spell.max ?? 99;
    setSelectionMap((prev) => {
      const existing = prev[key];
      const purchased = Math.min((existing?.purchased ?? 0) + 1, max);
      const currentCost = evaluated.adjustedCost * (existing?.purchased ?? 0);
      const nextCost = evaluated.adjustedCost * purchased;
      const delta = nextCost - currentCost;
      if (pointsSpent + delta > totalBudget) return prev;
      return {
        ...prev,
        [key]: {
          spell_id: spell.id,
          spell_level: level,
          purchased,
          experienced: existing?.experienced ?? 0,
          selection_group: existing?.selection_group ?? null,
          chosen: purchased > 0,
        },
      };
    });
  }

  function decrement(spell: SpellRow, level: number) {
    const key = keyFor(spell.id, level);
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

      {Array.from({ length: maxLevel }, (_, idx) => idx + 1).map((level) => (
        <section key={level} className="border border-neutral-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Level {level}</h2>
          <div className="space-y-2">
            {(grouped[level] ?? []).map((spell) => {
              const key = keyFor(spell.id, level);
              const purchased = selectionMap[key]?.purchased ?? 0;
              const evaluated = evaluateSpellRules(spell, selectedSpellNames);
              const display = computeDisplayRuleOverrides(spell, selectedSpellNames, purchased);
              let longPressTimeout: ReturnType<typeof setTimeout> | null = null;
              return (
                <div
                  key={spell.id}
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
        </section>
      ))}

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
