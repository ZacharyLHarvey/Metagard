import BuildTableBodyRow from "@/components/BuildTableBodyRow";
import CreateBuildHomeLink from "@/components/CreateBuildHomeLink";
import CreatorAttribution from "@/components/CreatorAttribution";
import ThemedWordmark from "@/components/ThemedWordmark";
import { getDisplayNamesForOwnerIds } from "@/lib/queries/publicProfiles";
import { getProfileCached } from "@/lib/queries/getProfileCached";
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
          .home-my-builds .col-name { width: 45%; }
          .home-my-builds .col-class { width: 30%; }
          .home-my-builds .col-level { width: 25%; }
          .home-saved-builds .col-name { width: 38%; }
          .home-saved-builds .col-class { width: 20%; }
          .home-saved-builds .col-level { width: 15%; }
          .home-saved-builds .col-creator { width: 27%; }
        `}
      </style>

      {/* My Builds */}
      <section className="mt-6 sm:mt-8">
        <h2 className="text-xl font-semibold mb-4">My Builds</h2>

        <div className="border border-neutral-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
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
              </tr>
            </thead>

            <tbody>
              {myBuilds.map((b) => (
                <BuildTableBodyRow key={b.id} buildId={b.id} className="hover:bg-neutral-900/40 transition">
                  <td className="col-name px-4 py-2 border-b border-neutral-800 border-r border-neutral-800 break-words">
                    {b.name}
                  </td>
                  <td className="col-class px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                    {b.class}
                  </td>
                  <td className="col-level px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                    {b.level}
                  </td>
                </BuildTableBodyRow>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </section>

      {/* Saved Builds */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold mb-4">Saved Builds</h2>

        <div className="border border-neutral-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
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
              </tr>
            </thead>

            <tbody>
              {savedBuilds.map((b) => (
                <BuildTableBodyRow key={b.id} buildId={b.id} className="hover:bg-neutral-900/40 transition">
                  <td className="col-name px-4 py-2 border-b border-neutral-800 border-r border-neutral-800 break-words">
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
                </BuildTableBodyRow>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </section>

      <div className="mt-10 flex justify-center pb-4">
        <CreateBuildHomeLink initialTheme={initialTheme} />
      </div>
    </main>
  );
}
