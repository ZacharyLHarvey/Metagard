import { notFound } from "next/navigation";
import BuildSettingsForm from "@/components/BuildSettingsForm";
import { getBuildById, getCatalogClasses } from "@/lib/queries/spellbook";

type Params = {
  params: Promise<{ id: string }>;
};

export default async function BuildSettingsPage({ params }: Params) {
  const { id } = await params;
  const build = await getBuildById(Number(id));
  if (!build) notFound();

  const classes = await getCatalogClasses();
  const classNames = classes.length > 0 ? classes.map((c) => c.name) : [build.class];

  return (
    <main className="p-10 text-white space-y-6">
      <h1 className="text-2xl font-bold">Build Settings</h1>
      <BuildSettingsForm build={build} classNames={classNames} />
    </main>
  );
}
