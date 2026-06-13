import Link from "next/link";
import { notFound } from "next/navigation";
import ArcherArrowTotalsSection from "@/components/ArcherArrowTotalsSection";
import BuildCommentsSection from "@/components/BuildCommentsSection";
import BuildInfoSection from "@/components/BuildInfoSection";
import BuildRatingSection from "@/components/BuildRatingSection";
import BuildSideboardSection from "@/components/BuildSideboardSection";
import BuildSpellDetails from "@/components/BuildSpellDetails";
import CloneBuildButton from "@/components/CloneBuildButton";
import CreatorAttribution from "@/components/CreatorAttribution";
import MaterialTotalsSection from "@/components/MaterialTotalsSection";
import {
  BuildSaveProvider,
  BuildSaveToggleButton,
  BuildUsageStatsSaves,
} from "@/components/BuildSaveProvider";
import TierBadge from "@/components/TierBadge";
import type { BuildSpellDisplayMode } from "@/components/BuildSpellDetails";
import {
  customSelectionsToBuildSelectionRows,
  getCatalogSpellsForCustomClass,
  getCustomBuildById,
  getCustomBuildSpellSelections,
  isCustomClassCaster,
  isCustomClassMartial,
} from "@/lib/queries/customClassSpellbook";
import {
  isCustomBuildSavedByCurrentUser,
  resolveCustomBuildSideboardSpells,
} from "@/lib/queries/customBuildSocial";
import { getProfile } from "@/lib/queries/getProfile";
import { getDisplayNamesForOwnerIds } from "@/lib/queries/publicProfiles";
import { getGlobalAverageRating, getNumericEntityVoteStats } from "@/lib/queries/ratingStats";
import { getMyCustomBuildRating } from "@/lib/queries/social";
import { parseBuildViewDefaults } from "@/lib/spellbook/buildDisplayDefaults";
import { computeTierResult } from "@/lib/tier";
import type { ReactNode } from "react";

type Params = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ display?: string }>;
};

