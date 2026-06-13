import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import CustomBuildSettingsForm from "@/components/CustomBuildSettingsForm";
import { getCustomBuildById } from "@/lib/queries/customClassSpellbook";
import { getProfile } from "@/lib/queries/getProfile";

type Params = { params: Promise<{ id: string }> };

export default async function CustomBuildSettingsPage({ params }: Params) {
  const { id } = await params;
  const buildId = Number(id);
  const build = await getCustomBuildById(buildId);
  if (!build || !build.custom_class) notFound();

  const profile = await getProfile();
  const profileId = profile && "id" in profile && profile.id != null ? String(profile.id) : null;
  if (!profileId || profileId !== build.owner_id) redirect(`/custom-builds/${buildId}`);

  const customClass = build.custom_class;

  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white space-y-5 sm:space-y-6 max-w-4xl">
      <Link href={`/custom-builds/${buildId}`} className="text-sm text-blue-400 hover:underline">
        ← Custom Build
      </Link>
      <h1 className="text-xl sm:text-2xl font-bold">Build Settings</h1>
      <CustomBuildSettingsForm
        build={build}
        className={customClass.name}
        classType={customClass.class_type}
      />
    </main>
  );
}
