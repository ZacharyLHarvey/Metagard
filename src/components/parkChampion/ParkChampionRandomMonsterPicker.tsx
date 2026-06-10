"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CreatorAttribution from "@/components/CreatorAttribution";

type RandomMonsterResult = {
  id: number;
  name: string;
  monsterType: string | null;
  threatLevel: string | null;
  ownerId: string | null;
  creatorDisplayName?: string;
  href: string;
};

function formatMonsterSubtitle(monster: RandomMonsterResult): string | null {
  const type = monster.monsterType?.trim() || null;
  const threat = monster.threatLevel?.trim() || null;
  const parts = [type, threat ? `Tier ${threat}` : null].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export default function ParkChampionRandomMonsterPicker() {
  const [monster, setMonster] = useState<RandomMonsterResult | null>(null);
  const [poolSize, setPoolSize] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    async function run() {
      setLoading(true);
      setError("");
      const res = await fetch("/api/monsters/random", { cache: "no-store" });
      setLoading(false);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Failed to pick random monster");
        setMonster(null);
        setPoolSize(0);
        return;
      }
      const body = (await res.json()) as { monster: RandomMonsterResult | null; poolSize: number };
      setMonster(body.monster);
      setPoolSize(typeof body.poolSize === "number" ? body.poolSize : 0);
    }
    run();
  }, [nonce]);

  const subtitle = monster ? formatMonsterSubtitle(monster) : null;

  return (
    <section className="border border-neutral-800 rounded-lg p-5 space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">Random Monster Picker</h2>
        <button
          type="button"
          onClick={() => setNonce((n) => n + 1)}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
        >
          Pick Again
        </button>
      </div>

      <p className="text-xs text-neutral-500">
        Eligible monsters: {loading ? "…" : poolSize}. Each pick is independent, so the same monster can appear
        again.
      </p>

      {loading ? <p className="text-sm text-neutral-400">Picking a monster…</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {!loading && !error && !monster ? (
        <p className="text-sm text-neutral-400">No monsters in the database yet.</p>
      ) : null}

      {monster ? (
        <article className="border border-neutral-800 rounded-lg p-4 space-y-3">
          <h3 className="text-xl font-semibold">
            <Link href={monster.href} className="text-blue-400 hover:underline">
              {monster.name}
            </Link>
          </h3>
          {subtitle ? <p className="text-sm text-neutral-400">{subtitle}</p> : null}
          <CreatorAttribution
            ownerId={monster.ownerId}
            displayName={monster.creatorDisplayName ?? (monster.ownerId ? "Player" : "—")}
          />
        </article>
      ) : null}
    </section>
  );
}
