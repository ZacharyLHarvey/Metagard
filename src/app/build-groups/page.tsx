import Link from "next/link";
import BuildGroupTableBodyRow from "@/components/BuildGroupTableBodyRow";
import CreatorAttribution from "@/components/CreatorAttribution";
import TierBadge from "@/components/TierBadge";
import AutoQuerySelect from "@/components/AutoQuerySelect";
import { getBuildGroupMemberCounts } from "@/lib/queries/buildGroups";
import { getDisplayNamesForOwnerIds } from "@/lib/queries/publicProfiles";
import { getProfile } from "@/lib/queries/getProfile";
import { getGlobalAverageRating, getNumericEntityVoteStats } from "@/lib/queries/ratingStats";
import { createClient } from "@/lib/server/supabaseServer";
import { computeTierResult } from "@/lib/tier";

type BuildGroup = {
  id: number;
  name: string;
  owner_id: string | null;
  average_rating: number | null;
  created_at: string;
};

type Search = { group?: string };

export default async function BuildGroupsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { group = "all" } = await searchParams;
  const supabase = await createClient();
  const profile = await getProfile();
  const profileId = profile && "id" in profile && profile.id != null ? String(profile.id) : null;

  const { data: groups, error } = await supabase
    .from("build_groups")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error loading build groups:", error.message, error);
    return (
      <main className="px-4 py-4 sm:px-6 lg:px-10 text-white">
        <h1 className="text-2xl font-bold mb-6">Build Groups</h1>
        <p>Failed to load build groups.</p>
        <p className="mt-2 text-sm text-neutral-500">{error.message}</p>
      </main>
    );
  }

  let rows = (groups ?? []) as BuildGroup[];
  if (group === "mine" && profileId) {
    rows = rows.filter((g) => g.owner_id === profileId);
  }

  const [globalAverage, voteStats, creatorByOwnerId, memberCounts] = await Promise.all([
    getGlobalAverageRating("build_group_ratings"),
    getNumericEntityVoteStats("build_group_ratings", "build_group_id", rows.map((r) => r.id)),
    getDisplayNamesForOwnerIds(rows.map((r) => r.owner_id)),
    getBuildGroupMemberCounts(rows.map((r) => r.id)),
  ]);

  const filterOptions: { value: string; label: string }[] = [
    { value: "all", label: "All Build Groups" },
    ...(profileId ? [{ value: "mine", label: "My Build Groups" }] : []),
  ];

  const pageTitle = group === "mine" ? "My Build Groups" : "All Build Groups";

  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white space-y-6 sm:space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">{pageTitle}</h1>
        <div className="flex flex-wrap items-end gap-3">
          {filterOptions.length > 1 ? (
            <AutoQuerySelect
              name="group"
              label="Filter"
              value={group}
              clearValue="all"
              options={filterOptions}
            />
          ) : null}
          {profileId ? (
            <Link href="/create-build-group" className="px-3 py-2 bg-blue-600 rounded text-sm">
              Create Build Group
            </Link>
          ) : (
            <Link href="/login" className="px-3 py-2 bg-blue-600 rounded text-sm">
              Sign in to Create
            </Link>
          )}
        </div>
      </div>
      <p className="text-sm text-neutral-400 max-w-2xl">
        User-created collections of builds; sorted by name. Click a row to view a group.
      </p>

      <style>
        {`
          .col-bg-name { width: 32%; }
          .col-bg-builds { width: 12%; }
          .col-bg-rating { width: 18%; }
          .col-bg-creator { width: 22%; }
        `}
      </style>

      {rows.length === 0 ? (
        <p className="text-neutral-400">
          No build groups found. Check Row Level Security if you expected data (
          <code className="text-neutral-300">supabase/policies/build_groups_public_select.sql</code>
          ).
        </p>
      ) : (
        <div className="border border-neutral-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm sm:text-base">
              <thead className="bg-neutral-900">
                <tr>
                  <th className="col-bg-name px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                    Name
                  </th>
                  <th className="col-bg-builds px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                    Builds
                  </th>
                  <th className="col-bg-rating px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                    Rating
                  </th>
                  <th className="col-bg-creator px-4 py-2 border-b border-neutral-800">
                    Creator
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((g) => {
                  const stat = voteStats.get(g.id) ?? {
                    votes: 0,
                    rawAverage: Number(g.average_rating ?? 0),
                  };
                  const tierData = computeTierResult(stat.rawAverage, stat.votes, globalAverage);
                  const buildCount = memberCounts.get(g.id) ?? 0;
                  return (
                    <BuildGroupTableBodyRow
                      key={g.id}
                      groupId={g.id}
                      className="hover:bg-neutral-900/40 transition"
                    >
                      <td className="col-bg-name px-4 py-2 border-b border-neutral-800 border-r border-neutral-800 break-words">
                        {g.name}
                      </td>
                      <td className="col-bg-builds px-4 py-2 border-b border-neutral-800 border-r border-neutral-800 tabular-nums">
                        {buildCount}
                      </td>
                      <td className="col-bg-rating px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                        <div className="flex items-center gap-2">
                          <TierBadge tier={tierData.tier} />
                          <span>{tierData.weightedRating.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="col-bg-creator px-4 py-2 border-b border-neutral-800 align-top">
                        <CreatorAttribution
                          ownerId={g.owner_id}
                          displayName={
                            g.owner_id ? (creatorByOwnerId.get(g.owner_id) ?? "Player") : "Player"
                          }
                        />
                      </td>
                    </BuildGroupTableBodyRow>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
