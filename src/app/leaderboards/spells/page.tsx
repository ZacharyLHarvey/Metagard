import Link from "next/link";
import TierBadge from "@/components/TierBadge";
import { getAllSpellsList } from "@/lib/queries/spellbook";

export default async function SpellLeaderboardPage() {
  const spells = await getAllSpellsList();
  const ranked = [...spells].sort(
    (a, b) =>
      Number(a.tier_rank ?? 99) - Number(b.tier_rank ?? 99) ||
      Number(b.weighted_rating ?? 0) - Number(a.weighted_rating ?? 0) ||
      Number(b.ratings_count ?? 0) - Number(a.ratings_count ?? 0)
  );

  return (
    <main className="p-10 text-white space-y-6">
      <div className="flex flex-wrap gap-4 items-baseline justify-between">
        <h1 className="text-2xl font-bold">Spell leaderboard</h1>
        <Link href="/leaderboards" className="text-sm text-blue-400 hover:underline">
          ← Build leaderboards
        </Link>
      </div>
      <p className="text-sm text-neutral-400 max-w-2xl">
        Spells ranked by tier, weighted rating, and vote count.
      </p>
      <div className="border border-neutral-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm border-collapse table-fixed">
          <thead className="bg-neutral-900">
            <tr>
              <th className="px-4 py-2 text-left border-b border-neutral-800 w-12">#</th>
              <th className="px-4 py-2 text-left border-b border-neutral-800">Spell</th>
              <th className="px-4 py-2 text-left border-b border-neutral-800 w-20">Tier</th>
              <th className="px-4 py-2 text-left border-b border-neutral-800 w-24">WR</th>
              <th className="px-4 py-2 text-left border-b border-neutral-800 w-20">Votes</th>
            </tr>
          </thead>
          <tbody>
            {ranked.slice(0, 100).map((s, i) => (
              <tr key={s.id} className="hover:bg-neutral-900/40">
                <td className="px-4 py-2 border-b border-neutral-800 text-neutral-500">{i + 1}</td>
                <td className="px-4 py-2 border-b border-neutral-800">
                  <Link href={`/spells/${s.id}`} className="text-blue-400 hover:underline">
                    {s.name}
                  </Link>
                  <div className="text-xs text-neutral-500">
                    L{s.level ?? "—"} · {s.type ?? "—"} · {s.school ?? "—"}
                  </div>
                </td>
                <td className="px-4 py-2 border-b border-neutral-800">
                  <TierBadge tier={(s.tier as "S+" | "S" | "A" | "B" | "C" | "D" | "F") ?? "C"} />
                </td>
                <td className="px-4 py-2 border-b border-neutral-800">{Number(s.weighted_rating ?? 0).toFixed(2)}</td>
                <td className="px-4 py-2 border-b border-neutral-800">{Number(s.ratings_count ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
