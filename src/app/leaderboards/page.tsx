import Link from "next/link";
import TierBadge from "@/components/TierBadge";
import AutoQuerySelect from "@/components/AutoQuerySelect";
import { getAllSpellsList, getClassLeaderboard, getLeaderboardBuilds } from "@/lib/queries/spellbook";
import type { BuildRow } from "@/lib/spellbook/types";
import { createClient } from "@/lib/server/supabaseServer";
import { getGlobalAverageRating, getNumericEntityVoteStats } from "@/lib/queries/ratingStats";
import { computeTierResult } from "@/lib/tier";
import { BATTLEGAME_TYPES } from "@/lib/battlegames";

type Search = { lb?: string; gameType?: string };
type BattleGameRow = { id: number; name: string; average_rating: number | null; created_at?: string | null };
type SimpleEntityRow = { id: number; name: string; average_rating: number | null; created_at?: string | null };

async function getBattleGamesLeaderboard(gameType: string) {
  const supabase = await createClient();
  let query = supabase.from("battle_games").select("*");
  if (gameType && gameType !== "All") query = query.eq("game_type", gameType);
  const { data } = await query;
  const rows = (data ?? []) as BattleGameRow[];
  const [globalAverage, voteStats] = await Promise.all([
    getGlobalAverageRating("battle_game_ratings"),
    getNumericEntityVoteStats("battle_game_ratings", "battle_game_id", rows.map((r) => r.id)),
  ]);

  return rows
    .map((r) => {
      const stat = voteStats.get(r.id) ?? { votes: 0, rawAverage: Number(r.average_rating ?? 0) };
      const tierData = computeTierResult(stat.rawAverage, stat.votes, globalAverage);
      return { ...r, weighted_rating: tierData.weightedRating, tier: tierData.tier, tier_rank: tierData.tierRank, votes: stat.votes };
    })
    .sort(
      (a, b) =>
        a.tier_rank - b.tier_rank ||
        b.weighted_rating - a.weighted_rating ||
        b.votes - a.votes ||
        String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))
    );
}

