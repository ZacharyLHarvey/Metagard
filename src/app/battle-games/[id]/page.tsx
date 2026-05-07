import Link from "next/link";
import { notFound } from "next/navigation";
import EntityRatingButtons from "@/components/EntityRatingButtons";
import TierBadge from "@/components/TierBadge";
import { getGlobalAverageRating, getNumericEntityVoteStats } from "@/lib/queries/ratingStats";
import { getProfile } from "@/lib/queries/getProfile";
import { createClient } from "@/lib/server/supabaseServer";
import { computeTierResult } from "@/lib/tier";

type Params = { params: Promise<{ id: string }> };

export default async function BattleGameDetailPage({ params }: Params) {
  const { id } = await params;
  const eid = Number(id);
  const supabase = await createClient();
  const { data: m } = await supabase.from("battle_games").select("*").eq("id", eid).maybeSingle();
  if (!m) notFound();

  const profile = await getProfile();
  const profileId = profile && "id" in profile && profile.id != null ? String(profile.id) : null;

  let myRating: number | null = null;
  if (profileId) {
    const { data: r } = await supabase
      .from("battle_game_ratings")
      .select("rating")
      .eq("battle_game_id", eid)
      .eq("user_id", profileId)
      .maybeSingle();
    if (r && typeof r.rating === "number") myRating = r.rating;
  }
  const [globalAverage, voteStats] = await Promise.all([
    getGlobalAverageRating("battle_game_ratings"),
    getNumericEntityVoteStats("battle_game_ratings", "battle_game_id", [eid]),
  ]);
  const stat = voteStats.get(eid) ?? { votes: 0, rawAverage: Number(m.average_rating ?? 0) };
  const tierData = computeTierResult(stat.rawAverage, stat.votes, globalAverage);

  return (
    <main className="p-10 text-white max-w-2xl space-y-6">
      <Link href="/battlegames" className="text-sm text-blue-400 hover:underline">
        ← Battlegames
      </Link>
      <h1 className="text-2xl font-bold">{String(m.name)}</h1>
      <p className="text-neutral-400 text-sm">
        <TierBadge tier={tierData.tier} /> · WR {tierData.weightedRating.toFixed(2)} · Raw ★ {stat.rawAverage.toFixed(2)} · {stat.votes} votes
      </p>
      {m.image_url ? <img src={String(m.image_url)} alt={String(m.name)} className="w-full max-h-96 object-contain rounded border border-neutral-800" /> : null}
      <div className="grid md:grid-cols-2 gap-3 text-sm">
        {m.game_type ? <p><span className="text-neutral-400">Game Type:</span> {String(m.game_type)}</p> : null}
        {m.lives ? <p><span className="text-neutral-400">Lives:</span> {String(m.lives)}</p> : null}
        {m.respawn ? <p><span className="text-neutral-400">Respawn:</span> {String(m.respawn)}</p> : null}
        {m.base ? <p><span className="text-neutral-400">Base:</span> {String(m.base)}</p> : null}
        {m.teams ? <p><span className="text-neutral-400">Teams:</span> {String(m.teams)}</p> : null}
        {m.objectives ? <p><span className="text-neutral-400">Objectives:</span> {String(m.objectives)}</p> : null}
        {m.refresh ? <p><span className="text-neutral-400">Refresh:</span> {String(m.refresh)}</p> : null}
      </div>
      {m.scenario_rules ? <p className="text-sm whitespace-pre-wrap text-neutral-300"><span className="text-neutral-400">Scenario Rules: </span>{String(m.scenario_rules)}</p> : null}
      {m.description ? <p className="text-sm whitespace-pre-wrap text-neutral-300">{String(m.description)}</p> : null}

      <section className="border border-neutral-800 rounded-lg p-4">
        <p className="text-sm text-neutral-400 mb-2">Your rating</p>
        <EntityRatingButtons
          postUrl={`/api/battlegames/${eid}/rating`}
          canRate={Boolean(profileId)}
          initialMyRating={myRating}
        />
      </section>
    </main>
  );
}
