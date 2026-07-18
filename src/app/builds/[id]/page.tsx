import Link from "next/link";
import { notFound } from "next/navigation";
import BuildCommentsSection from "@/components/BuildCommentsSection";
import BuildInfoSection from "@/components/BuildInfoSection";
import BuildRatingSection from "@/components/BuildRatingSection";
import BuildSideboardSection from "@/components/BuildSideboardSection";
import ArcherArrowTotalsSection from "@/components/ArcherArrowTotalsSection";
import MaterialTotalsSection from "@/components/MaterialTotalsSection";
import BuildSpellDetails from "@/components/BuildSpellDetails";
import CloneBuildButton from "@/components/CloneBuildButton";
import {
  BuildSaveProvider,
  BuildSaveToggleButton,
  BuildUsageStatsSaves,
} from "@/components/BuildSaveProvider";
import TierBadge from "@/components/TierBadge";
import { getGlobalAverageRating, getNumericEntityVoteStats } from "@/lib/queries/ratingStats";
import { getProfile } from "@/lib/queries/getProfile";
import { getBuildGroupsForBuild } from "@/lib/queries/buildGroups";
import {
  getBuildById,
  getBuildSpellSelections,
  getCatalogSpellsForClass,
  getClassEquipment,
  getSpellsByIds,
  isBuildSavedByCurrentUser,
  normalizeSideboardSpellIds,
  orderSpellsByIds,
} from "@/lib/queries/spellbook";
import CreatorAttribution from "@/components/CreatorAttribution";
import { getDisplayNamesForOwnerIds } from "@/lib/queries/publicProfiles";
import { getMyBuildRating } from "@/lib/queries/social";
import { computeTierResult } from "@/lib/tier";
import { isMartialClass } from "@/lib/spellbook/martial";
import { isCasterClass } from "@/lib/spellbook/casterBudget";
import { applyPurchasedEquipmentSpells } from "@/lib/spellbook/equipmentFromSpells";
import {
  applyArchetypeEquipmentOverrides,
  selectedMartialArchetypeSpells,
} from "@/lib/spellbook/martialEquipment";
import {
  buildArchetypeGrantExtraSelections,
  collectGrantedSpellIdsForArchetypes,
  flattenArchetypeGrantDescriptors,
  mergeGrantSpellsIntoCatalog,
} from "@/lib/spellbook/archetypeGrantedSpells";
import type { BuildSpellDisplayMode } from "@/components/BuildSpellDetails";
import { parseBuildViewDefaults } from "@/lib/spellbook/buildDisplayDefaults";
import type { SpellRow } from "@/lib/spellbook/types";
import type { ReactNode } from "react";

type Params = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ display?: string }>;
};

