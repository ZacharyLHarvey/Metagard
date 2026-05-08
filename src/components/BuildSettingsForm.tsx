"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BuildRow } from "@/lib/spellbook/types";
import { isMartialClass } from "@/lib/spellbook/martial";

type Props = {
  build: BuildRow;
};

export default function BuildSettingsForm({ build }: Props) {
  const router = useRouter();
  const [name, setName] = useState(build.name);
  const className = build.class;
  const [level, setLevel] = useState(build.level);
  const [lookThePart, setLookThePart] = useState(build.look_the_part);
  const [notes, setNotes] = useState(build.notes ?? "");
  const [playStyle, setPlayStyle] = useState(build.play_style ?? "");
  const [priority, setPriority] = useState(build.build_priority ?? "");
  const [synergy, setSynergy] = useState(build.synergy ?? "");
  const [enemies, setEnemies] = useState(build.enemies ?? "");
  const [recommendedGear, setRecommendedGear] = useState(build.recommended_gear ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const martial = isMartialClass(className);

  async function onSave() {
    setSaving(true);
    setError("");
    const response = await fetch(`/api/builds/${build.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        level,
        lookThePart,
        notes: notes || null,
        playStyle: playStyle || null,
        priority: priority || null,
        synergy: synergy || null,
        enemies: enemies || null,
        recommendedGear: recommendedGear || null,
      }),
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
    router.push("/builds");
    router.refresh();
  }

  return (
    <div className="space-y-4 sm:space-y-5 max-w-xl">
      <div>
        <label className="block mb-2 text-sm text-neutral-300">Name</label>
        <input
          className="w-full px-3 py-2.5 rounded bg-neutral-800 border border-neutral-700"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label className="block mb-2 text-sm text-neutral-300">Class</label>
        <input
          className="w-full px-3 py-2.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300"
          value={className}
          readOnly
          disabled
        />
        <p className="text-xs text-neutral-500 mt-1">
          Class is locked after build creation.
        </p>
      </div>

      <div>
        <label className="block mb-2 text-sm text-neutral-300">Level</label>
        <input
          type="number"
          min={1}
          max={6}
          className="w-full px-3 py-2.5 rounded bg-neutral-800 border border-neutral-700"
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-300">
        <input type="checkbox" checked={lookThePart} onChange={(e) => setLookThePart(e.target.checked)} />
        Look The Part
      </label>
      {martial ? (
        <p className="text-xs text-neutral-400">
          Martial class behavior: abilities are auto-assigned by class/level; Look The Part grants the class LTP ability (no bonus points).
        </p>
      ) : (
        <p className="text-xs text-neutral-400">
          Caster behavior: point-buy remains enabled; Look The Part gives +1 point at highest spell circle.
        </p>
      )}

      <div>
        <label className="block mb-2 text-sm text-neutral-300">Notes</label>
        <textarea
          className="w-full px-3 py-2.5 rounded bg-neutral-800 border border-neutral-700 min-h-24"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div>
        <label className="block mb-2 text-sm text-neutral-300">Play style</label>
        <textarea
          className="w-full px-3 py-2.5 rounded bg-neutral-800 border border-neutral-700 min-h-20"
          value={playStyle}
          onChange={(e) => setPlayStyle(e.target.value)}
        />
      </div>

      <div>
        <label className="block mb-2 text-sm text-neutral-300">Priority</label>
        <textarea
          className="w-full px-3 py-2.5 rounded bg-neutral-800 border border-neutral-700 min-h-20"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        />
      </div>

      <div>
        <label className="block mb-2 text-sm text-neutral-300">Synergy</label>
        <textarea
          className="w-full px-3 py-2.5 rounded bg-neutral-800 border border-neutral-700 min-h-20"
          value={synergy}
          onChange={(e) => setSynergy(e.target.value)}
        />
      </div>

      <div>
        <label className="block mb-2 text-sm text-neutral-300">Enemies / counters</label>
        <textarea
          className="w-full px-3 py-2.5 rounded bg-neutral-800 border border-neutral-700 min-h-20"
          value={enemies}
          onChange={(e) => setEnemies(e.target.value)}
        />
      </div>

      <div>
        <label className="block mb-2 text-sm text-neutral-300">Recommended gear</label>
        <textarea
          className="w-full px-3 py-2.5 rounded bg-neutral-800 border border-neutral-700 min-h-20"
          value={recommendedGear}
          onChange={(e) => setRecommendedGear(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onSave} disabled={saving} className="px-4 py-2 bg-blue-600 rounded">
          {saving ? "Saving..." : "Save Settings"}
        </button>
        <button type="button" onClick={onDelete} disabled={deleting} className="px-4 py-2 bg-red-700 rounded">
          {deleting ? "Deleting..." : "Delete Build"}
        </button>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
