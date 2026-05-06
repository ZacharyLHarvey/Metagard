import Link from "next/link";
import TierBadge from "@/components/TierBadge";
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
        <div className="flex gap-4">
          <Link href="/leaderboards/classes" className="text-sm text-blue-400 hover:underline">
            Class leaderboard →
          </Link>
          <Link href="/leaderboards/spells" className="text-sm text-blue-400 hover:underline">
            Spell leaderboard →
          </Link>
        </div>
      </div>
      <p className="text-sm text-neutral-400 max-w-2xl">
        Builds ranked by tier, weighted rating, and vote count (Bayesian smoothing m=10). Run{" "}
        <code className="text-neutral-300">metagard_extended_features.sql</code> so ratings and{" "}
        <code className="text-neutral-300">spells.average_rating</code> stay in sync.
      </p>

      <section>
        <h2 className="text-lg font-semibold mb-3">Top builds (global)</h2>
        <div className="border border-neutral-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-neutral-900">
              <tr>
                <th className="px-4 py-2 text-left border-b border-neutral-800">#</th>
                <th className="px-4 py-2 text-left border-b border-neutral-800">Build</th>
                <th className="px-4 py-2 text-left border-b border-neutral-800">Tier</th>
                <th className="px-4 py-2 text-left border-b border-neutral-800">WR</th>
                <th className="px-4 py-2 text-left border-b border-neutral-800">Votes</th>
              </tr>
            </thead>
            <tbody>
              {builds.slice(0, 25).map((b, i) => (
                <tr key={b.id} className="hover:bg-neutral-900/40">
                  <td className="px-4 py-2 border-b border-neutral-800 text-neutral-500">{i + 1}</td>
                  <td className="px-4 py-2 border-b border-neutral-800">
                    <Link href={`/builds/${b.id}`} className="text-blue-400 hover:underline">
                      {b.name}
                    </Link>
                    <div className="text-xs text-neutral-500">
                      {b.class} · L{b.level}
                    </div>
                  </td>
                  <td className="px-4 py-2 border-b border-neutral-800">
                    <TierBadge tier={(b.tier as "S+" | "S" | "A" | "B" | "C" | "D" | "F") ?? "C"} />
                  </td>
                  <td className="px-4 py-2 border-b border-neutral-800">{Number(b.weighted_rating ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-2 border-b border-neutral-800">{Number(b.ratings_count ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">By class &amp; level</h2>
        <div className="space-y-6">
          {keys.map((key) => (
            <div key={key} className="border border-neutral-800 rounded-lg p-4">
              <h3 className="font-medium text-neutral-200 mb-2">{key}</h3>
              <div className="border border-neutral-800 rounded-lg overflow-hidden">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-neutral-900">
                    <tr>
                      <th className="px-4 py-2 text-left border-b border-neutral-800">#</th>
                      <th className="px-4 py-2 text-left border-b border-neutral-800">Build</th>
                      <th className="px-4 py-2 text-left border-b border-neutral-800">Tier</th>
                      <th className="px-4 py-2 text-left border-b border-neutral-800">WR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byClassLevel.get(key)!.slice(0, 10).map((b, i) => (
                      <tr key={b.id} className="hover:bg-neutral-900/40">
                        <td className="px-4 py-2 border-b border-neutral-800 text-neutral-500">{i + 1}</td>
                        <td className="px-4 py-2 border-b border-neutral-800">
                          <Link href={`/builds/${b.id}`} className="text-blue-400 hover:underline truncate">
                            {b.name}
                          </Link>
                        </td>
                        <td className="px-4 py-2 border-b border-neutral-800">
                          <TierBadge tier={(b.tier as "S+" | "S" | "A" | "B" | "C" | "D" | "F") ?? "C"} />
                        </td>
                        <td className="px-4 py-2 border-b border-neutral-800">{Number(b.weighted_rating ?? 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
