import Link from "next/link";
import { notFound } from "next/navigation";
import CreatorAttribution from "@/components/CreatorAttribution";
import EntityRatingButtons from "@/components/EntityRatingButtons";
import TierBadge from "@/components/TierBadge";
import { getGlobalAverageRating, getNumericEntityVoteStats } from "@/lib/queries/ratingStats";
import { getDisplayNamesForOwnerIds } from "@/lib/queries/publicProfiles";
import { getProfile } from "@/lib/queries/getProfile";
import { createClient } from "@/lib/server/supabaseServer";
import { computeTierResult } from "@/lib/tier";

type Params = { params: Promise<{ id: string }> };

export default async function MonsterDetailPage({ params }: Params) {
  const { id } = await params;
  const mid = Number(id);
  const supabase = await createClient();
  const { data: m } = await supabase.from("monsters").select("*").eq("id", mid).maybeSingle();
  if (!m) notFound();

  const profile = await getProfile();
  const profileId = profile && "id" in profile && profile.id != null ? String(profile.id) : null;

  let myRating: number | null = null;
  if (profileId) {
    const { data: r } = await supabase
      .from("monster_ratings")
      .select("rating")
      .eq("monster_id", mid)
      .eq("user_id", profileId)
      .maybeSingle();
    if (r && typeof r.rating === "number") myRating = r.rating;
  }
  const [globalAverage, voteStats] = await Promise.all([
    getGlobalAverageRating("monster_ratings"),
    getNumericEntityVoteStats("monster_ratings", "monster_id", [mid]),
  ]);
  const stat = voteStats.get(mid) ?? { votes: 0, rawAverage: Number(m.average_rating ?? 0) };
  const tierData = computeTierResult(stat.rawAverage, stat.votes, globalAverage);
  const ownerId = typeof m.owner_id === "string" ? m.owner_id : null;
  const creatorMap = await getDisplayNamesForOwnerIds([ownerId]);
  const creatorName = ownerId ? (creatorMap.get(ownerId) ?? "Player") : "Player";

  return (
    <main className="p-10 text-white max-w-2xl space-y-6">
      <Link href="/monsters" className="text-sm text-blue-400 hover:underline">
        ← Monsters
      </Link>
      <h1 className="text-2xl font-bold">{String(m.name)}</h1>
      <p className="text-neutral-400 text-sm">
        <TierBadge tier={tierData.tier} /> · {tierData.weightedRating.toFixed(2)} · Raw ★ {stat.rawAverage.toFixed(2)} · {stat.votes} votes
      </p>
      <CreatorAttribution ownerId={ownerId} displayName={creatorName} />
      {m.image_url ? <img src={String(m.image_url)} alt={String(m.name)} className="w-full max-h-96 object-contain rounded border border-neutral-800" /> : null}
      <div className="grid md:grid-cols-2 gap-3 text-sm">
        {m.monster_type ? <p><span className="text-neutral-400">Type:</span> {String(m.monster_type)}</p> : null}
        {m.threat_level ? <p><span className="text-neutral-400">Threat:</span> {String(m.threat_level)}</p> : null}
        {m.armor_points ? <p><span className="text-neutral-400">Armor:</span> {String(m.armor_points)}</p> : null}
      </div>
      {m.abilities ? <p className="text-sm whitespace-pre-wrap text-neutral-300"><span className="text-neutral-400">Abilities: </span>{String(m.abilities)}</p> : null}
      {m.immunities ? <p className="text-sm whitespace-pre-wrap text-neutral-300"><span className="text-neutral-400">Immunities: </span>{String(m.immunities)}</p> : null}
      {m.description ? <p className="text-sm whitespace-pre-wrap text-neutral-300">{String(m.description)}</p> : null}

      <section className="border border-neutral-800 rounded-lg p-4">
        <p className="text-sm text-neutral-400 mb-2">Your Rating</p>
        <EntityRatingButtons
          postUrl={`/api/monsters/${mid}/rating`}
          canRate={Boolean(profileId)}
          initialMyRating={myRating}
        />
      </section>
    </main>
  );
}
