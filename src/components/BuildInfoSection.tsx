"use client";

import { useState } from "react";

type Props = {
  playStyle?: string | null;
  buildPriority?: string | null;
  synergy?: string | null;
  enemies?: string | null;
  recommendedGear?: string | null;
};

export default function BuildInfoSection({
  playStyle,
  buildPriority,
  synergy,
  enemies,
  recommendedGear,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section className="border border-neutral-800 rounded-lg p-3 sm:p-4 max-w-3xl">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left rounded-md px-1 py-2 -mx-1 hover:bg-neutral-800/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
      >
        <h2 className="text-lg font-semibold">Build Info</h2>
        <span className="shrink-0 text-neutral-500 text-sm" aria-hidden>
          {collapsed ? "▶" : "▼"}
        </span>
      </button>
      {!collapsed ? (
        <div className="mt-4 space-y-3 text-sm text-neutral-300">
          <section className="rounded-lg border border-neutral-800 p-4 bg-neutral-900/30 space-y-1">
            <p className="text-neutral-500 font-medium">Play Style</p>
            <p className="text-xs text-neutral-400">
              How this build is meant to approach fights, objectives, and battlefield movement.
            </p>
            <p className="whitespace-pre-wrap text-neutral-200">{playStyle ?? "—"}</p>
          </section>

          <section className="rounded-lg border border-neutral-800 p-4 bg-neutral-900/30 space-y-1">
            <p className="text-neutral-500 font-medium">Priority</p>
            <p className="text-xs text-neutral-400">
              What you should focus on first when playing this build in a Battlegame.
            </p>
            <p className="whitespace-pre-wrap text-neutral-200">{buildPriority ?? "—"}</p>
          </section>

          <section className="rounded-lg border border-neutral-800 p-4 bg-neutral-900/30 space-y-1">
            <p className="text-neutral-500 font-medium">Synergy</p>
            <p className="text-xs text-neutral-400">
              Which classes, teammates, or abilities enhance this build’s effectiveness.
            </p>
            <p className="whitespace-pre-wrap text-neutral-200">{synergy ?? "—"}</p>
          </section>

          <section className="rounded-lg border border-neutral-800 p-4 bg-neutral-900/30 space-y-1">
            <p className="text-neutral-500 font-medium">Enemies</p>
            <p className="text-xs text-neutral-400">
              The classes or tactics that most threaten this build during Battlegames.
            </p>
            <p className="whitespace-pre-wrap text-neutral-200">{enemies ?? "—"}</p>
          </section>

          <section className="rounded-lg border border-neutral-800 p-4 bg-neutral-900/30 space-y-1">
            <p className="text-neutral-500 font-medium">Recommended Gear</p>
            <p className="text-xs text-neutral-400">
              The weapons, shields, and equipment that best support this build’s playstyle.
            </p>
            <p className="whitespace-pre-wrap text-neutral-200">{recommendedGear ?? "—"}</p>
          </section>
        </div>
      ) : null}
    </section>
  );
}
