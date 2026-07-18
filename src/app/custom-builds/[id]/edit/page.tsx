import { notFound } from "next/navigation";
import BuildSpellEditor from "@/components/BuildSpellEditor";
import {
  customSelectionsToBuildSelectionRows,
  getCatalogSpellsForCustomClass,
  getCustomBuildById,
  getCustomBuildSpellSelections,
} from "@/lib/queries/customClassSpellbook";
import { getProfileCached } from "@/lib/queries/getProfileCached";
import { parseBuildEditDefaults } from "@/lib/spellbook/buildDisplayDefaults";

type Params = { params: Promise<{ id: string }> };

export default async function EditCustomBuildPage({ params }: Params) {
  const { id } = await params;
  const buildId = Number(id);

  const build = await getCustomBuildById(buildId);
  if (!build || !build.custom_class) notFound();

  const customClass = build.custom_class;
  const profile = await getProfileCached();
  const spellbookTipsEnabled = profile?.spellbook_tips_enabled !== false;
  const spellDetailLongPressEnabled = profile?.spell_detail_long_press_enabled !== false;
  const editDefaults = parseBuildEditDefaults(
    profile && "build_edit_defaults" in profile ? profile.build_edit_defaults : undefined
  );

  const [spells, selections] = await Promise.all([
    getCatalogSpellsForCustomClass(customClass.id, build.level),
    getCustomBuildSpellSelections(buildId),
  ]);

  const initialSelections = customSelectionsToBuildSelectionRows(selections, buildId);

  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white max-w-4xl space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Edit Custom Build: {build.name}</h1>
      <p className="text-sm text-neutral-400">
        {customClass.name} · Level {build.level}. Official archetype grant spells do not apply to
        custom classes.
      </p>
      <BuildSpellEditor
        buildId={buildId}
        className={customClass.name}
        maxLevel={build.level}
        lookThePart={build.look_the_part}
        spellbookTipsEnabled={spellbookTipsEnabled}
        spellDetailLongPressEnabled={spellDetailLongPressEnabled}
        spells={spells}
        initialSelections={initialSelections}
        initialShowTypeSchool={editDefaults.showTypeSchool}
        initialShowIncantation={editDefaults.showIncantation}
        initialShowMaterials={editDefaults.showMaterials}
        initialShowRange={editDefaults.showRange}
        editorMode="custom"
        classType={customClass.class_type}
        saveSelectionsUrl={`/api/custom-builds/${buildId}/spells`}
        redirectAfterSave={`/custom-builds/${buildId}`}
      />
    </main>
  );
}
