"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  buildId: number;
  canClone: boolean;
};

export default function CloneBuildButton({ buildId, canClone }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function clone() {
    if (!canClone) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/builds/${buildId}/clone`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Clone failed");
      return;
    }
    const data = (await res.json()) as { id?: number };
    if (data.id) router.push(`/builds/${data.id}`);
    router.refresh();
  }

  if (!canClone) {
    return (
      <p className="text-xs text-neutral-500">
        <a href="/login" className="text-blue-400 underline">
          Sign in
        </a>{" "}
        to clone this build into your account.
      </p>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void clone()}
        className="px-3 py-2 bg-purple-700 hover:bg-purple-600 rounded text-sm"
      >
        {busy ? "Cloning…" : "Clone build"}
      </button>
      {error ? <p className="text-sm text-red-400 mt-1">{error}</p> : null}
    </div>
  );
}
