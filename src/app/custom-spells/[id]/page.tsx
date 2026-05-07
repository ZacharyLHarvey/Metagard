import Link from "next/link";
import { notFound } from "next/navigation";
import EntityRatingButtons from "@/components/EntityRatingButtons";
import TierBadge from "@/components/TierBadge";
import { getGlobalAverageRating, getNumericEntityVoteStats } from "@/lib/queries/ratingStats";
import { getProfile } from "@/lib/queries/getProfile";
import { createClient } from "@/lib/server/supabaseServer";
import { computeTierResult } from "@/lib/tier";

type Params = { params: Promise<{ id: string }> };

export default async function CustomSpellDetailPage({ params }: Params) {
  const { id } = await params;
  const eid = Number(id);
  const supabase = await createClient();
  const { data: m } = await supabase.from("custom_spells").select("*").eq("id", eid).maybeSingle();
  if (!m) notFound();

  const profile = await getProfile();
  const profileId = profile && "id" in profile && profile.id != null ? String(profile.id) : null;

  let myRating: number | null = null;
  if (profileId) {
    const { data: r } = await supabase
      .from("custom_spell_ratings")
      .select("rating")
      .eq("custom_spell_id", eid)
      .eq("user_id", profileId)
      .maybeSingle();
    if (r && typeof r.rating === "number") myRating = r.rating;
  }
  const [globalAverage, voteStats] = await Promise.all([
    getGlobalAverageRating("custom_spell_ratings"),
    getNumericEntityVoteStats("custom_spell_ratings", "custom_spell_id", [eid]),
  ]);
  const stat = voteStats.get(eid) ?? { votes: 0, rawAverage: Number(m.average_rating ?? 0) };
  const tierData = computeTierResult(stat.rawAverage, stat.votes, globalAverage);

  return (
    <main className="p-10 text-white max-w-2xl space-y-6">
      <Link href="/custom-spells" className="text-sm text-blue-400 hover:underline">
        ← Custom Spells
      </Link>
      <h1 className="text-2xl font-bold">{String(m.name)}</h1>
      <p className="text-neutral-400 text-sm">
        <TierBadge tier={tierData.tier} /> · WR {tierData.weightedRating.toFixed(2)} · Raw ★ {stat.rawAverage.toFixed(2)} · {stat.votes} votes
      </p>
      {m.image_url ? <img src={String(m.image_url)} alt={String(m.name)} className="w-full max-h-96 object-contain rounded border border-neutral-800" /> : null}
      <div className="grid md:grid-cols-2 gap-3 text-sm">
        {m.spell_type ? <p><span className="text-neutral-400">Type (T):</span> {String(m.spell_type)}</p> : null}
        {m.school ? <p><span className="text-neutral-400">School (S):</span> {String(m.school)}</p> : null}
        {m.range ? <p><span className="text-neutral-400">Range (R):</span> {String(m.range)}</p> : null}
        {m.materials ? <p><span className="text-neutral-400">Materials (M):</span> {String(m.materials)}</p> : null}
      </div>
      {m.incantation ? <p className="text-sm whitespace-pre-wrap text-neutral-300"><span className="text-neutral-400">Incantation (I): </span>{String(m.incantation)}</p> : null}
      {m.effect ? <p className="text-sm whitespace-pre-wrap text-neutral-300"><span className="text-neutral-400">Effect (E): </span>{String(m.effect)}</p> : null}
      {m.limitations ? <p className="text-sm whitespace-pre-wrap text-neutral-300"><span className="text-neutral-400">Limitations (L): </span>{String(m.limitations)}</p> : null}
      {m.notes ? <p className="text-sm whitespace-pre-wrap text-neutral-300"><span className="text-neutral-400">Notes (N): </span>{String(m.notes)}</p> : null}
      {m.description ? <p className="text-sm whitespace-pre-wrap text-neutral-300">{String(m.description)}</p> : null}

      <section className="border border-neutral-800 rounded-lg p-4">
        <p className="text-sm text-neutral-400 mb-2">Your rating</p>
        <EntityRatingButtons
          postUrl={`/api/custom-spells/${eid}/rating`}
          canRate={Boolean(profileId)}
          initialMyRating={myRating}
        />
      </section>
    </main>
  );
}
