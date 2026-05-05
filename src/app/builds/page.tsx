import Link from "next/link";
import SaveBuildButton from "@/components/SaveBuildButton";
import { createClient } from "@/lib/server/supabaseServer";
import { getProfile } from "@/lib/queries/getProfile";

type Build = {
    id: number;
    name: string;
    class: string;
    level: number;
    average_rating: number;
    look_the_part: boolean;
    owner_id: string | null;
    created_at: string;
  };
  

export default async function BuildsPage() {
  const supabase = await createClient();
  const profile = await getProfile();

  const { data: builds, error } = await supabase
    .from("builds")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    console.error("Error loading builds:", error.message, error);
    return (
      <main className="p-10 text-white">
        <h1 className="text-2xl font-bold mb-6">All Builds</h1>
        <p>Failed to load builds.</p>
        <p className="mt-2 text-sm text-neutral-500">{error.message}</p>
      </main>
    );
  }

  const rows = (builds ?? []) as Build[];

  return (
    <main className="p-10 text-white">
      <h1 className="text-2xl font-bold mb-6">All Builds</h1>

      <style>
        {`
          .col-name { width: 28%; }
          .col-class { width: 15%; }
          .col-level { width: 10%; }
          .col-rating { width: 12%; }
          .col-look { width: 10%; }
          .col-actions { width: 25%; }
        `}
      </style>

      <div className="border border-neutral-800 rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-neutral-900">
            <tr>
              <th className="col-name px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">Name</th>
              <th className="col-class px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">Class</th>
              <th className="col-level px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">Level</th>
              <th className="col-rating px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">Rating</th>
              <th className="col-look px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">Look the Part</th>
              <th className="col-actions px-4 py-2 border-b border-neutral-800 text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-neutral-400 border-b border-neutral-800"
                >
                  No builds in the database yet. If you expected rows here, check
                  Row Level Security (see{" "}
                  <code className="text-neutral-300">
                    supabase/policies/builds_public_select.sql
                  </code>
                  ).
                </td>
              </tr>
            ) : null}
            {rows.map((b: Build) => (
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

                <td className="col-rating px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                  {Number(b.average_rating).toFixed(1)} ⭐
                </td>

                <td className="col-look px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                  {b.look_the_part ? "✔️" : "—"}
                </td>

                <td className="col-actions px-4 py-2 border-b border-neutral-800 text-right">
                  <div className="flex justify-end gap-3">
                    <Link
                      href={`/builds/${b.id}`}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                    >
                      View
                    </Link>

                    {profile?.id && b.owner_id === profile.id ? (
                      <Link
                        href={`/builds/${b.id}/edit`}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 rounded text-sm"
                      >
                        Edit
                      </Link>
                    ) : null}

                    <SaveBuildButton buildId={b.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
