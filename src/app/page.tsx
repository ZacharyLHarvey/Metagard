import CreateBuildHomeLink from "@/components/CreateBuildHomeLink";
import CreatorAttribution from "@/components/CreatorAttribution";
import UnsaveSavedBuildButton from "@/components/UnsaveSavedBuildButton";
import ThemedWordmark from "@/components/ThemedWordmark";
import { getDisplayNamesForOwnerIds } from "@/lib/queries/publicProfiles";
import { getProfileCached } from "@/lib/queries/getProfileCached";
import Link from "next/link";
import { getMyBuilds, getSavedBuilds } from "@/lib/queries/spellbook";

export default async function Home() {
  const profile = await getProfileCached();
  const initialTheme = profile?.theme_preference === "light" ? "light" : "dark";
  const [myBuilds, savedBuilds] = await Promise.all([getMyBuilds(), getSavedBuilds()]);
  const creatorByOwnerId = await getDisplayNamesForOwnerIds(savedBuilds.map((b) => b.owner_id));

  return (
    <main className="p-10 text-white">
      <header className="px-4 text-center sm:px-6">
        <h1 className="sr-only">Metagard</h1>
        <ThemedWordmark initialTheme={initialTheme} priority />
      </header>

      {/* Shared column layout */}
      <style>
        {`
          .home-my-builds .col-name { width: 42%; }
          .home-my-builds .col-class { width: 24%; }
          .home-my-builds .col-level { width: 14%; }
          .home-my-builds .col-actions { width: 20%; }
          .home-saved-builds .col-name { width: 32%; }
          .home-saved-builds .col-class { width: 18%; }
          .home-saved-builds .col-level { width: 12%; }
          .home-saved-builds .col-creator { width: 18%; }
          .home-saved-builds .col-actions { width: 20%; }
        `}
      </style>

      {/* My Builds */}
      <section className="mt-6 sm:mt-8">
        <h2 className="text-xl font-semibold mb-4">My Builds</h2>

        <div className="border border-neutral-800 rounded-lg overflow-hidden">
          <table className="home-my-builds w-full text-left border-collapse">
            <thead className="bg-neutral-900">
              <tr>
                <th className="col-name px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                  Name
                </th>
                <th className="col-class px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                  Class
                </th>
                <th className="col-level px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                  Level
                </th>
                <th className="col-actions px-4 py-2 border-b border-neutral-800 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {myBuilds.map((b) => (
                <tr key={b.id} className="hover:bg-neutral-900/40 transition">
                  <td className="col-name px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                    {b.name}
                  </td>
                  <td className="col-class px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                    {b.class}
                  </td>
                  <td className="col-level px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                    {b.level}
                  </td>

                  <td className="col-actions px-4 py-2 border-b border-neutral-800 text-right">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/builds/${b.id}/edit`}
                        className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-sm"
                      >
                        Edit
                      </Link>

                      <Link
                        href={`/builds/${b.id}`}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Saved Builds */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold mb-4">Saved Builds</h2>

        <div className="border border-neutral-800 rounded-lg overflow-hidden">
          <table className="home-saved-builds w-full text-left border-collapse">
            <thead className="bg-neutral-900">
              <tr>
                <th className="col-name px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                  Name
                </th>
                <th className="col-class px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                  Class
                </th>
                <th className="col-level px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                  Level
                </th>
                <th className="col-creator px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                  Creator
                </th>
                <th className="col-actions px-4 py-2 border-b border-neutral-800 text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {savedBuilds.map((b) => (
                <tr key={b.id} className="hover:bg-neutral-900/40 transition">
                  <td className="col-name px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                    {b.name}
                  </td>
                  <td className="col-class px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                    {b.class}
                  </td>
                  <td className="col-level px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                    {b.level}
                  </td>
                  <td className="col-creator px-4 py-2 border-b border-neutral-800 border-r border-neutral-800 align-top">
                    <CreatorAttribution
                      ownerId={b.owner_id}
                      displayName={
                        b.owner_id ? (creatorByOwnerId.get(b.owner_id) ?? "Player") : "Player"
                      }
                    />
                  </td>

                  <td className="col-actions px-4 py-2 border-b border-neutral-800 text-right">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/builds/${b.id}`}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                      >
                        View
                      </Link>
                      <UnsaveSavedBuildButton buildId={b.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-10 flex justify-center pb-4">
        <CreateBuildHomeLink initialTheme={initialTheme} />
      </div>
    </main>
  );
}
