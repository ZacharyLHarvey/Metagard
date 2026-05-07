import Link from "next/link";
import { notFound } from "next/navigation";
import BuildCommentsSection from "@/components/BuildCommentsSection";
import BuildRatingSection from "@/components/BuildRatingSection";
import BuildSpellDetails from "@/components/BuildSpellDetails";
import CloneBuildButton from "@/components/CloneBuildButton";
import TierBadge from "@/components/TierBadge";
import { getGlobalAverageRating, getNumericEntityVoteStats } from "@/lib/queries/ratingStats";
import { getProfile } from "@/lib/queries/getProfile";
import { getBuildById, getBuildSpellSelections, getCatalogSpellsForClass } from "@/lib/queries/spellbook";
import { getMyBuildRating } from "@/lib/queries/social";
import { computeTierResult } from "@/lib/tier";
import { isMartialClass } from "@/lib/spellbook/martial";

type Params = {
  params: Promise<{ id: string }>;
};

export default async function BuildDetailsPage({ params }: Params) {
  const { id } = await params;
  const buildId = Number(id);

  const build = await getBuildById(buildId);
  if (!build) notFound();

  const [selections, spells, profile] = await Promise.all([
    getBuildSpellSelections(buildId),
    getCatalogSpellsForClass(build.class, build.level),
    getProfile(),
  ]);

  const profileId = profile && "id" in profile && profile.id != null ? String(profile.id) : null;
  const myRating = profileId ? await getMyBuildRating(buildId, profileId) : null;
  const [globalAverage, voteStats] = await Promise.all([
    getGlobalAverageRating("build_ratings"),
    getNumericEntityVoteStats("build_ratings", "build_id", [buildId]),
  ]);
  const stat = voteStats.get(buildId) ?? { votes: 0, rawAverage: Number(build.average_rating ?? 0) };
  const tierData = computeTierResult(stat.rawAverage, stat.votes, globalAverage);

  const canAct = Boolean(profile);
  const martial = isMartialClass(build.class);

  return (
    <main className="p-10 text-white space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{build.name}</h1>
          <p className="text-neutral-400">
            {build.class} level {build.level} {build.look_the_part ? "- Look The Part" : ""}
          </p>
          {build.notes ? <p className="text-sm text-neutral-500 mt-2 whitespace-pre-wrap">{build.notes}</p> : null}
          <dl className="mt-4 space-y-2 text-sm text-neutral-300 max-w-2xl">
            {build.play_style ? (
              <>
                <dt className="text-neutral-500 font-medium">Play style</dt>
                <dd className="whitespace-pre-wrap">{build.play_style}</dd>
              </>
            ) : null}
            {build.build_priority ? (
              <>
                <dt className="text-neutral-500 font-medium">Priority</dt>
                <dd>{build.build_priority}</dd>
              </>
            ) : null}
            {build.synergy ? (
              <>
                <dt className="text-neutral-500 font-medium">Synergy</dt>
                <dd className="whitespace-pre-wrap">{build.synergy}</dd>
              </>
            ) : null}
            {build.enemies ? (
              <>
                <dt className="text-neutral-500 font-medium">Enemies / counters</dt>
                <dd className="whitespace-pre-wrap">{build.enemies}</dd>
              </>
            ) : null}
            {build.recommended_gear ? (
              <>
                <dt className="text-neutral-500 font-medium">Recommended gear</dt>
                <dd className="whitespace-pre-wrap">{build.recommended_gear}</dd>
              </>
            ) : null}
          </dl>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/builds/${build.id}/settings`} className="px-3 py-2 bg-neutral-700 rounded">
            Settings
          </Link>
          <Link href={`/builds/${build.id}/edit`} className="px-3 py-2 bg-amber-600 rounded">
            Edit Spells
          </Link>
        </div>
      </div>

      <section className="rounded-lg border border-neutral-800 p-4 space-y-3">
        <p className="text-sm text-neutral-400">
          <TierBadge tier={tierData.tier} /> · Weighted:{" "}
          <span className="text-neutral-200 font-semibold">{tierData.weightedRating.toFixed(2)}</span> · Raw:{" "}
          <span className="text-neutral-200 font-semibold">{stat.rawAverage.toFixed(2)}</span> ★ · {stat.votes} vote
          {stat.votes === 1 ? "" : "s"}
        </p>
        <BuildRatingSection buildId={buildId} canRate={canAct} initialMyRating={myRating} />
        <CloneBuildButton buildId={buildId} canClone={canAct} />
      </section>

      <BuildSpellDetails
        selections={selections}
        spells={spells}
        className={build.class}
        lookThePart={build.look_the_part}
      />
      {martial ? (
        <p className="text-xs text-neutral-400">
          Martial class build: abilities are auto-assigned by class/level. Look The Part grants class-specific LTP ability only.
        </p>
      ) : null}

      <BuildCommentsSection buildId={buildId} canComment={canAct} />
    </main>
  );
}
