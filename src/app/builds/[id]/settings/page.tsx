import { notFound } from "next/navigation";
import { getBuildById } from "@/lib/queries/spellbook";
import BuildSettingsForm from "@/components/BuildSettingsForm";

type Params = {
  params: Promise<{ id: string }>;
};

export default async function BuildSettingsPage({ params }: Params) {
  const { id } = await params;
  const build = await getBuildById(Number(id));
  if (!build) notFound();

  return (
    <main className="p-10 text-white space-y-6">
      <h1 className="text-2xl font-bold">Build Settings</h1>
      <BuildSettingsForm build={build} />
    </main>
  );
}
