import Link from "next/link";
import { getLeaderboardBuilds } from "@/lib/queries/spellbook";
import type { BuildRow } from "@/lib/spellbook/types";

export default async function LeaderboardsPage() {
  const builds = await getLeaderboardBuilds(200);

  const byClassLevel = new Map<string, BuildRow[]>();
  for (const b of builds) {
    const key = `${b.class} · L${b.level}`;
    if (!byClassLevel.has(key)) byClassLevel.set(key, []);
    byClassLevel.get(key)!.push(b);
  }
  const keys = [...byClassLevel.keys()].sort();

  return (
    <main className="p-10 text-white space-y-8">
      <div className="flex flex-wrap gap-4 items-baseline justify-between">
        <h1 className="text-2xl font-bold">Leaderboards</h1>
        <Link href="/leaderboards/spells" className="text-sm text-blue-400 hover:underline">
          Spell leaderboard →
        </Link>
      </div>
      <p className="text-sm text-neutral-400 max-w-2xl">
        Builds ranked by average rating (ties arbitrary). Run{" "}
        <code className="text-neutral-300">metagard_extended_features.sql</code> so ratings and{" "}
        <code className="text-neutral-300">spells.average_rating</code> stay in sync.
      </p>

      <section>
        <h2 className="text-lg font-semibold mb-3">Top builds (global)</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          {builds.slice(0, 25).map((b) => (
            <li key={b.id}>
              <Link href={`/builds/${b.id}`} className="text-blue-400 hover:underline">
                {b.name}
              </Link>{" "}
              <span className="text-neutral-500">
                ({b.class} L{b.level}) ★ {Number(b.average_rating ?? 0).toFixed(2)}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">By class &amp; level</h2>
        <div className="space-y-6">
          {keys.map((key) => (
            <div key={key} className="border border-neutral-800 rounded-lg p-4">
              <h3 className="font-medium text-neutral-200 mb-2">{key}</h3>
              <ul className="space-y-1 text-sm">
                {byClassLevel.get(key)!.slice(0, 10).map((b) => (
                  <li key={b.id} className="flex justify-between gap-4">
                    <Link href={`/builds/${b.id}`} className="text-blue-400 hover:underline truncate">
                      {b.name}
                    </Link>
                    <span className="text-neutral-500 shrink-0">★ {Number(b.average_rating ?? 0).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
