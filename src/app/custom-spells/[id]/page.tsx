import Link from "next/link";
import { notFound } from "next/navigation";
import CreatorAttribution from "@/components/CreatorAttribution";
import EntityCommentsSection from "@/components/EntityCommentsSection";
import EntityRatingButtons from "@/components/EntityRatingButtons";
import TierBadge from "@/components/TierBadge";
import { getCustomSpellById, getCustomSpellLeaderboard } from "@/lib/queries/customSpells";
import { getDisplayNamesForOwnerIds } from "@/lib/queries/publicProfiles";
import { getProfile } from "@/lib/queries/getProfile";
import { createClient } from "@/lib/server/supabaseServer";

type Params = { params: Promise<{ id: string }> };

export default async function CustomSpellDetailPage({ params }: Params) {
  const { id } = await params;
  const eid = Number(id);
  const spell = await getCustomSpellById(eid);
  if (!spell) notFound();

  const [leaderboard, profile] = await Promise.all([getCustomSpellLeaderboard(), getProfile()]);
  const stat = leaderboard.find((row) => row.id === eid) ?? {
    id: eid,
    name: spell.name,
    average_rating: 0,
    weighted_rating: 0,
    tier: "C" as const,
    tier_rank: 4,
    ratings_count: 0,
  };

  const profileId = profile && "id" in profile && profile.id != null ? String(profile.id) : null;

  let myRating: number | null = null;
  if (profileId) {
    const supabase = await createClient();
    const { data: r } = await supabase
      .from("custom_spell_ratings")
      .select("rating")
      .eq("custom_spell_id", eid)
      .eq("user_id", profileId)
      .maybeSingle();
    if (r && typeof r.rating === "number") myRating = r.rating;
  }

  const ownerId = spell.owner_id;
  const canManage = profileId != null && profileId === ownerId;
  const creatorMap = await getDisplayNamesForOwnerIds([ownerId]);
  const creatorName = ownerId ? (creatorMap.get(ownerId) ?? "Player") : "Player";

  const typeSchool = [spell.spell_type, spell.school].filter(Boolean).join(" · ");

  return (
    <main className="p-10 text-white max-w-2xl space-y-6">
      <Link href="/custom-spells" className="text-sm text-blue-400 hover:underline">
        ← Custom Spells
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{spell.name}</h1>
          <p className="text-sm text-neutral-400 mt-1">
            {typeSchool ? (
              <span className="inline-block px-2 py-0.5 rounded-full border border-neutral-700 text-xs mr-2">
                {typeSchool}
              </span>
            ) : null}
            Custom spell
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage ? (
            <Link href={`/custom-spells/${eid}/edit`} className="px-3 py-2 bg-amber-600 rounded text-sm">
              Edit
            </Link>
          ) : null}
        </div>
      </div>
      <p className="text-sm text-neutral-400">
        <TierBadge tier={stat.tier} /> · {stat.weighted_rating.toFixed(2)} · Raw ★{" "}
        {stat.average_rating.toFixed(2)} · {stat.ratings_count} vote
        {stat.ratings_count === 1 ? "" : "s"}
      </p>

      <section className="border border-neutral-800 rounded-lg p-4">
        <p className="text-sm text-neutral-400 mb-2">Rate This Spell</p>
        <EntityRatingButtons
          postUrl={`/api/custom-spells/${eid}/rating`}
          canRate={Boolean(profileId)}
          initialMyRating={myRating}
        />
      </section>

      <CreatorAttribution ownerId={ownerId} displayName={creatorName} />
      {spell.image_url ? (
        <img
          src={spell.image_url}
          alt={spell.name}
          className="w-full max-h-96 object-contain rounded border border-neutral-800"
        />
      ) : null}
      <div className="grid md:grid-cols-2 gap-3 text-sm">
        {spell.spell_type ? (
          <p>
            <span className="text-neutral-400">Type (T):</span> {spell.spell_type}
          </p>
        ) : null}
        {spell.school ? (
          <p>
            <span className="text-neutral-400">School (S):</span> {spell.school}
          </p>
        ) : null}
        {spell.range ? (
          <p>
            <span className="text-neutral-400">Range (R):</span> {spell.range}
          </p>
        ) : null}
        {spell.materials ? (
          <p>
            <span className="text-neutral-400">Materials (M):</span> {spell.materials}
          </p>
        ) : null}
      </div>
      {spell.incantation ? (
        <p className="text-sm whitespace-pre-wrap text-neutral-300">
          <span className="text-neutral-400">Incantation (I): </span>
          {spell.incantation}
        </p>
      ) : null}
      {spell.effect ? (
        <p className="text-sm whitespace-pre-wrap text-neutral-300">
          <span className="text-neutral-400">Effect (E): </span>
          {spell.effect}
        </p>
      ) : null}
      {spell.limitations ? (
        <p className="text-sm whitespace-pre-wrap text-neutral-300">
          <span className="text-neutral-400">Limitations (L): </span>
          {spell.limitations}
        </p>
      ) : null}
      {spell.notes ? (
        <p className="text-sm whitespace-pre-wrap text-neutral-300">
          <span className="text-neutral-400">Notes (N): </span>
          {spell.notes}
        </p>
      ) : null}
      {spell.description ? (
        <p className="text-sm whitespace-pre-wrap text-neutral-300">{spell.description}</p>
      ) : null}

      <EntityCommentsSection
        commentsApiUrl={`/api/custom-spells/${eid}/comments`}
        canComment={Boolean(profileId)}
      />
    </main>
  );
}
