"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** POST /api/builds/[id]/save toggles; use on profile/home saved list to remove from saved. */
export default function UnsaveSavedBuildButton({ buildId }: { buildId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function unsave() {
    setBusy(true);
    const res = await fetch(`/api/builds/${buildId}/save`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      window.alert("Could not update saved builds");
      return;
    }
    const body = (await res.json()) as { saved?: boolean };
    if (body.saved) {
      window.alert("Still saved — try again");
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={unsave}
      disabled={busy}
      className="px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-sm"
    >
      {busy ? "…" : "Remove"}
    </button>
  );
}
