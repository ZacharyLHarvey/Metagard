import Link from "next/link";
import { notFound } from "next/navigation";
import EntityRatingButtons from "@/components/EntityRatingButtons";
import TierBadge from "@/components/TierBadge";
import { getGlobalAverageRating, getNumericEntityVoteStats } from "@/lib/queries/ratingStats";
import { getProfile } from "@/lib/queries/getProfile";
import { createClient } from "@/lib/server/supabaseServer";
import { computeTierResult } from "@/lib/tier";

type Params = { params: Promise<{ id: string }> };

export default async function CustomClassDetailPage({ params }: Params) {
  const { id } = await params;
  const eid = Number(id);
  const supabase = await createClient();
  const { data: m } = await supabase.from("custom_classes").select("*").eq("id", eid).maybeSingle();
  if (!m) notFound();

  const profile = await getProfile();
  const profileId = profile && "id" in profile && profile.id != null ? String(profile.id) : null;

  let myRating: number | null = null;
  if (profileId) {
    const { data: r } = await supabase
      .from("custom_class_ratings")
      .select("rating")
      .eq("custom_class_id", eid)
      .eq("user_id", profileId)
      .maybeSingle();
    if (r && typeof r.rating === "number") myRating = r.rating;
  }
  const [globalAverage, voteStats] = await Promise.all([
    getGlobalAverageRating("custom_class_ratings"),
    getNumericEntityVoteStats("custom_class_ratings", "custom_class_id", [eid]),
  ]);
  const stat = voteStats.get(eid) ?? { votes: 0, rawAverage: Number(m.average_rating ?? 0) };
  const tierData = computeTierResult(stat.rawAverage, stat.votes, globalAverage);

  return (
    <main className="p-10 text-white max-w-2xl space-y-6">
      <Link href="/custom-classes" className="text-sm text-blue-400 hover:underline">
        ← Custom classes
      </Link>
      <h1 className="text-2xl font-bold">{String(m.name)}</h1>
      <p className="text-neutral-400 text-sm">
        <TierBadge tier={tierData.tier} /> · {tierData.weightedRating.toFixed(2)} · Raw ★ {stat.rawAverage.toFixed(2)} · {stat.votes} votes
      </p>
      {m.description ? <p className="text-sm whitespace-pre-wrap text-neutral-300">{String(m.description)}</p> : null}

      <section className="border border-neutral-800 rounded-lg p-4">
        <p className="text-sm text-neutral-400 mb-2">Your rating</p>
        <EntityRatingButtons
          postUrl={`/api/custom-classes/${eid}/rating`}
          canRate={Boolean(profileId)}
          initialMyRating={myRating}
        />
      </section>
    </main>
  );
}
