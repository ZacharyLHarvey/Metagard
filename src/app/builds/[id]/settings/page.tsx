import { notFound } from "next/navigation";
import BuildSettingsForm from "@/components/BuildSettingsForm";
import { getBuildById } from "@/lib/queries/spellbook";

type Params = {
  params: Promise<{ id: string }>;
};

export default async function BuildSettingsPage({ params }: Params) {
  const { id } = await params;
  const build = await getBuildById(Number(id));
  if (!build) notFound();

  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white space-y-5 sm:space-y-6 max-w-4xl">
      <h1 className="text-xl sm:text-2xl font-bold">Build Settings</h1>
      <BuildSettingsForm build={build} />
    </main>
  );
}