export default async function CustomBuildDetailPage({ params, searchParams }: Params) {
  const { id } = await params;
  const { display: rawDisplay } = await searchParams;
  const buildId = Number(id);
  const build = await getCustomBuildById(buildId);
  if (!build || !build.custom_class) notFound();

  const customClass = build.custom_class;
  const [selections, spells, profile] = await Promise.all([
    getCustomBuildSpellSelections(buildId),
    getCatalogSpellsForCustomClass(customClass.id, build.level),
    getProfile(),
  ]);

  const buildRows = customSelectionsToBuildSelectionRows(selections, buildId);

  const viewDefaults = parseBuildViewDefaults(
    profile && "build_view_defaults" in profile ? profile.build_view_defaults : undefined
  );
  const display: BuildSpellDisplayMode =
    rawDisplay === "type" || rawDisplay === "school" || rawDisplay === "level"
      ? rawDisplay
      : viewDefaults.display;

  const profileId = profile && "id" in profile && profile.id != null ? String(profile.id) : null;
  const myRating = profileId ? await getMyCustomBuildRating(buildId, profileId) : null;
  const [globalAverage, voteStats] = await Promise.all([
    getGlobalAverageRating("custom_build_ratings"),
    getNumericEntityVoteStats("custom_build_ratings", "custom_build_id", [buildId]),
  ]);
  const stat = voteStats.get(buildId) ?? { votes: 0, rawAverage: Number(build.average_rating ?? 0) };
  const tierData = computeTierResult(stat.rawAverage, stat.votes, globalAverage);

  const canAct = Boolean(profile);
  const canManageBuild = profileId != null && profileId === build.owner_id;
  const showSaveControls = canAct && !canManageBuild;
  const isSaved = showSaveControls ? await isCustomBuildSavedByCurrentUser(buildId) : false;
  const initialSaveCount = Math.max(0, Number(build.save_count ?? 0));
  const martial = isCustomClassMartial(customClass.class_type);
  const caster = isCustomClassCaster(customClass.class_type);

  const creatorMap = await getDisplayNamesForOwnerIds(
    build.owner_id ? [build.owner_id] : []
  );
  const creatorName = build.owner_id ? (creatorMap.get(build.owner_id) ?? "Player") : "Player";

  const sideboardSpellsOrdered = caster
    ? await resolveCustomBuildSideboardSpells(build.sideboard, spells)
    : [];

  const usageStatsSection = (savesLine: ReactNode) => (
    <section className="mt-3 text-sm text-neutral-400 space-y-1" aria-label="Usage statistics">
      <p className="text-neutral-500 font-medium">Usage Stats</p>
      {savesLine}
      <p>
        Clones:{" "}
        <span className="text-neutral-200 tabular-nums">{Math.max(0, Number(build.clone_count ?? 0))}</span>
      </p>
    </section>
  );

  const buildHeaderLeft = (savesLine: ReactNode) => (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold break-words">{build.name}</h1>
      <p className="text-neutral-400">
        {customClass.name} level {build.level} {build.look_the_part ? "- Look The Part" : ""}
      </p>
      {build.notes ? (
        <p className="text-sm text-neutral-500 mt-2 whitespace-pre-wrap">{build.notes}</p>
      ) : null}
      <div className="mt-2">
        <CreatorAttribution ownerId={build.owner_id} displayName={creatorName} />
      </div>
      {usageStatsSection(savesLine)}
    </div>
  );

  const buildHeaderActions = showSaveControls ? (
    <div className="flex flex-wrap gap-2 [&_button]:px-3 [&_button]:py-2 [&_button]:text-sm [&_button]:sm:text-base">
      <BuildSaveToggleButton />
    </div>
  ) : canManageBuild ? (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/custom-builds/${buildId}/settings`}
        className="px-3 py-2 bg-neutral-700 rounded text-sm sm:text-base"
      >
        Settings
      </Link>
      <Link
        href={`/custom-builds/${buildId}/edit`}
        className="px-3 py-2 bg-amber-600 rounded text-sm sm:text-base"
      >
        Edit Spells
      </Link>
    </div>
  ) : null;

  const staticSavesLine = (
    <p>
      Saves: <span className="text-neutral-200 tabular-nums">{initialSaveCount}</span>
    </p>
  );

  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white space-y-5 sm:space-y-6 max-w-6xl">
      <Link href="/custom-builds" className="text-sm text-blue-400 hover:underline">
        ← Custom Builds
      </Link>

      {showSaveControls ? (
        <BuildSaveProvider
          buildId={buildId}
          initialSaved={isSaved}
          initialSaveCount={initialSaveCount}
          saveApiUrl={`/api/custom-builds/${buildId}/save`}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            {buildHeaderLeft(<BuildUsageStatsSaves />)}
            {buildHeaderActions}
          </div>
        </BuildSaveProvider>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-4">
          {buildHeaderLeft(staticSavesLine)}
          {buildHeaderActions}
        </div>
      )}

      <section className="rounded-lg border border-neutral-800 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-neutral-400">
            <TierBadge tier={tierData.tier} /> · Weighted:{" "}
            <span className="text-neutral-200 font-semibold">{tierData.weightedRating.toFixed(2)}</span> · Raw:{" "}
            <span className="text-neutral-200 font-semibold">{stat.rawAverage.toFixed(2)}</span> ★ · {stat.votes}{" "}
            vote
            {stat.votes === 1 ? "" : "s"}
          </p>
          <CloneBuildButton
            buildId={buildId}
            canClone={canAct}
            cloneApiUrl={`/api/custom-builds/${buildId}/clone`}
            redirectPathPrefix="/custom-builds"
          />
        </div>
      </section>

      <section className="border border-neutral-800 rounded-lg overflow-hidden">
        <h3 className="px-4 py-2 bg-neutral-900 border-b border-neutral-800 font-semibold">Equipment</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <tbody>
              <tr>
                <td className="px-4 py-2 border-b border-neutral-800 text-neutral-400">Armor</td>
                <td className="px-4 py-2 border-b border-neutral-800">{customClass.armor ?? "—"}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border-b border-neutral-800 text-neutral-400">Shields</td>
                <td className="px-4 py-2 border-b border-neutral-800">{customClass.shields ?? "—"}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border-b border-neutral-800 text-neutral-400">Weapons</td>
                <td className="px-4 py-2 border-b border-neutral-800">{customClass.weapons ?? "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <BuildSpellDetails
        className={customClass.name}
        buildMaxLevel={build.level}
        lookThePart={build.look_the_part}
        spells={spells}
        selections={buildRows}
        display={display}
        spellbookTipsEnabled={profile?.spellbook_tips_enabled !== false}
        initialShowTypeSchool={viewDefaults.showTypeSchool}
        initialShowIncantation={viewDefaults.showIncantation}
        initialShowMaterials={viewDefaults.showMaterials}
        initialShowRange={viewDefaults.showRange}
      />

      {customClass.name === "Archer" ? (
        <ArcherArrowTotalsSection
          selections={buildRows}
          extraSelections={[]}
          spells={spells}
          lookThePart={build.look_the_part}
          className={customClass.name}
        />
      ) : (
        <MaterialTotalsSection
          selections={buildRows}
          extraSelections={[]}
          spells={spells}
          lookThePart={build.look_the_part}
          className={customClass.name}
        />
      )}

      {martial ? (
        <p className="text-xs text-neutral-400">
          Custom martial class build: abilities come from your class catalog only (no official archetype grant
          spells). Look The Part adds LtP abilities defined on the class.
        </p>
      ) : null}

      <BuildInfoSection
        playStyle={build.play_style}
        buildPriority={build.build_priority}
        synergy={build.synergy}
        enemies={build.enemies}
        recommendedGear={build.recommended_gear}
      />

      {caster ? (
        <BuildSideboardSection
          spells={sideboardSpellsOrdered}
          spellbookTipsEnabled={profile?.spellbook_tips_enabled !== false}
        />
      ) : null}

      <section className="rounded-lg border border-neutral-800 p-4 space-y-3">
        <p className="text-sm text-neutral-400">Rate This Build</p>
        <BuildRatingSection
          buildId={buildId}
          canRate={canAct}
          initialMyRating={myRating}
          ratingApiUrl={`/api/custom-builds/${buildId}/rating`}
        />
      </section>

      <BuildCommentsSection
        buildId={buildId}
        canComment={canAct}
        commentsApiUrl={`/api/custom-builds/${buildId}/comments`}
      />
    </main>
  );
}
