import { notFound } from "next/navigation";
import BuildSideboardEditor from "@/components/BuildSideboardEditor";
import BuildSpellEditor from "@/components/BuildSpellEditor";
import { getProfileCached } from "@/lib/queries/getProfileCached";
import {
  getBuildById,
  getBuildSpellSelections,
  getCatalogSpellsForClass,
  normalizeSideboardSpellIds,
} from "@/lib/queries/spellbook";
import { isCasterClass } from "@/lib/spellbook/casterBudget";

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

  const [spells, selections] = await Promise.all([
    getCatalogSpellsForClass(build.class, build.level),
    getBuildSpellSelections(buildId),
  ]);

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
        spells={spells}
        initialSelections={selections}
      />
      {showSideboard ? (
        <BuildSideboardEditor
          buildId={buildId}
          catalogSpells={spells}
          initialSideboardIds={sideboardIds}
          selections={selections}
          spellbookTipsEnabled={spellbookTipsEnabled}
        />
      ) : null}
    </main>
  );
}
