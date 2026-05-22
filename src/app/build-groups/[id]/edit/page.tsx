import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import BuildGroupForm, { type BuildGroupFormRow } from "@/components/BuildGroupForm";
import type { BuildPickerOption } from "@/components/BuildGroupForm";
import { getBuildGroupById, getBuildGroupMemberBuilds } from "@/lib/queries/buildGroups";
import { getProfile } from "@/lib/queries/getProfile";
import { createClient } from "@/lib/server/supabaseServer";

type Params = { params: Promise<{ id: string }> };

export default async function EditBuildGroupPage({ params }: Params) {
  const { id } = await params;
  const groupId = Number(id);
  const group = await getBuildGroupById(groupId);
  if (!group) notFound();

  const profile = await getProfile();
  const profileId = profile && "id" in profile && profile.id != null ? String(profile.id) : null;
  if (!profileId || profileId !== group.owner_id) {
    redirect(`/build-groups/${groupId}`);
  }

  const supabase = await createClient();
  const [memberBuilds, { data: builds }] = await Promise.all([
    getBuildGroupMemberBuilds(groupId),
    supabase.from("builds").select("id, name, class, level").order("name", { ascending: true }),
  ]);

  const allBuilds = ((builds ?? []) as Array<{ id: number; name: string; class: string; level: number }>).map(
    (b): BuildPickerOption => ({
      id: b.id,
      name: b.name,
      class: b.class,
      level: b.level,
    })
  );

  const initial: BuildGroupFormRow = {
    id: groupId,
    owner_id: group.owner_id,
    name: group.name,
    description: group.description,
  };

  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white max-w-2xl space-y-6">
      <Link href={`/build-groups/${groupId}`} className="text-sm text-blue-400 hover:underline">
        ← Build Group
      </Link>
      <h1 className="text-2xl font-bold">Edit Build Group</h1>
      <BuildGroupForm
        mode="edit"
        groupId={groupId}
        initial={initial}
        initialMemberBuilds={memberBuilds}
        allBuilds={allBuilds}
      />
    </main>
  );
}
