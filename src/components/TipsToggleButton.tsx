"use client";

import { useMemo, useState } from "react";

const KEY = "enableTips";

export default function TipsToggleButton() {
  const [revision, setRevision] = useState(0);

  const enabled = useMemo(() => {
    void revision;
    if (typeof window === "undefined") return true;
    const value = window.localStorage.getItem(KEY);
    if (value === null) {
      window.localStorage.setItem(KEY, "true");
      return true;
    }
    return value === "true";
  }, [revision]);

  function toggle() {
    const next = !enabled;
    window.localStorage.setItem(KEY, String(next));
    setRevision((r) => r + 1);
  }

  return (
    <button onClick={toggle} className="px-2 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-xs">
      {enabled ? "Disable Tips" : "Enable Tips"}
    </button>
  );
}
