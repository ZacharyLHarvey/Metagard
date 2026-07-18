import { notFound } from "next/navigation";
import BuildSideboardEditor from "@/components/BuildSideboardEditor";
import BuildSpellEditor from "@/components/BuildSpellEditor";
import { getProfileCached } from "@/lib/queries/getProfileCached";
import {
  getBuildById,
  getBuildSpellSelections,
  getCatalogSpellsForClass,
  getSpellsByIds,
  normalizeSideboardSpellIds,
} from "@/lib/queries/spellbook";
import { isCasterClass } from "@/lib/spellbook/casterBudget";
import { parseBuildEditDefaults } from "@/lib/spellbook/buildDisplayDefaults";
import {
  buildArchetypeGrantExtraSelections,
  collectGrantedSpellIdsForArchetypes,
  flattenArchetypeGrantDescriptors,
  mergeGrantSpellsIntoCatalog,
} from "@/lib/spellbook/archetypeGrantedSpells";
import { selectedMartialArchetypeSpells } from "@/lib/spellbook/martialEquipment";

type Params = {
  params: Promise<{ id: string }>;
};

export default async function EditBuildPage({ params }: Params) {
  const { id } = await params;
  const buildId = Number(id);

  const build = await getBuildById(buildId);
  if (!build) notFound();

  const profile = await getProfileCached();
  const spellbookTipsEnabled = profile?.spellbook_tips_enabled !== false;
  const spellDetailLongPressEnabled = profile?.spell_detail_long_press_enabled !== false;
  const editDefaults = parseBuildEditDefaults(
    profile && "build_edit_defaults" in profile ? profile.build_edit_defaults : undefined
  );

  const [spells, selections] = await Promise.all([
    getCatalogSpellsForClass(build.class, build.level),
    getBuildSpellSelections(buildId),
  ]);

  const archetypes = selectedMartialArchetypeSpells(selections, spells);
  const archetypeNames = archetypes.map((a) => a.name);
  const grantIds = collectGrantedSpellIdsForArchetypes(archetypeNames);
  const fetchedGrants = grantIds.length > 0 ? await getSpellsByIds(grantIds) : [];
  const grantDescriptors = flattenArchetypeGrantDescriptors(archetypeNames);
  const spellsForEditor = mergeGrantSpellsIntoCatalog(
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

  const sideboardIds = normalizeSideboardSpellIds(build.sideboard_spell_ids);
  const showSideboard = isCasterClass(build.class);

  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white space-y-5 sm:space-y-6 max-w-6xl">
      <h1 className="text-xl sm:text-2xl font-bold break-words">Edit Build: {build.name}</h1>
      <p className="text-neutral-400">
        {build.class} level {build.level}
        {build.look_the_part ? " · Look the Part" : ""}
      </p>
      <BuildSpellEditor
        buildId={buildId}
        className={build.class}
        maxLevel={build.level}
        lookThePart={build.look_the_part}
        spellbookTipsEnabled={spellbookTipsEnabled}
        spellDetailLongPressEnabled={spellDetailLongPressEnabled}
        spells={spellsForEditor}
        initialSelections={selections}
        extraSelections={extraArchetypeSelections}
        initialShowTypeSchool={editDefaults.showTypeSchool}
        initialShowIncantation={editDefaults.showIncantation}
        initialShowMaterials={editDefaults.showMaterials}
        initialShowRange={editDefaults.showRange}
      />
      {showSideboard ? (
        <BuildSideboardEditor
          buildId={buildId}
          catalogSpells={spellsForEditor}
          initialSideboardIds={sideboardIds}
          selections={selections}
          spellbookTipsEnabled={spellbookTipsEnabled}
          spellDetailLongPressEnabled={spellDetailLongPressEnabled}
        />
      ) : null}
    </main>
  );
}
