"use client";

import { useMemo, useState } from "react";
import { findSpellForSelection } from "@/lib/spellbook/selection";
import type { BuildSpellSelectionRow, SpellRow } from "@/lib/spellbook/types";
import { SNIPER_NO_NORMAL_ARROWS_NOTE } from "@/lib/spellbook/rules";
import { getViewBuildPurchasedSpellRows } from "@/lib/spellbook/viewBuildSpellSelections";

type Props = {
  selections: BuildSpellSelectionRow[];
  extraSelections: BuildSpellSelectionRow[];
  spells: SpellRow[];
  lookThePart: boolean;
  className: string;
};

export default function ArcherArrowTotalsSection({
  selections,
  extraSelections,
  spells,
  lookThePart,
  className,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const hasSniperArchetype = useMemo(() => {
    for (const row of [...selections, ...extraSelections]) {
      if (row.purchased <= 0) continue;
      const spell = findSpellForSelection(spells, row);
      if (spell?.type === "Archetype" && spell.name === "Sniper") return true;
    }
    return false;
  }, [selections, extraSelections, spells]);

  const lines = useMemo(() => {
    const rowsForArrows = getViewBuildPurchasedSpellRows(
      selections,
      extraSelections,
      spells,
      { className, lookThePart }
    );
    const byName = new Map<string, number>();
    for (const row of rowsForArrows) {
      const spell = findSpellForSelection(spells, row);
      if (spell?.type !== "Specialty Arrow") continue;
      const name = spell.name;
      byName.set(name, (byName.get(name) ?? 0) + row.purchased);
    }
    return [...byName.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selections, extraSelections, spells, className, lookThePart]);

  if (lines.length === 0) return null;

  return (
    <section className="border border-neutral-800 rounded-lg p-3 sm:p-4">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left rounded-md px-1 py-2 -mx-1 hover:bg-neutral-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
      >
        <h3 className="text-lg font-semibold">Arrow Totals</h3>
        <span className="shrink-0 text-neutral-500 text-sm" aria-hidden>
          {collapsed ? "▶" : "▼"}
        </span>
      </button>
      {!collapsed ? (
        <>
          <ul className="mt-2 list-none space-y-1 pl-1 text-neutral-200">
            {lines.map(({ name, total }) => (
              <li key={name}>
                {total}x {name}
              </li>
            ))}
          </ul>
          {className === "Archer" && hasSniperArchetype ? (
            <p className="mt-2 text-xs text-amber-200/90 pl-1">{SNIPER_NO_NORMAL_ARROWS_NOTE}</p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
