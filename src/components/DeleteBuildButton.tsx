"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteBuildButton({ buildId }: { buildId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm("Delete this build permanently? This cannot be undone.")) return;
    setBusy(true);
    const res = await fetch(`/api/builds/${buildId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      window.alert(body.error ?? "Could not delete");
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      className="px-3 py-1 bg-red-900/80 hover:bg-red-800 rounded text-sm text-red-100"
    >
      {busy ? "…" : "Delete"}
    </button>
  );
}
