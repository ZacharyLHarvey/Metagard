import Link from "next/link";
import CreatorAttribution from "@/components/CreatorAttribution";
import TierBadge from "@/components/TierBadge";
import AutoQuerySelect from "@/components/AutoQuerySelect";
import { getDisplayNamesForOwnerIds } from "@/lib/queries/publicProfiles";
import { getGlobalAverageRating, getNumericEntityVoteStats } from "@/lib/queries/ratingStats";
import { createClient } from "@/lib/server/supabaseServer";
import { computeTierResult } from "@/lib/tier";
import { BATTLEGAME_TYPES } from "@/lib/battlegames";

type Row = {
  id: number;
  name: string;
  owner_id?: string | null;
  game_type?: string | null;
  average_rating: number | null;
  created_at?: string | null;
};

type Search = { gameType?: string };

export default async function BattlegamesLeaderboardPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { gameType = "All" } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("battle_games").select("*");
  if (gameType !== "All") query = query.eq("game_type", gameType);
  const { data } = await query;
  const rows = (data ?? []) as Row[];

  const [globalAverage, voteStats, creatorByOwnerId] = await Promise.all([
    getGlobalAverageRating("battle_game_ratings"),
    getNumericEntityVoteStats("battle_game_ratings", "battle_game_id", rows.map((r) => r.id)),
    getDisplayNamesForOwnerIds(rows.map((r) => r.owner_id)),
  ]);

  const ranked = rows
    .map((r) => {
      const stat = voteStats.get(r.id) ?? { votes: 0, rawAverage: Number(r.average_rating ?? 0) };
      const tierData = computeTierResult(stat.rawAverage, stat.votes, globalAverage);
      return {
        ...r,
        weighted_rating: tierData.weightedRating,
        tier: tierData.tier,
        tier_rank: tierData.tierRank,
        votes: stat.votes,
      };
    })
    .sort(
      (a, b) =>
        a.tier_rank - b.tier_rank ||
        b.weighted_rating - a.weighted_rating ||
        b.votes - a.votes ||
        String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))
    );

  return (
    <main className="p-10 text-white space-y-6">
      <div className="flex flex-wrap gap-4 items-baseline justify-between">
        <h1 className="text-2xl font-bold">Battlegames Leaderboard</h1>
        <Link href="/leaderboards" className="text-sm text-blue-400 hover:underline">
          ← Main Leaderboards
        </Link>
      </div>
      <p className="text-sm text-neutral-400 max-w-2xl">
        Battlegames ranked by tier, weighted rating, and vote count.
      </p>
      <AutoQuerySelect
        name="gameType"
        label="Game Type"
        value={gameType}
        clearValue="All"
        options={BATTLEGAME_TYPES.map((type) => ({ value: type, label: type }))}
      />
      <div className="border border-neutral-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse table-fixed">
          <thead className="bg-neutral-900">
            <tr>
              <th className="px-4 py-2 text-left border-b border-neutral-800 w-12">#</th>
              <th className="px-4 py-2 text-left border-b border-neutral-800">Battlegame</th>
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
                  <Link href={`/battlegames/${r.id}`} className="text-blue-400 hover:underline">
                    {r.name} {r.game_type ? <span className="text-xs text-neutral-500">({r.game_type})</span> : null}
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
                  <TierBadge tier={r.tier} />
                </td>
                <td className="px-4 py-2 border-b border-neutral-800">{r.weighted_rating.toFixed(2)}</td>
                <td className="px-4 py-2 border-b border-neutral-800">{r.votes}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </main>
  );
}

