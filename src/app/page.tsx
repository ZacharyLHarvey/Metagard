import { getProfile } from "@/lib/queries/getProfile";
import Link from "next/link";
import { getMyBuilds, getSavedBuilds } from "@/lib/queries/spellbook";

export default async function Home() {
  const profile = await getProfile();
  const [myBuilds, savedBuilds] = await Promise.all([getMyBuilds(), getSavedBuilds()]);

  return (
    <main className="p-10 text-white">
      <h1 className="text-2xl font-bold">Metagard</h1>
      <p className="mt-4 text-neutral-400">
        Welcome back, {profile?.display_name}.
      </p>

      {/* Shared column layout */}
      <style>
        {`
          .col-name { width: 40%; }
          .col-class { width: 20%; }
          .col-level { width: 15%; }
          .col-actions { width: 25%; }
        `}
      </style>

      {/* My Builds */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold mb-4">My Builds</h2>

        <div className="border border-neutral-800 rounded-lg overflow-hidden">
          <table className="w-full text-left border-collapse">
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
          <table className="w-full text-left border-collapse">
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

                  <td className="col-actions px-4 py-2 border-b border-neutral-800 text-right">
                    <Link
                      href={`/builds/${b.id}`}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
