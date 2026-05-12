import Link from "next/link";
import TierBadge from "@/components/TierBadge";
import { getClassLeaderboard } from "@/lib/queries/spellbook";

export default async function ClassLeaderboardPage() {
  const rows = await getClassLeaderboard();

  return (
    <main className="p-10 text-white space-y-6">
      <div className="flex flex-wrap gap-4 items-baseline justify-between">
        <h1 className="text-2xl font-bold">Class Leaderboard</h1>
        <Link href="/leaderboards" className="text-sm text-blue-400 hover:underline">
          ← Main Leaderboards
        </Link>
      </div>
      <p className="text-sm text-neutral-400 max-w-2xl">
        Ranked by average class rating, then vote count. Rate classes from the{" "}
        <Link href="/classes" className="text-blue-400 underline">
          Classes page
        </Link>
        .
      </p>
      <div className="border border-neutral-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse table-fixed">
          <thead className="bg-neutral-900">
            <tr>
              <th className="px-4 py-2 text-left border-b border-neutral-800 w-12">#</th>
              <th className="px-4 py-2 text-left border-b border-neutral-800">Class</th>
              <th className="px-4 py-2 text-left border-b border-neutral-800 w-20">Tier</th>
              <th className="px-4 py-2 text-left border-b border-neutral-800 w-24">WR</th>
              <th className="px-4 py-2 text-left border-b border-neutral-800 w-20">Votes</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 100).map((r, i) => (
              <tr key={r.id} className="hover:bg-neutral-900/40">
                <td className="px-4 py-2 border-b border-neutral-800 text-neutral-500">{i + 1}</td>
                <td className="px-4 py-2 border-b border-neutral-800">
                  <Link href={`/classes/${r.id}`} className="text-blue-400 hover:underline">
                    {r.name}
                  </Link>
                  <div className="text-xs text-neutral-500">Raw ★ {r.average_rating.toFixed(2)}</div>
                </td>
                <td className="px-4 py-2 border-b border-neutral-800">
                  <TierBadge tier={r.tier as "S+" | "S" | "A" | "B" | "C" | "D" | "F"} />
                </td>
                <td className="px-4 py-2 border-b border-neutral-800">{r.weighted_rating.toFixed(2)}</td>
                <td className="px-4 py-2 border-b border-neutral-800">{r.ratings_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </main>
  );
}

