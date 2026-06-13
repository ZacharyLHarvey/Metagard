import Link from "next/link";
import BuildTableBodyRow from "@/components/BuildTableBodyRow";
import CreatorAttribution from "@/components/CreatorAttribution";
import TierBadge from "@/components/TierBadge";
import { getCustomSpellLeaderboard } from "@/lib/queries/customSpells";
import { getDisplayNamesForOwnerIds } from "@/lib/queries/publicProfiles";

export default async function CustomSpellsPage() {
  const rows = await getCustomSpellLeaderboard();
  const creatorByOwnerId = await getDisplayNamesForOwnerIds(rows.map((r) => r.owner_id));

  return (
    <main className="p-10 text-white space-y-6">
      <div className="flex flex-wrap gap-4 items-baseline justify-between">
        <h1 className="text-2xl font-bold">Custom Spells</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/custom-spells/new" className="px-3 py-2 bg-blue-600 rounded text-sm">
            Create Custom Spell
          </Link>
          <Link href="/leaderboards/custom-spells" className="text-sm text-blue-400 hover:underline">
            Custom Spell Leaderboard →
          </Link>
        </div>
      </div>
      <p className="text-sm text-neutral-400 max-w-2xl">
        Rate each custom spell 1–5 stars. Ratings are stored in Supabase table{" "}
        <code className="text-neutral-300">custom_spell_ratings</code> and aggregated for leaderboard ranking.
      </p>
      <div className="border border-neutral-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-neutral-900">
              <tr>
                <th className="px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">Name</th>
                <th className="px-4 py-2 border-b border-neutral-800 border-r border-neutral-800 min-w-[9rem]">
                  Creator
                </th>
                <th className="px-4 py-2 border-b border-neutral-800">Rating</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-neutral-500 text-center">
                    No custom spells found.
                  </td>
                </tr>
              ) : null}
              {rows.map((r) => (
                <BuildTableBodyRow
                  key={r.id}
                  buildId={r.id}
                  hrefPrefix="/custom-spells"
                  className="hover:bg-neutral-900/40 transition"
                >
                  <td className="px-4 py-3 border-b border-neutral-800 border-r border-neutral-800 break-words">
                    {r.name}
                  </td>
                  <td className="px-4 py-3 border-b border-neutral-800 border-r border-neutral-800 align-top">
                    <CreatorAttribution
                      ownerId={r.owner_id}
                      displayName={
                        r.owner_id ? (creatorByOwnerId.get(r.owner_id) ?? "Player") : "Player"
                      }
                    />
                  </td>
                  <td className="px-4 py-3 border-b border-neutral-800 text-sm text-neutral-500">
                    <TierBadge tier={r.tier} /> · {r.weighted_rating.toFixed(2)} · {r.ratings_count} vote
                    {r.ratings_count === 1 ? "" : "s"}
                  </td>
                </BuildTableBodyRow>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
