"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CustomClassRow } from "@/lib/customClass/types";

type Props = {
  classes: CustomClassRow[];
  initialClassId?: number;
};

export default function CreateCustomBuildForm({ classes, initialClassId }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [customClassId, setCustomClassId] = useState(
    initialClassId ? String(initialClassId) : ""
  );
  const [level, setLevel] = useState(1);
  const [lookThePart, setLookThePart] = useState(false);
  const [playStyle, setPlayStyle] = useState("");
  const [priority, setPriority] = useState("");
  const [synergy, setSynergy] = useState("");
  const [enemies, setEnemies] = useState("");
  const [recommendedGear, setRecommendedGear] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedClass = classes.find((c) => String(c.id) === customClassId);
  const martial = selectedClass?.class_type === "martial";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const response = await fetch("/api/custom-builds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        customClassId: Number(customClassId),
        level,
        lookThePart,
        playStyle: playStyle || null,
        priority: priority || null,
        synergy: synergy || null,
        enemies: enemies || null,
        recommendedGear: recommendedGear || null,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "Failed to create build");
      setSubmitting(false);
      return;
    }

    const data = (await response.json()) as { id?: number };
    router.push(data.id ? `/custom-builds/${data.id}/edit` : "/custom-builds");
    router.refresh();
  }

  if (classes.length === 0) {
    return (
      <p className="text-sm text-neutral-400">
        No custom classes available.{" "}
        <a href="/custom-classes/new" className="text-blue-400 hover:underline">
          Create a custom class
        </a>{" "}
        first.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 sm:gap-6">
      <div>
        <label className="block mb-2 text-neutral-300">Build Name</label>
        <input
          className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block mb-2 text-neutral-300">Custom Class</label>
        <select
          className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded"
          value={customClassId}
          onChange={(e) => setCustomClassId(e.target.value)}
          required
        >
          <option value="">Select a custom class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.class_type === "martial" ? "Martial" : "Caster"})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block mb-2 text-neutral-300">Level</label>
        <input
          type="number"
          min={1}
          max={6}
          className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded"
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
          required
        />
      </div>

      <label className="flex items-center gap-3 text-neutral-300">
        <input
          type="checkbox"
          checked={lookThePart}
          onChange={(e) => setLookThePart(e.target.checked)}
        />
        Look The Part
      </label>
      {martial ? (
        <p className="text-xs text-neutral-400">
          Martial custom classes auto-assign base abilities from the class catalog. Look the Part
          adds LtP rows defined on the class.
        </p>
      ) : (
        <p className="text-xs text-neutral-400">
          Caster custom classes use point-buy from the class spell catalog (5×level cascade budget).
        </p>
      )}

      <div>
        <label className="block mb-2 text-neutral-300">Play Style</label>
        <p className="text-xs text-neutral-400 mb-2">
          How this build is meant to approach fights, objectives, and battlefield movement.
        </p>
        <textarea
          className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded min-h-32 sm:min-h-40"
          value={playStyle}
          onChange={(e) => setPlayStyle(e.target.value)}
        />
      </div>

      <div>
        <label className="block mb-2 text-neutral-300">Priority</label>
        <p className="text-xs text-neutral-400 mb-2">
          What you should focus on first when playing this build in a Battlegame.
        </p>
        <textarea
          className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded min-h-32 sm:min-h-40"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        />
      </div>

      <div>
        <label className="block mb-2 text-neutral-300">Synergy</label>
        <p className="text-xs text-neutral-400 mb-2">
          Which classes, teammates, or abilities enhance this build’s effectiveness.
        </p>
        <textarea
          className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded min-h-32 sm:min-h-40"
          value={synergy}
          onChange={(e) => setSynergy(e.target.value)}
        />
      </div>

      <div>
        <label className="block mb-2 text-neutral-300">Enemies</label>
        <p className="text-xs text-neutral-400 mb-2">
          The classes or tactics that most threaten this build during Battlegames.
        </p>
        <textarea
          className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded min-h-32 sm:min-h-40"
          value={enemies}
          onChange={(e) => setEnemies(e.target.value)}
        />
      </div>

      <div>
        <label className="block mb-2 text-neutral-300">Recommended Gear</label>
        <p className="text-xs text-neutral-400 mb-2">
          The weapons, shields, and equipment that best support this build’s playstyle.
        </p>
        <textarea
          className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded min-h-32 sm:min-h-40"
          value={recommendedGear}
          onChange={(e) => setRecommendedGear(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 bg-blue-600 rounded disabled:opacity-50 w-fit"
      >
        {submitting ? "Creating…" : "Create Custom Build"}
      </button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </form>
  );
}
