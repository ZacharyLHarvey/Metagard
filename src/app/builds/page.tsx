import Link from "next/link";
import SaveBuildButton from "@/components/SaveBuildButton";
import TierBadge from "@/components/TierBadge";
import AutoQuerySelect from "@/components/AutoQuerySelect";
import { getGlobalAverageRating, getNumericEntityVoteStats } from "@/lib/queries/ratingStats";
import { createClient } from "@/lib/server/supabaseServer";
import { computeTierResult } from "@/lib/tier";

type Build = {
  id: number;
  name: string;
  class: string;
  level: number;
  average_rating: number | null;
  look_the_part: boolean;
  owner_id: string | null;
  created_at: string;
};

function normalizeClassKey(value: string | null | undefined): string {
  const raw = (value ?? "").normalize("NFKC");
  const unifiedDashes = raw.replace(/[‐‑‒–—―−]/g, "-");
  const collapsedWhitespace = unifiedDashes.replace(/\s+/g, " ").trim();
  return collapsedWhitespace ? collapsedWhitespace.toLocaleLowerCase() : "—";
}

function normalizeClassLabel(value: string | null | undefined): string {
  const raw = (value ?? "").normalize("NFKC");
  const unifiedDashes = raw.replace(/[‐‑‒–—―−]/g, "-");
  const collapsedWhitespace = unifiedDashes.replace(/\s+/g, " ").trim();
  return collapsedWhitespace || "—";
}

const MARTIAL_CLASSES = new Set([
  "warrior",
  "paladin",
  "anti-paladin",
  "monk",
  "scout",
  "assassin",
  "barbarian",
  "archer",
]);

const CASTER_CLASSES = new Set(["bard", "druid", "healer", "wizard"]);

type Search = { group?: string };

export default async function BuildsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { group = "all" } = await searchParams;
  const supabase = await createClient();

  const { data: builds, error } = await supabase
    .from("builds")
    .select("*")
    .order("class", { ascending: true })
    .order("level", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Error loading builds:", error.message, error);
    return (
      <main className="px-4 py-4 sm:px-6 lg:px-10 text-white">
        <h1 className="text-2xl font-bold mb-6">All Builds</h1>
        <p>Failed to load builds.</p>
        <p className="mt-2 text-sm text-neutral-500">{error.message}</p>
      </main>
    );
  }

  const rows = (builds ?? []) as Build[];
  const voteStats = await getNumericEntityVoteStats(
    "build_ratings",
    "build_id",
    rows.map((r) => r.id)
  );
  const globalAverage = await getGlobalAverageRating("build_ratings");
  const byClass = new Map<string, Build[]>();
  const labelByClassKey = new Map<string, string>();
  for (const b of rows) {
    const key = normalizeClassKey(b.class);
    const label = normalizeClassLabel(b.class);
    if (!byClass.has(key)) byClass.set(key, []);
    if (!labelByClassKey.has(key)) labelByClassKey.set(key, label);
    byClass.get(key)!.push(b);
  }
  const classKeys = [...byClass.keys()].sort((a, b) => {
    const aLabel = labelByClassKey.get(a) ?? a;
    const bLabel = labelByClassKey.get(b) ?? b;
    return aLabel.localeCompare(bLabel);
  });

  const filterOptions: { value: string; label: string }[] = [
    { value: "all", label: "All builds" },
    ...classKeys.map((k) => ({ value: `class:${k}`, label: labelByClassKey.get(k) ?? k })),
    { value: "caster", label: "Caster" },
    { value: "martial", label: "Martial" },
  ];

  function includeClass(classKey: string) {
    if (group === "all") return true;
    if (group === "caster") return CASTER_CLASSES.has(classKey);
    if (group === "martial") return MARTIAL_CLASSES.has(classKey);
    if (group.startsWith("class:")) return classKey === group.slice("class:".length);
    return true;
  }

  const visibleClassKeys = classKeys.filter(includeClass);
  const pageTitle =
    group === "caster"
      ? "Caster builds"
      : group === "martial"
        ? "Martial builds"
        : group.startsWith("class:")
          ? `${labelByClassKey.get(group.slice("class:".length)) ?? "Class"} builds`
          : "All builds";

  return (
    <main className="px-4 py-4 sm:px-6 lg:px-10 text-white space-y-6 sm:space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">{pageTitle}</h1>
        <AutoQuerySelect
          name="group"
          label="Tierlist group"
          value={group}
          clearValue="all"
          options={filterOptions}
        />
      </div>
      <p className="text-sm text-neutral-400 max-w-2xl">
        Grouped by class; within each group, sorted by level then name.
      </p>

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

      {visibleClassKeys.length === 0 ? (
        <p className="text-neutral-400">
          No builds in this group. Check Row Level Security if you expected data (
          <code className="text-neutral-300">supabase/policies/builds_public_select.sql</code>
          ).
        </p>
      ) : null}

      {visibleClassKeys.map((classKey) => (
        <section key={classKey} className="space-y-2 sm:space-y-3">
          <h2 className="text-lg font-semibold text-neutral-200 border-b border-neutral-800 pb-2">
            {labelByClassKey.get(classKey) ?? classKey}
          </h2>
          <div className="border border-neutral-800 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse text-sm sm:text-base">
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
                  <th className="col-rating px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                    Rating
                  </th>
                  <th className="col-look px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                    LTP
                  </th>
                  <th className="col-actions px-4 py-2 border-b border-neutral-800 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {byClass.get(classKey)!.map((b) => {
                  const stat = voteStats.get(b.id) ?? { votes: 0, rawAverage: Number(b.average_rating ?? 0) };
                  const tierData = computeTierResult(stat.rawAverage, stat.votes, globalAverage);
                  return (
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
                      <div className="flex items-center gap-2">
                        <TierBadge tier={tierData.tier} />
                        <span>{tierData.weightedRating.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="col-look px-4 py-2 border-b border-neutral-800 border-r border-neutral-800">
                      {b.look_the_part ? "✔️" : "—"}
                    </td>
                    <td className="col-actions px-4 py-2 border-b border-neutral-800 text-right">
                      <div className="flex justify-start sm:justify-end gap-2 sm:gap-3 flex-wrap">
                        <Link
                          href={`/builds/${b.id}`}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                        >
                          View
                        </Link>
                        <SaveBuildButton buildId={b.id} />
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </main>
  );
}
