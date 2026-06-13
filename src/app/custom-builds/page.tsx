import Link from "next/link";
import BuildTableBodyRow from "@/components/BuildTableBodyRow";
import CreatorAttribution from "@/components/CreatorAttribution";
import TierBadge from "@/components/TierBadge";
import AutoQuerySelect from "@/components/AutoQuerySelect";
import {
  customBuildsPageTitle,
  includeCustomClassGroup,
  normalizeClassKey,
  normalizeClassLabel,
} from "@/lib/buildListGrouping";
import { listPublicCustomBuilds, type PublicCustomBuildListRow } from "@/lib/queries/customClassSpellbook";
import { getDisplayNamesForOwnerIds } from "@/lib/queries/publicProfiles";
import { getGlobalAverageRating, getNumericEntityVoteStats } from "@/lib/queries/ratingStats";
import { computeTierResult } from "@/lib/tier";

type Search = { group?: string };

export default async function CustomBuildsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { group = "all" } = await searchParams;

  let rows: PublicCustomBuildListRow[] = [];
  let loadError: string | null = null;
  try {
    rows = await listPublicCustomBuilds();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load custom builds";
    console.error("Error loading custom builds:", e);
  }

  if (loadError) {
    return (
      <main className="px-4 py-4 sm:px-6 lg:px-10 text-white">
        <h1 className="text-2xl font-bold mb-6">All Custom Builds</h1>
        <p>Failed to load custom builds.</p>
        <p className="mt-2 text-sm text-neutral-500">{loadError}</p>
      </main>
    );
  }

  const voteStats = await getNumericEntityVoteStats(
    "custom_build_ratings",
    "custom_build_id",
    rows.map((r) => r.id)
  );
  const globalAverage = await getGlobalAverageRating("custom_build_ratings");
  const creatorByOwnerId = await getDisplayNamesForOwnerIds(rows.map((r) => r.owner_id));

  const byClass = new Map<string, PublicCustomBuildListRow[]>();
  const labelByClassKey = new Map<string, string>();
  const classTypeByKey = new Map<string, "martial" | "caster">();

  for (const b of rows) {
    const key = normalizeClassKey(b.class_name);
    const label = normalizeClassLabel(b.class_name);
    if (!byClass.has(key)) byClass.set(key, []);
    if (!labelByClassKey.has(key)) labelByClassKey.set(key, label);
    if (!classTypeByKey.has(key)) classTypeByKey.set(key, b.class_type);
    byClass.get(key)!.push(b);
  }

  const classKeys = [...byClass.keys()].sort((a, b) => {
    const aLabel = labelByClassKey.get(a) ?? a;
    const bLabel = labelByClassKey.get(b) ?? b;
    return aLabel.localeCompare(bLabel);
  });

  const filterOptions: { value: string; label: string }[] = [
    { value: "all", label: "All Custom Builds" },
    ...classKeys.map((k) => ({ value: `class:${k}`, label: labelByClassKey.get(k) ?? k })),
    { value: "caster", label: "Caster" },
    { value: "martial", label: "Martial" },
  ];

  function includeClass(classKey: string) {
    return includeCustomClassGroup(classKey, classTypeByKey.get(classKey), group);
  }

  const visibleClassKeys = classKeys.filter(includeClass);
  const pageTitle = customBuildsPageTitle(group, labelByClassKey);

  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white space-y-6 sm:space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">{pageTitle}</h1>
        <div className="flex flex-wrap items-end gap-3">
          <Link href="/create-custom-build" className="px-3 py-2 bg-blue-600 rounded text-sm">
            Create Custom Build
          </Link>
          <AutoQuerySelect
            name="group"
            label="Tierlist Group"
            value={group}
            clearValue="all"
            options={filterOptions}
          />
        </div>
      </div>
      <p className="text-sm text-neutral-400 max-w-2xl">
        Grouped by custom class; within each group, sorted by level then name.
      </p>

      <style>
        {`
          .col-name { width: 28%; }
          .col-class { width: 15%; }
          .col-level { width: 10%; }
          .col-rating { width: 12%; }
          .col-look { width: 10%; }
        `}
      </style>

      {visibleClassKeys.length === 0 ? (
        <p className="text-neutral-400">
          No custom builds in this group.
          {rows.length === 0 ? (
            <>
              {" "}
              <Link href="/create-custom-build" className="text-blue-400 hover:underline">
                Create one
              </Link>{" "}
              from a custom class.
            </>
          ) : null}
        </p>
      ) : null}

      {visibleClassKeys.map((classKey) => (
        <section key={classKey} className="space-y-2 sm:space-y-3">
          <h2 className="text-lg font-semibold text-neutral-200 border-b border-neutral-800 pb-2">
            {labelByClassKey.get(classKey) ?? classKey}
          </h2>
          <div className="border border-neutral-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm sm:text-base">
                <thead className="bg-neutral-900">
                  <tr>
                    <th className="col-name px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                      Name
                    </th>
                    <th className="col-class px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                      Class
                    </th>
                    <th className="col-level px-4 py-1.5 leading-snug border-b border-neutral-800 border-r border-neutral-800">
                      Level
                    </th>
                    <th className="col-rating px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                      Rating
                    </th>
                    <th className="col-look px-4 py-1.5 leading-snug border-b border-neutral-800 border-r border-neutral-800">
                      LTP
                    </th>
                    <th className="px-4 py-2 border-b border-neutral-800 border-r border-neutral-800 min-w-[9rem]">
                      Creator
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {byClass.get(classKey)!.map((b) => {
                    const stat = voteStats.get(b.id) ?? {
                      votes: 0,
                      rawAverage: Number(b.average_rating ?? 0),
                    };
                    const tierData = computeTierResult(stat.rawAverage, stat.votes, globalAverage);
                    return (
                      <BuildTableBodyRow
                        key={b.id}
                        buildId={b.id}
                        hrefPrefix="/custom-builds"
                        className="hover:bg-neutral-900/40 transition"
                      >
                        <td className="col-name px-4 py-2 border-b border-neutral-800 border-r border-neutral-800 break-words">
                          {b.name}
                        </td>
                        <td className="col-class px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                          {b.class_name}
                        </td>
                        <td className="col-level px-4 py-1.5 leading-snug border-b border-neutral-800 border-r border-neutral-800">
                          {b.level}
                        </td>
                        <td className="col-rating px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                          <div className="flex items-center gap-2">
                            <TierBadge tier={tierData.tier} />
                            <span>{tierData.weightedRating.toFixed(2)}</span>
                          </div>
                        </td>
                        <td className="col-look px-4 py-1.5 leading-snug border-b border-neutral-800 border-r border-neutral-800">
                          {b.look_the_part ? "✔️" : "—"}
                        </td>
                        <td className="px-4 py-2 border-b border-neutral-800 border-r border-neutral-800 align-top">
                          <CreatorAttribution
                            ownerId={b.owner_id}
                            displayName={
                              b.owner_id ? (creatorByOwnerId.get(b.owner_id) ?? "Player") : "Player"
                            }
                          />
                        </td>
                      </BuildTableBodyRow>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ))}
    </main>
  );
}
