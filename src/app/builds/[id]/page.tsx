import Link from "next/link";
import { notFound } from "next/navigation";
import BuildCommentsSection from "@/components/BuildCommentsSection";
import BuildInfoSection from "@/components/BuildInfoSection";
import BuildRatingSection from "@/components/BuildRatingSection";
import BuildSpellDetails from "@/components/BuildSpellDetails";
import CloneBuildButton from "@/components/CloneBuildButton";
import TierBadge from "@/components/TierBadge";
import { getGlobalAverageRating, getNumericEntityVoteStats } from "@/lib/queries/ratingStats";
import { getProfile } from "@/lib/queries/getProfile";
import {
  getBuildById,
  getBuildSpellSelections,
  getCatalogSpellsForClass,
  getClassEquipment,
} from "@/lib/queries/spellbook";
import CreatorAttribution from "@/components/CreatorAttribution";
import { getDisplayNamesForOwnerIds } from "@/lib/queries/publicProfiles";
import { getMyBuildRating } from "@/lib/queries/social";
import { computeTierResult } from "@/lib/tier";
import { isMartialClass } from "@/lib/spellbook/martial";
import type { BuildSpellDisplayMode } from "@/components/BuildSpellDetails";

type Params = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ display?: string }>;
};

export default async function BuildDetailsPage({ params, searchParams }: Params) {
  const { id } = await params;
  const { display: rawDisplay } = await searchParams;
  const display: BuildSpellDisplayMode =
    rawDisplay === "type" || rawDisplay === "school" ? rawDisplay : "level";
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
  const profileOwnerId = profile && "id" in profile && profile.id != null ? String(profile.id) : null;
  const canManageBuild = profileOwnerId != null && profileOwnerId === build.owner_id;
  const martial = isMartialClass(build.class);
  const equipment = martial ? await getClassEquipment(build.class) : null;
  const creatorMap = await getDisplayNamesForOwnerIds([build.owner_id]);
  const creatorName = build.owner_id ? (creatorMap.get(build.owner_id) ?? "Player") : "Player";

  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white space-y-5 sm:space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold break-words">{build.name}</h1>
          <p className="text-neutral-400">
            {build.class} level {build.level} {build.look_the_part ? "- Look The Part" : ""}
          </p>
          {build.notes ? <p className="text-sm text-neutral-500 mt-2 whitespace-pre-wrap">{build.notes}</p> : null}
          <div className="mt-2">
            <CreatorAttribution ownerId={build.owner_id} displayName={creatorName} />
          </div>
        </div>
        {canManageBuild ? (
          <div className="flex flex-wrap gap-2">
            <Link href={`/builds/${build.id}/settings`} className="px-3 py-2 bg-neutral-700 rounded text-sm sm:text-base">
              Settings
            </Link>
            <Link href={`/builds/${build.id}/edit`} className="px-3 py-2 bg-amber-600 rounded text-sm sm:text-base">
              Edit Spells
            </Link>
          </div>
        ) : null}
      </div>

      <section className="rounded-lg border border-neutral-800 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-neutral-400">
            <TierBadge tier={tierData.tier} /> · Weighted:{" "}
            <span className="text-neutral-200 font-semibold">{tierData.weightedRating.toFixed(2)}</span> · Raw:{" "}
            <span className="text-neutral-200 font-semibold">{stat.rawAverage.toFixed(2)}</span> ★ · {stat.votes} vote
            {stat.votes === 1 ? "" : "s"}
          </p>
          <CloneBuildButton buildId={buildId} canClone={canAct} />
        </div>
      </section>

      {martial ? (
        <section className="border border-neutral-800 rounded-lg overflow-hidden">
          <h3 className="px-4 py-2 bg-neutral-900 border-b border-neutral-800 font-semibold">Equipment</h3>
          <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <tbody>
              <tr>
                <td className="px-4 py-2 border-b border-neutral-800 text-neutral-400">Armor</td>
                <td className="px-4 py-2 border-b border-neutral-800">{equipment?.armor ?? "—"}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border-b border-neutral-800 text-neutral-400">Shields</td>
                <td className="px-4 py-2 border-b border-neutral-800">{equipment?.shields ?? "—"}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border-b border-neutral-800 text-neutral-400">Weapons</td>
                <td className="px-4 py-2 border-b border-neutral-800">{equipment?.weapons ?? "—"}</td>
              </tr>
            </tbody>
          </table>
          </div>
        </section>
      ) : null}

      <BuildSpellDetails
        selections={selections}
        spells={spells}
        className={build.class}
        lookThePart={build.look_the_part}
        display={display}
      />
      {martial ? (
        <p className="text-xs text-neutral-400">
          Martial class build: abilities are auto-assigned by class/level. Look The Part grants class-specific LTP ability only.
        </p>
      ) : null}

      <BuildInfoSection
        playStyle={build.play_style}
        buildPriority={build.build_priority}
        synergy={build.synergy}
        enemies={build.enemies}
        recommendedGear={build.recommended_gear}
      />

      <section className="rounded-lg border border-neutral-800 p-4 space-y-3">
        <p className="text-sm text-neutral-400">Rate this build</p>
        <BuildRatingSection buildId={buildId} canRate={canAct} initialMyRating={myRating} />
      </section>

      <BuildCommentsSection buildId={buildId} canComment={canAct} />
    </main>
  );
}
