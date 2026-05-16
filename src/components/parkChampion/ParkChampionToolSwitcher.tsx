"use client";

import { Suspense, useMemo, useState } from "react";
import {
  DEFAULT_PARK_TOOL_ID,
  findParkToolById,
  PARK_CHAMPION_TOOLS,
} from "@/components/parkChampion/parkChampionToolsRegistry";

export default function ParkChampionToolSwitcher() {
  const [selectedId, setSelectedId] = useState(DEFAULT_PARK_TOOL_ID);

  const active = useMemo(
    () => findParkToolById(selectedId) ?? PARK_CHAMPION_TOOLS[0],
    [selectedId]
  );

  if (!active) {
    return (
      <p className="text-sm text-neutral-400">No Park Champion tools are configured.</p>
    );
  }

  const Tool = active.Component;
  const body = active.suspense ? (
    <Suspense fallback={<p className="text-sm text-neutral-400">Loading tool…</p>}>
      <Tool />
    </Suspense>
  ) : (
    <Tool />
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="park-tool-select" className="text-sm font-medium text-neutral-300">
            Tool
          </label>
          <select
            id="park-tool-select"
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 min-w-[18rem]"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {PARK_CHAMPION_TOOLS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {body}
    </div>
  );
}
