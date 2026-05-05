"use client";

import { useMemo, useState } from "react";

const KEY = "enableTips";

export default function TipsAlert({ message }: { message: string }) {
  const [dismissed, setDismissed] = useState(false);
  const enabled = useMemo(() => {
    if (typeof window === "undefined") return true;
    const value = window.localStorage.getItem(KEY);
    if (value === null) {
      window.localStorage.setItem(KEY, "true");
      return true;
    }
    return value === "true";
  }, []);

  if (!enabled || dismissed) return null;

  return (
    <div className="mb-4 rounded border border-blue-800 bg-blue-950/30 p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-blue-100">{message}</p>
        <button onClick={() => setDismissed(true)} className="px-2 py-1 bg-blue-800 rounded">
          Dismiss
        </button>
      </div>
    </div>
  );
}
