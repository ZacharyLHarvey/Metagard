import { redirect } from "next/navigation";
import CreateBuildForm from "@/components/CreateBuildForm";
import { getProfileCached } from "@/lib/queries/getProfileCached";
import { getCatalogClasses } from "@/lib/queries/spellbook";

export default async function CreateBuildPage() {
  const profile = await getProfileCached();
  if (!profile) {
    redirect("/login");
  }

  const classes = await getCatalogClasses();
  const classNames = classes.map((c) => c.name);

  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white space-y-4 sm:space-y-6 max-w-4xl">
      <h1 className="text-xl sm:text-2xl font-bold">Create a New Build</h1>

      <div className="border border-neutral-800 rounded-lg p-4 sm:p-6 bg-neutral-900/40">
        <CreateBuildForm classes={classNames} />
      </div>
    </main>
  );
}

