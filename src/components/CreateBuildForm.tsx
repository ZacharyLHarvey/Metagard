"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isMartialClass } from "@/lib/spellbook/martial";

export default function CreateBuildForm({ classes }: { classes: string[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [level, setLevel] = useState(1);
  const [lookThePart, setLookThePart] = useState(false);
  const [playStyle, setPlayStyle] = useState("");
  const [priority, setPriority] = useState("");
  const [synergy, setSynergy] = useState("");
  const [enemies, setEnemies] = useState("");
  const [recommendedGear, setRecommendedGear] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const martial = isMartialClass(className);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const response = await fetch("/api/builds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        className,
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

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">

      <div>
        <label className="block mb-2 text-neutral-300">Build Name</label>
        <input
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block mb-2 text-neutral-300">Class</label>
        <select
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded"
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          required
        >
          <option value="">Select a class</option>
          {classes.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block mb-2 text-neutral-300">Level</label>
        <input
          type="number"
          min="1"
          max="6"
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded"
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
          Martial classes do not use spell points. Build abilities are auto-assigned from class rules up to selected level.
          Look The Part adds the class-specific LTP ability (not bonus points).
        </p>
      ) : (
        <p className="text-xs text-neutral-400">
          Caster classes use spell point-buy. Look The Part grants +1 point at your highest circle.
        </p>
      )}

      <div>
        <label className="block mb-2 text-neutral-300">Playstyle</label>
        <p className="text-xs text-neutral-400 mb-2">
          How this build is meant to approach fights, objectives, and battlefield movement.
        </p>
        <textarea
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded min-h-40"
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
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded min-h-40"
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
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded min-h-40"
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
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded min-h-40"
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
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded min-h-40"
          value={recommendedGear}
          onChange={(e) => setRecommendedGear(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
      >
        {submitting ? "Creating..." : "Create Build"}
      </button>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </form>
  );
}
