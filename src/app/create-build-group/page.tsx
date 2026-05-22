import { redirect } from "next/navigation";
import Link from "next/link";
import BuildGroupForm from "@/components/BuildGroupForm";
import type { BuildPickerOption } from "@/components/BuildGroupForm";
import { getProfileCached } from "@/lib/queries/getProfileCached";
import { createClient } from "@/lib/server/supabaseServer";

export default async function CreateBuildGroupPage() {
  const profile = await getProfileCached();
  if (!profile) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data: builds } = await supabase
    .from("builds")
    .select("id, name, class, level")
    .order("name", { ascending: true });

  const allBuilds = ((builds ?? []) as Array<{ id: number; name: string; class: string; level: number }>).map(
    (b): BuildPickerOption => ({
      id: b.id,
      name: b.name,
      class: b.class,
      level: b.level,
    })
  );

  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white space-y-4 sm:space-y-6 max-w-2xl">
      <Link href="/build-groups" className="text-sm text-blue-400 hover:underline">
        ← Build Groups
      </Link>
      <h1 className="text-xl sm:text-2xl font-bold">Create Build Group</h1>
      <div className="border border-neutral-800 rounded-lg p-4 sm:p-6 bg-neutral-900/40">
        <BuildGroupForm mode="create" allBuilds={allBuilds} />
      </div>
    </main>
  );
}