export default async function LeaderboardsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { lb = "all", gameType = "All" } = await searchParams;

  const showBuilds = lb === "all" || lb === "builds";
  const showSpells = lb === "all" || lb === "spells";
  const showClasses = lb === "all" || lb === "classes";
  const showBattleGames = lb === "all" || lb === "battle-games";
  const showMonsters = lb === "all" || lb === "monsters";
  const showCustomClasses = lb === "all" || lb === "custom-classes";
  const showCustomSpells = lb === "all" || lb === "custom-spells";

  const [builds, spells, classes, battleGames, monsters, customClasses, customSpells] = await Promise.all([
    showBuilds ? getLeaderboardBuilds(200) : Promise.resolve([] as BuildRow[]),
    showSpells ? getAllSpellsList() : Promise.resolve([]),
    showClasses ? getClassLeaderboard() : Promise.resolve([]),
    showBattleGames ? getBattleGamesLeaderboard(gameType) : Promise.resolve([]),
    showMonsters
      ? (async () => {
          const supabase = await createClient();
          const { data } = await supabase.from("monsters").select("*");
          const rows = (data ?? []) as SimpleEntityRow[];
          const [globalAverage, voteStats] = await Promise.all([
            getGlobalAverageRating("monster_ratings"),
            getNumericEntityVoteStats("monster_ratings", "monster_id", rows.map((r) => r.id)),
          ]);
          return rows
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
        })()
      : Promise.resolve([]),
    showCustomClasses
      ? (async () => {
          const supabase = await createClient();
          const { data } = await supabase.from("custom_classes").select("*");
          const rows = (data ?? []) as SimpleEntityRow[];
          const [globalAverage, voteStats] = await Promise.all([
            getGlobalAverageRating("custom_class_ratings"),
            getNumericEntityVoteStats("custom_class_ratings", "custom_class_id", rows.map((r) => r.id)),
          ]);
          return rows
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
        })()
      : Promise.resolve([]),
    showCustomSpells
      ? (async () => {
          const supabase = await createClient();
          const { data } = await supabase.from("custom_spells").select("*");
          const rows = (data ?? []) as SimpleEntityRow[];
          const [globalAverage, voteStats] = await Promise.all([
            getGlobalAverageRating("custom_spell_ratings"),
            getNumericEntityVoteStats("custom_spell_ratings", "custom_spell_id", rows.map((r) => r.id)),
          ]);
          return rows
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
        })()
      : Promise.resolve([]),
  ]);

  const byClassLevel = new Map<string, BuildRow[]>();
  if (showBuilds) {
    for (const b of builds) {
      const key = `${b.class} · L${b.level}`;
      if (!byClassLevel.has(key)) byClassLevel.set(key, []);
      byClassLevel.get(key)!.push(b);
    }
  }
  const keys = showBuilds ? [...byClassLevel.keys()].sort() : [];

  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white space-y-6 sm:space-y-8">
      <div className="flex flex-wrap gap-4 items-baseline justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">Leaderboards</h1>
        <AutoQuerySelect
          name="lb"
          label="Show"
          value={lb}
          clearValue="all"
          options={[
            { value: "all", label: "ALL" },
            { value: "builds", label: "Builds" },
            { value: "spells", label: "Spells" },
            { value: "classes", label: "Classes" },
            { value: "battle-games", label: "Battlegames" },
            { value: "monsters", label: "Monsters" },
            { value: "custom-classes", label: "Custom classes" },
            { value: "custom-spells", label: "Custom spells" },
          ]}
          preserveKeys={["gameType"]}
        />
      </div>
      <p className="text-sm text-neutral-400 max-w-2xl">
        Tierlists ranked by tier, weighted rating, and vote count (Bayesian smoothing m=10). Run{" "}
        <code className="text-neutral-300">metagard_extended_features.sql</code> so ratings and{" "}
        <code className="text-neutral-300">spells.average_rating</code> stay in sync.
      </p>

      {showBuilds ? (
        <>
          <section>
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <h2 className="text-lg font-semibold mb-3">Top builds (global)</h2>
            </div>
            <div className="border border-neutral-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm border-collapse table-fixed">
                <thead className="bg-neutral-900">
                  <tr>
                    <th className="px-4 py-2 text-left border-b border-neutral-800 w-12">#</th>
                    <th className="px-4 py-2 text-left border-b border-neutral-800">Build</th>
                    <th className="px-4 py-2 text-left border-b border-neutral-800 w-20">Tier</th>
                    <th className="px-4 py-2 text-left border-b border-neutral-800 w-24">WR</th>
                    <th className="px-4 py-2 text-left border-b border-neutral-800 w-20">Votes</th>
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
                      <td className="px-4 py-2 border-b border-neutral-800">
                        {Number(b.weighted_rating ?? 0).toFixed(2)}
                      </td>
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
                <div key={key} className="border border-neutral-800 rounded-lg p-3 sm:p-4">
                  <h3 className="font-medium text-neutral-200 mb-2">{key}</h3>
                  <div className="border border-neutral-800 rounded-lg overflow-hidden">
                    <table className="w-full text-sm border-collapse table-fixed">
                      <thead className="bg-neutral-900">
                        <tr>
                          <th className="px-4 py-2 text-left border-b border-neutral-800 w-12">#</th>
                          <th className="px-4 py-2 text-left border-b border-neutral-800">Build</th>
                          <th className="px-4 py-2 text-left border-b border-neutral-800 w-20">Tier</th>
                          <th className="px-4 py-2 text-left border-b border-neutral-800 w-24">WR</th>
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
                            <td className="px-4 py-2 border-b border-neutral-800">
                              {Number(b.weighted_rating ?? 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {showSpells ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between flex-wrap gap-4">
            <h2 className="text-lg font-semibold">Spells</h2>
            <Link href="/leaderboards/spells" className="text-sm text-blue-400 hover:underline">
              Open spell leaderboard →
            </Link>
          </div>
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
                {[...spells]
                  .sort(
                    (a, b) =>
                      Number(a.tier_rank ?? 99) - Number(b.tier_rank ?? 99) ||
                      Number(b.weighted_rating ?? 0) - Number(a.weighted_rating ?? 0) ||
                      Number(b.ratings_count ?? 0) - Number(a.ratings_count ?? 0)
                  )
                  .slice(0, 25)
                  .map((s, i) => (
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
        </section>
      ) : null}

      {showClasses ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between flex-wrap gap-4">
            <h2 className="text-lg font-semibold">Classes</h2>
            <Link href="/leaderboards/classes" className="text-sm text-blue-400 hover:underline">
              Open class leaderboard →
            </Link>
          </div>
          <div className="border border-neutral-800 rounded-lg overflow-hidden">
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
                {classes.slice(0, 25).map((r, i) => (
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
        </section>
      ) : null}

      {showBattleGames ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between flex-wrap gap-4">
            <h2 className="text-lg font-semibold">Battlegames</h2>
            <Link href="/leaderboards/battlegames" className="text-sm text-blue-400 hover:underline">
              Open battlegames leaderboard →
            </Link>
          </div>
          <AutoQuerySelect
            name="gameType"
            label="Game Type"
            value={gameType}
            clearValue="All"
            preserveKeys={["lb"]}
            options={BATTLEGAME_TYPES.map((type) => ({ value: type, label: type }))}
          />
          <div className="border border-neutral-800 rounded-lg overflow-hidden">
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
                {battleGames.slice(0, 25).map((r, i) => (
                  <tr key={r.id} className="hover:bg-neutral-900/40">
                    <td className="px-4 py-2 border-b border-neutral-800 text-neutral-500">{i + 1}</td>
                    <td className="px-4 py-2 border-b border-neutral-800">
                      <Link href={`/battlegames/${r.id}`} className="text-blue-400 hover:underline">
                        {r.name}
                      </Link>
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
        </section>
      ) : null}

      {showMonsters ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between flex-wrap gap-4">
            <h2 className="text-lg font-semibold">Monsters</h2>
            <Link href="/leaderboards/monsters" className="text-sm text-blue-400 hover:underline">
              Open monsters leaderboard →
            </Link>
          </div>
          <div className="border border-neutral-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm border-collapse table-fixed">
              <thead className="bg-neutral-900">
                <tr>
                  <th className="px-4 py-2 text-left border-b border-neutral-800 w-12">#</th>
                  <th className="px-4 py-2 text-left border-b border-neutral-800">Monster</th>
                  <th className="px-4 py-2 text-left border-b border-neutral-800 w-20">Tier</th>
                  <th className="px-4 py-2 text-left border-b border-neutral-800 w-24">WR</th>
                  <th className="px-4 py-2 text-left border-b border-neutral-800 w-20">Votes</th>
                </tr>
              </thead>
              <tbody>
                {monsters.slice(0, 25).map((r, i) => (
                  <tr key={r.id} className="hover:bg-neutral-900/40">
                    <td className="px-4 py-2 border-b border-neutral-800 text-neutral-500">{i + 1}</td>
                    <td className="px-4 py-2 border-b border-neutral-800">
                      <Link href={`/monsters/${r.id}`} className="text-blue-400 hover:underline">
                        {r.name}
                      </Link>
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
        </section>
      ) : null}

      {showCustomClasses ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between flex-wrap gap-4">
            <h2 className="text-lg font-semibold">Custom classes</h2>
            <Link href="/leaderboards/custom-classes" className="text-sm text-blue-400 hover:underline">
              Open custom classes leaderboard →
            </Link>
          </div>
          <div className="border border-neutral-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm border-collapse table-fixed">
              <thead className="bg-neutral-900">
                <tr>
                  <th className="px-4 py-2 text-left border-b border-neutral-800 w-12">#</th>
                  <th className="px-4 py-2 text-left border-b border-neutral-800">Custom class</th>
                  <th className="px-4 py-2 text-left border-b border-neutral-800 w-20">Tier</th>
                  <th className="px-4 py-2 text-left border-b border-neutral-800 w-24">WR</th>
                  <th className="px-4 py-2 text-left border-b border-neutral-800 w-20">Votes</th>
                </tr>
              </thead>
              <tbody>
                {customClasses.slice(0, 25).map((r, i) => (
                  <tr key={r.id} className="hover:bg-neutral-900/40">
                    <td className="px-4 py-2 border-b border-neutral-800 text-neutral-500">{i + 1}</td>
                    <td className="px-4 py-2 border-b border-neutral-800">
                      <Link href={`/custom-classes/${r.id}`} className="text-blue-400 hover:underline">
                        {r.name}
                      </Link>
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
        </section>
      ) : null}

      {showCustomSpells ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between flex-wrap gap-4">
            <h2 className="text-lg font-semibold">Custom spells</h2>
            <Link href="/leaderboards/custom-spells" className="text-sm text-blue-400 hover:underline">
              Open custom spells leaderboard →
            </Link>
          </div>
          <div className="border border-neutral-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm border-collapse table-fixed">
              <thead className="bg-neutral-900">
                <tr>
                  <th className="px-4 py-2 text-left border-b border-neutral-800 w-12">#</th>
                  <th className="px-4 py-2 text-left border-b border-neutral-800">Custom spell</th>
                  <th className="px-4 py-2 text-left border-b border-neutral-800 w-20">Tier</th>
                  <th className="px-4 py-2 text-left border-b border-neutral-800 w-24">WR</th>
                  <th className="px-4 py-2 text-left border-b border-neutral-800 w-20">Votes</th>
                </tr>
              </thead>
              <tbody>
                {customSpells.slice(0, 25).map((r, i) => (
                  <tr key={r.id} className="hover:bg-neutral-900/40">
                    <td className="px-4 py-2 border-b border-neutral-800 text-neutral-500">{i + 1}</td>
                    <td className="px-4 py-2 border-b border-neutral-800">
                      <Link href={`/custom-spells/${r.id}`} className="text-blue-400 hover:underline">
                        {r.name}
                      </Link>
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
        </section>
      ) : null}
    </main>
  );
}
