"use client";

import { useRef, useState, type ReactNode } from "react";
import type { SpellRow } from "@/lib/spellbook/types";
import SpellDetailModal from "@/components/spellbook/SpellDetailModal";

const LONG_PRESS_MS = 450;

function spellTitleSummary(spell: SpellRow): string {
  const eff = spell.effect?.trim() ?? "";
  const effSnippet = eff ? `${eff.slice(0, 280)}${eff.length > 280 ? "…" : ""}` : "";
  const lines = [
    spell.type ?? "",
    spell.school ? `School: ${spell.school}` : "",
    spell.range ? `Range: ${spell.range}` : "",
    effSnippet,
  ].filter(Boolean);
  return lines.join("\n");
}

function SideboardLongPressWrap({
  spell,
  onOpenDetail,
  children,
}: {
  spell: SpellRow;
  onOpenDetail: (s: SpellRow) => void;
  children: ReactNode;
}) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = () => {
    if (timeoutRef.current != null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  return (
    <div
      className="min-w-0 flex-1"
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
  spells: SpellRow[];
  spellbookTipsEnabled?: boolean;
  /** When set, show remove control per row (edit mode). */
  onRemove?: (spellId: number) => void;
  removingSpellId?: number | null;
};

export default function SideboardSpellList({
  spells,
  spellbookTipsEnabled = true,
  onRemove,
  removingSpellId,
}: Props) {
  const [detailSpell, setDetailSpell] = useState<SpellRow | null>(null);

  if (spells.length === 0) {
    return <p className="px-4 py-6 text-sm text-neutral-500 text-center">No spells on the sideboard.</p>;
  }

  return (
    <>
      <SpellDetailModal spell={detailSpell} onClose={() => setDetailSpell(null)} />
      <ul className="divide-y divide-neutral-800">
        {spells.map((spell) => {
          const metaMagic = spell.type === "Meta-Magic";
          const rowInner = (
            <>
              <div className="flex flex-wrap items-start gap-2 min-w-0">
                <span className="font-medium text-neutral-100">{spell.name}</span>
                {metaMagic ? (
                  <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-violet-900/60 text-violet-200 shrink-0">
                    Meta-Magic
                  </span>
                ) : null}
              </div>
              <div className="text-xs text-neutral-500 mt-0.5">
                L{spell.level ?? "—"} · {spell.type ?? "—"} · {spell.school ?? "—"}
              </div>
            </>
          );

          return (
            <li
              key={spell.id}
              className="px-4 py-2 flex justify-between gap-4 items-start hover:bg-neutral-900/40"
              title={spellTitleSummary(spell)}
            >
              {spellbookTipsEnabled ? (
                <SideboardLongPressWrap spell={spell} onOpenDetail={setDetailSpell}>
                  {rowInner}
                </SideboardLongPressWrap>
              ) : (
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left cursor-pointer"
                  onClick={() => setDetailSpell(spell)}
                >
                  {rowInner}
                </button>
              )}
              {onRemove ? (
                <button
                  type="button"
                  onClick={() => onRemove(spell.id)}
                  disabled={removingSpellId === spell.id}
                  className="shrink-0 px-2 py-1 text-xs bg-neutral-700 hover:bg-red-900/60 rounded disabled:opacity-50"
                >
                  {removingSpellId === spell.id ? "…" : "Remove"}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}
