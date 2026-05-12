import Link from "next/link";
import CreatorAttribution from "@/components/CreatorAttribution";
import TierBadge from "@/components/TierBadge";
import AutoQuerySelect from "@/components/AutoQuerySelect";
import { getDisplayNamesForOwnerIds } from "@/lib/queries/publicProfiles";
import { getGlobalAverageRating, getNumericEntityVoteStats } from "@/lib/queries/ratingStats";
import { computeTierResult } from "@/lib/tier";
import { createClient } from "@/lib/server/supabaseServer";
import { BATTLEGAME_TYPES } from "@/lib/battlegames";

type Search = { gameType?: string };

export default async function BattlegamesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { gameType = "All" } = await searchParams;
  const supabase = await createClient();
  let query = supabase
    .from("battle_games")
    .select("*")
    .order("average_rating", { ascending: false });
  if (gameType !== "All") query = query.eq("game_type", gameType);
  const { data: items } = await query;
  const rows = (items ?? []) as Array<{
    id: number;
    name: string;
    owner_id?: string | null;
    average_rating: number | null;
    game_type?: string | null;
  }>;
  const [globalAverage, voteStats, creatorByOwnerId] = await Promise.all([
    getGlobalAverageRating("battle_game_ratings"),
    getNumericEntityVoteStats("battle_game_ratings", "battle_game_id", rows.map((r) => r.id)),
    getDisplayNamesForOwnerIds(rows.map((r) => r.owner_id)),
  ]);

  return (
    <main className="p-10 text-white space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Battlegames</h1>
        <Link href="/battlegames/new" className="px-3 py-2 bg-blue-600 rounded text-sm">
          Create Battlegame
        </Link>
      </div>
      <AutoQuerySelect
        name="gameType"
        label="Game Type"
        value={gameType}
        clearValue="All"
        options={BATTLEGAME_TYPES.map((type) => ({ value: type, label: type }))}
      />
      <ul className="border border-neutral-800 rounded-lg divide-y divide-neutral-800">
        {(items ?? []).length === 0 ? (
          <li className="px-4 py-8 text-neutral-500 text-center">No battlegames yet.</li>
        ) : null}
        {rows.map((m) => {
          const stat = voteStats.get(m.id) ?? { votes: 0, rawAverage: Number(m.average_rating ?? 0) };
          const tierData = computeTierResult(stat.rawAverage, stat.votes, globalAverage);
          return (
          <li key={m.id} className="px-4 py-3 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
            <div className="min-w-0">
              <Link href={`/battlegames/${m.id}`} className="text-blue-400 hover:underline">
                {m.name} {m.game_type ? <span className="text-xs text-neutral-500">({m.game_type})</span> : null}
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
