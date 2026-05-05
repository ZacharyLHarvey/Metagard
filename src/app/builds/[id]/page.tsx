import Link from "next/link";
import { notFound } from "next/navigation";
import { getBuildById, getBuildSpellSelections, getCatalogSpellsForClass } from "@/lib/queries/spellbook";
import BuildSpellDetails from "@/components/BuildSpellDetails";

type Params = {
  params: Promise<{ id: string }>;
};

export default async function BuildDetailsPage({ params }: Params) {
  const { id } = await params;
  const buildId = Number(id);

  const build = await getBuildById(buildId);
  if (!build) notFound();

  const [selections, spells] = await Promise.all([
    getBuildSpellSelections(buildId),
    getCatalogSpellsForClass(build.class, build.level),
  ]);

  return (
    <main className="p-10 text-white space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{build.name}</h1>
          <p className="text-neutral-400">
            {build.class} level {build.level} {build.look_the_part ? "- Look The Part" : ""}
          </p>
          {build.notes ? <p className="text-sm text-neutral-500 mt-2 whitespace-pre-wrap">{build.notes}</p> : null}
        </div>
        <div className="flex gap-2">
          <Link href={`/builds/${build.id}/settings`} className="px-3 py-2 bg-neutral-700 rounded">
            Settings
          </Link>
          <Link href={`/builds/${build.id}/edit`} className="px-3 py-2 bg-amber-600 rounded">
            Edit Spells
          </Link>
        </div>
      </div>

      <BuildSpellDetails selections={selections} spells={spells} />
    </main>
  );
}
