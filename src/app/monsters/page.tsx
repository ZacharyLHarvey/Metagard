import Link from "next/link";
import CreatorAttribution from "@/components/CreatorAttribution";
import TierBadge from "@/components/TierBadge";
import { getDisplayNamesForOwnerIds } from "@/lib/queries/publicProfiles";
import { getGlobalAverageRating, getNumericEntityVoteStats } from "@/lib/queries/ratingStats";
import { computeTierResult } from "@/lib/tier";
import { createClient } from "@/lib/server/supabaseServer";

export default async function MonstersPage() {
  const supabase = await createClient();
  const { data: items } = await supabase.from("monsters").select("*").order("average_rating", { ascending: false });
  const rows = (items ?? []) as Array<{
    id: number;
    name: string;
    owner_id?: string | null;
    average_rating: number | null;
  }>;
  const [globalAverage, voteStats, creatorByOwnerId] = await Promise.all([
    getGlobalAverageRating("monster_ratings"),
    getNumericEntityVoteStats("monster_ratings", "monster_id", rows.map((r) => r.id)),
    getDisplayNamesForOwnerIds(rows.map((r) => r.owner_id)),
  ]);

  return (
    <main className="p-10 text-white space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Monsters</h1>
        <Link href="/monsters/new" className="px-3 py-2 bg-blue-600 rounded text-sm">
          Create Monster
        </Link>
      </div>
      <ul className="border border-neutral-800 rounded-lg divide-y divide-neutral-800">
        {(items ?? []).length === 0 ? (
          <li className="px-4 py-8 text-neutral-500 text-center">No monsters yet.</li>
        ) : null}
        {rows.map((m) => {
          const stat = voteStats.get(m.id) ?? { votes: 0, rawAverage: Number(m.average_rating ?? 0) };
          const tierData = computeTierResult(stat.rawAverage, stat.votes, globalAverage);
          return (
          <li key={m.id} className="px-4 py-3 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
            <div className="min-w-0">
              <Link href={`/monsters/${m.id}`} className="text-blue-400 hover:underline">
                {m.name}
              </Link>
              <div className="mt-1">
                <CreatorAttribution
                  ownerId={m.owner_id}
                  displayName={
                    m.owner_id ? (creatorByOwnerId.get(m.owner_id) ?? "Player") : "Player"
                  }
                />
              </div>
            </div>
            <span className="text-sm text-neutral-500 shrink-0">
              <TierBadge tier={tierData.tier} /> · {tierData.weightedRating.toFixed(2)}
            </span>
          </li>
          );
        })}
      </ul>
    </main>
  );
}
