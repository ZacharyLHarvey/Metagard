"use client";

import { useState } from "react";

export default function TipsAlert({
  message,
  tipsEnabled,
}: {
  message: string;
  tipsEnabled: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);

  if (!tipsEnabled || dismissed) return null;

  return (
    <div className="mb-4 rounded border border-blue-800 bg-blue-950/30 p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-blue-100">{message}</p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded bg-blue-800 px-2 py-1 hover:bg-blue-700"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
