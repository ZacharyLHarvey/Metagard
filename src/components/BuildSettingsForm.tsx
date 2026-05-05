"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  build: {
    id: number;
    name: string;
    level: number;
    look_the_part: boolean;
    notes: string | null;
  };
};

export default function BuildSettingsForm({ build }: Props) {
  const router = useRouter();
  const [name, setName] = useState(build.name);
  const [level, setLevel] = useState(build.level);
  const [lookThePart, setLookThePart] = useState(build.look_the_part);
  const [notes, setNotes] = useState(build.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function onSave() {
    setSaving(true);
    setError("");
    const response = await fetch(`/api/builds/${build.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, level, lookThePart, notes }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Failed to save");
      setSaving(false);
      return;
    }
    setSaving(false);
    router.push(`/builds/${build.id}`);
    router.refresh();
  }

  async function onDelete() {
    const confirmed = window.confirm("Delete this build permanently?");
    if (!confirmed) return;
    setDeleting(true);
    const response = await fetch(`/api/builds/${build.id}`, { method: "DELETE" });
    if (!response.ok) {
      setDeleting(false);
      setError("Failed to delete build");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <label className="block mb-2 text-sm text-neutral-300">Name</label>
        <input
          className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label className="block mb-2 text-sm text-neutral-300">Level</label>
        <input
          type="number"
          min={1}
          max={6}
          className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700"
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-300">
        <input type="checkbox" checked={lookThePart} onChange={(e) => setLookThePart(e.target.checked)} />
        Look The Part
      </label>

      <div>
        <label className="block mb-2 text-sm text-neutral-300">Notes</label>
        <textarea
          className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 min-h-28"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-3">
        <button onClick={onSave} disabled={saving} className="px-4 py-2 bg-blue-600 rounded">
          {saving ? "Saving..." : "Save Settings"}
        </button>
        <button onClick={onDelete} disabled={deleting} className="px-4 py-2 bg-red-700 rounded">
          {deleting ? "Deleting..." : "Delete Build"}
        </button>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
