import { notFound } from "next/navigation";
import BuildSpellEditor from "@/components/BuildSpellEditor";
import {
  getBuildById,
  getBuildSpellSelections,
  getCatalogSpellsForClass,
} from "@/lib/queries/spellbook";

type Params = {
  params: Promise<{ id: string }>;
};

export default async function EditBuildPage({ params }: Params) {
  const { id } = await params;
  const buildId = Number(id);

  const build = await getBuildById(buildId);
  if (!build) notFound();

  const [spells, selections] = await Promise.all([
    getCatalogSpellsForClass(build.class, build.level),
    getBuildSpellSelections(buildId),
  ]);

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
        spells={spells}
        initialSelections={selections}
      />
    </main>
  );
}
