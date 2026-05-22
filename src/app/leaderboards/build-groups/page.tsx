import Link from "next/link";
import CreatorAttribution from "@/components/CreatorAttribution";
import TierBadge from "@/components/TierBadge";
import { getLeaderboardBuildGroups } from "@/lib/queries/buildGroups";
import { getDisplayNamesForOwnerIds } from "@/lib/queries/publicProfiles";

export default async function BuildGroupsLeaderboardPage() {
  const ranked = await getLeaderboardBuildGroups(100);
  const creatorByOwnerId = await getDisplayNamesForOwnerIds(ranked.map((r) => r.owner_id));

  return (
    <main className="p-10 text-white space-y-6">
      <div className="flex flex-wrap gap-4 items-baseline justify-between">
        <h1 className="text-2xl font-bold">Build Groups Leaderboard</h1>
        <Link href="/leaderboards" className="text-sm text-blue-400 hover:underline">
          ← Main Leaderboards
        </Link>
      </div>
      <p className="text-sm text-neutral-400 max-w-2xl">
        Build groups ranked by tier, weighted rating, and vote count.
      </p>

      <div className="border border-neutral-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse table-fixed">
          <thead className="bg-neutral-900">
            <tr>
              <th className="px-4 py-2 text-left border-b border-neutral-800 w-12">#</th>
              <th className="px-4 py-2 text-left border-b border-neutral-800">Build Group</th>
              <th className="px-4 py-2 text-left border-b border-neutral-800 w-20">Tier</th>
              <th className="px-4 py-2 text-left border-b border-neutral-800 w-24">WR</th>
              <th className="px-4 py-2 text-left border-b border-neutral-800 w-20">Votes</th>
            </tr>
          </thead>
          <tbody>
            {ranked.slice(0, 100).map((r, i) => (
              <tr key={r.id} className="hover:bg-neutral-900/40">
                <td className="px-4 py-2 border-b border-neutral-800 text-neutral-500">{i + 1}</td>
                <td className="px-4 py-2 border-b border-neutral-800">
                  <Link href={`/build-groups/${r.id}`} className="text-blue-400 hover:underline">
                    {r.name}
                  </Link>
                  <div className="mt-1">
                    <CreatorAttribution
                      ownerId={r.owner_id}
                      displayName={
                        r.owner_id ? (creatorByOwnerId.get(r.owner_id) ?? "Player") : "Player"
                      }
                    />
                  </div>
                </td>
                <td className="px-4 py-2 border-b border-neutral-800">
                  <TierBadge tier={r.tier as "S+" | "S" | "A" | "B" | "C" | "D" | "F"} />
                </td>
                <td className="px-4 py-2 border-b border-neutral-800">
                  {Number(r.weighted_rating ?? 0).toFixed(2)}
                </td>
                <td className="px-4 py-2 border-b border-neutral-800">{Number(r.ratings_count ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </main>
  );
}
