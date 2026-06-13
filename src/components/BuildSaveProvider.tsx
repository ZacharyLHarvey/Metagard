"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

type BuildSaveContextValue = {
  saved: boolean;
  saveCount: number;
  busy: boolean;
  toggle: () => Promise<void>;
};

const BuildSaveContext = createContext<BuildSaveContextValue | null>(null);

function useBuildSave() {
  const ctx = useContext(BuildSaveContext);
  if (!ctx) throw new Error("BuildSave components must be used within BuildSaveProvider");
  return ctx;
}

type BuildSaveProviderProps = {
  buildId: number;
  initialSaved: boolean;
  initialSaveCount: number;
  saveApiUrl?: string;
  children: ReactNode;
};

export function BuildSaveProvider({
  buildId,
  initialSaved,
  initialSaveCount,
  saveApiUrl,
  children,
}: BuildSaveProviderProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [saveCount, setSaveCount] = useState(initialSaveCount);
  const [busy, setBusy] = useState(false);
  const resolvedSaveUrl = saveApiUrl ?? `/api/builds/${buildId}/save`;

  const toggle = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch(resolvedSaveUrl, { method: "POST" });
      if (!res.ok) {
        window.alert("Could not update saved builds");
        return;
      }
      const body = (await res.json()) as { saved?: boolean; saveCount?: number };
      if (typeof body.saved === "boolean") setSaved(body.saved);
      if (typeof body.saveCount === "number") setSaveCount(Math.max(0, body.saveCount));
    } finally {
      setBusy(false);
    }
  }, [resolvedSaveUrl]);

  const value = useMemo(
    () => ({ saved, saveCount, busy, toggle }),
    [saved, saveCount, busy, toggle],
  );

  return <BuildSaveContext.Provider value={value}>{children}</BuildSaveContext.Provider>;
}

export function BuildUsageStatsSaves() {
  const { saveCount } = useBuildSave();
  return (
    <p>
      Saves: <span className="text-neutral-200 tabular-nums">{saveCount}</span>
    </p>
  );
}

export function BuildSaveToggleButton() {
  const { saved, busy, toggle } = useBuildSave();

  if (saved) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className="px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-sm"
      >
        {busy ? "…" : "Remove"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
    >
      {busy ? "Saving..." : "Save"}
    </button>
  );
}