export default async function BuildDetailsPage({ params, searchParams }: Params) {
  const { id } = await params;
  const { display: rawDisplay } = await searchParams;
  const buildId = Number(id);

  const build = await getBuildById(buildId);
  if (!build) notFound();

  const [selections, spells, profile, buildGroups] = await Promise.all([
    getBuildSpellSelections(buildId),
    getCatalogSpellsForClass(build.class, build.level),
    getProfile(),
    getBuildGroupsForBuild(buildId),
  ]);

  const viewDefaults = parseBuildViewDefaults(
    profile && "build_view_defaults" in profile ? profile.build_view_defaults : undefined
  );
  const display: BuildSpellDisplayMode =
    rawDisplay === "type" || rawDisplay === "school" || rawDisplay === "level"
      ? rawDisplay
      : viewDefaults.display;

  const archetypes = selectedMartialArchetypeSpells(selections, spells);
  const archetypeNames = archetypes.map((a) => a.name);
  const grantIds = collectGrantedSpellIdsForArchetypes(archetypeNames);
  const fetchedGrants = grantIds.length > 0 ? await getSpellsByIds(grantIds) : [];
  const grantDescriptors = flattenArchetypeGrantDescriptors(archetypeNames);
  const spellsForView = mergeGrantSpellsIntoCatalog(
    spells,
    fetchedGrants,
    grantDescriptors,
    build.look_the_part
  );
  const extraArchetypeSelections =
    archetypeNames.length > 0
      ? buildArchetypeGrantExtraSelections(
          buildId,
          selections,
          spells,
          fetchedGrants,
          archetypeNames,
          build.look_the_part
        )
      : [];

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
  const showSaveControls = canAct && !canManageBuild;
  const isSaved = showSaveControls ? await isBuildSavedByCurrentUser(buildId) : false;
  const initialSaveCount = Math.max(0, Number(build.save_count ?? 0));
  const martial = isMartialClass(build.class);
  const archetypeSpells = selectedMartialArchetypeSpells(selections, spells);
  const baseEquipment = await getClassEquipment(build.class);
  const equipment = baseEquipment
    ? applyPurchasedEquipmentSpells(
        applyArchetypeEquipmentOverrides(baseEquipment, archetypeSpells, build.class),
        selections,
        spellsForView
      )
    : null;
  const creatorMap = await getDisplayNamesForOwnerIds([build.owner_id]);
  const creatorName = build.owner_id ? (creatorMap.get(build.owner_id) ?? "Player") : "Player";

  const caster = isCasterClass(build.class);
  let sideboardSpellsOrdered: SpellRow[] = [];
  if (caster) {
    const rawIds = normalizeSideboardSpellIds(build.sideboard_spell_ids);
    if (rawIds.length > 0) {
      const rows = await getSpellsByIds(rawIds);
      sideboardSpellsOrdered = orderSpellsByIds(rawIds, rows);
    }
  }

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

  const buildGroupsSection =
    buildGroups.length > 0 ? (
      <section className="mt-3 text-sm text-neutral-400 space-y-1" aria-label="Build groups">
        <p className="text-neutral-500 font-medium">Build Groups</p>
        <ul className="space-y-1">
          {buildGroups.map((g) => (
            <li key={g.id}>
              <Link href={`/build-groups/${g.id}`} className="text-blue-400 hover:underline">
                {g.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    ) : null;

  const buildHeaderLeft = (savesLine: ReactNode) => (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold break-words">{build.name}</h1>
      <p className="text-neutral-400">
        {build.class} level {build.level} {build.look_the_part ? "- Look The Part" : ""}
      </p>
      {build.notes ? <p className="text-sm text-neutral-500 mt-2 whitespace-pre-wrap">{build.notes}</p> : null}
      <div className="mt-2">
        <CreatorAttribution ownerId={build.owner_id} displayName={creatorName} />
      </div>
      {usageStatsSection(savesLine)}
      {buildGroupsSection}
    </div>
  );

  const buildHeaderActions = showSaveControls ? (
    <div className="flex flex-wrap gap-2 [&_button]:px-3 [&_button]:py-2 [&_button]:text-sm [&_button]:sm:text-base">
      <BuildSaveToggleButton />
    </div>
  ) : canManageBuild ? (
    <div className="flex flex-wrap gap-2">
      <Link href={`/builds/${build.id}/settings`} className="px-3 py-2 bg-neutral-700 rounded text-sm sm:text-base">
        Settings
      </Link>
      <Link href={`/builds/${build.id}/edit`} className="px-3 py-2 bg-amber-600 rounded text-sm sm:text-base">
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
      {showSaveControls ? (
        <BuildSaveProvider buildId={build.id} initialSaved={isSaved} initialSaveCount={initialSaveCount}>
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
            <span className="text-neutral-200 font-semibold">{stat.rawAverage.toFixed(2)}</span> ★ · {stat.votes} vote
            {stat.votes === 1 ? "" : "s"}
          </p>
          <CloneBuildButton buildId={buildId} canClone={canAct} />
        </div>
      </section>

      {equipment ? (
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
        spells={spellsForView}
        extraSelections={extraArchetypeSelections}
        className={build.class}
        lookThePart={build.look_the_part}
        display={display}
        spellbookTipsEnabled={profile?.spellbook_tips_enabled !== false}
        spellDetailLongPressEnabled={profile?.spell_detail_long_press_enabled !== false}
        buildMaxLevel={build.level}
        initialShowTypeSchool={viewDefaults.showTypeSchool}
        initialShowIncantation={viewDefaults.showIncantation}
        initialShowMaterials={viewDefaults.showMaterials}
        initialShowRange={viewDefaults.showRange}
      />
      {build.class === "Archer" ? (
        <ArcherArrowTotalsSection
          selections={selections}
          extraSelections={extraArchetypeSelections}
          spells={spellsForView}
          lookThePart={build.look_the_part}
          className={build.class}
        />
      ) : (
        <MaterialTotalsSection
          selections={selections}
          extraSelections={extraArchetypeSelections}
          spells={spellsForView}
          lookThePart={build.look_the_part}
          className={build.class}
        />
      )}
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

      {caster ? (
        <BuildSideboardSection
          spells={sideboardSpellsOrdered}
          spellbookTipsEnabled={profile?.spellbook_tips_enabled !== false}
          spellDetailLongPressEnabled={profile?.spell_detail_long_press_enabled !== false}
        />
      ) : null}

      <section className="rounded-lg border border-neutral-800 p-4 space-y-3">
        <p className="text-sm text-neutral-400">Rate This Build</p>
        <BuildRatingSection buildId={buildId} canRate={canAct} initialMyRating={myRating} />
      </section>

      <BuildCommentsSection buildId={buildId} canComment={canAct} />
    </main>
  );
}

