"use client";

import { useState } from "react";

export default function SaveBuildButton({ buildId }: { buildId: number }) {
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/builds/${buildId}/save`, { method: "POST" });
    setSaving(false);
  }

  return (
    <button
      onClick={handleSave}
      disabled={saving}
      className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
    >
      {saving ? "Saving..." : "Save"}
    </button>
  );
}
