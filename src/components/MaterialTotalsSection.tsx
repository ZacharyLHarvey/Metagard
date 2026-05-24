"use client";

import { useMemo, useState } from "react";
import { computeMaterialTotals } from "@/lib/spellbook/materialTotals";
import type { BuildSpellSelectionRow, SpellRow } from "@/lib/spellbook/types";

type Props = {
  selections: BuildSpellSelectionRow[];
  extraSelections: BuildSpellSelectionRow[];
  spells: SpellRow[];
  lookThePart: boolean;
  className: string;
};

export default function MaterialTotalsSection({
  selections,
  extraSelections,
  spells,
  lookThePart,
  className,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const { enchantmentStrips, magicBalls } = useMemo(
    () =>
      computeMaterialTotals(selections, extraSelections, spells, {
        className,
        lookThePart,
      }),
    [selections, extraSelections, spells, className, lookThePart]
  );

  if (enchantmentStrips.length === 0 && magicBalls.length === 0) return null;

  return (
    <section className="border border-neutral-800 rounded-lg p-3 sm:p-4">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left rounded-md px-1 py-2 -mx-1 hover:bg-neutral-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
      >
        <h3 className="text-lg font-semibold">Material Totals</h3>
        <span className="shrink-0 text-neutral-500 text-sm" aria-hidden>
          {collapsed ? "▶" : "▼"}
        </span>
      </button>
      {!collapsed ? (
        <div className="mt-2 space-y-3 pl-1 text-neutral-200">
          {enchantmentStrips.length > 0 ? (
            <div>
              <p className="font-medium">Enchantment Strips</p>
              <ul className="mt-1 list-none space-y-1 pl-4">
                {enchantmentStrips.map(({ color, total }) => (
                  <li key={color}>
                    {total}x {color}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {magicBalls.length > 0 ? (
            <div>
              <p className="font-medium">Magic Balls</p>
              <ul className="mt-1 list-none space-y-1 pl-4">
                {magicBalls.map(({ color, total }) => (
                  <li key={color}>
                    {total}x {color}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
