import { redirect } from "next/navigation";
import CreateCustomBuildForm from "@/components/CreateCustomBuildForm";
import { getProfileCached } from "@/lib/queries/getProfileCached";
import { listCustomClassesForBuildPicker } from "@/lib/queries/customClassSpellbook";

type SearchParams = { searchParams: Promise<{ classId?: string }> };

export default async function CreateCustomBuildPage({ searchParams }: SearchParams) {
  const profile = await getProfileCached();
  if (!profile) redirect("/login");

  const params = await searchParams;
  const initialClassId = params.classId ? Number(params.classId) : undefined;
  const classes = await listCustomClassesForBuildPicker();

  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white space-y-4 sm:space-y-6 max-w-4xl">
      <h1 className="text-xl sm:text-2xl font-bold">Create Custom Build</h1>
      <p className="text-sm text-neutral-400">
        Build from a user-created custom class only—not official Amtgard catalog classes.
      </p>
      <div className="border border-neutral-800 rounded-lg p-4 sm:p-6 bg-neutral-900/40">
        <CreateCustomBuildForm
          classes={classes}
          initialClassId={Number.isFinite(initialClassId) ? initialClassId : undefined}
        />
      </div>
    </main>
  );
}
