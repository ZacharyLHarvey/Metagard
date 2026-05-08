import Link from "next/link";
import TierBadge from "@/components/TierBadge";
import { getGlobalAverageRating, getNumericEntityVoteStats } from "@/lib/queries/ratingStats";
import { computeTierResult } from "@/lib/tier";
import { createClient } from "@/lib/server/supabaseServer";

export default async function CustomClassesPage() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("custom_classes")
    .select("*")
    .order("average_rating", { ascending: false });
  const rows = (items ?? []) as Array<{ id: number; name: string; average_rating: number | null }>;
  const [globalAverage, voteStats] = await Promise.all([
    getGlobalAverageRating("custom_class_ratings"),
    getNumericEntityVoteStats("custom_class_ratings", "custom_class_id", rows.map((r) => r.id)),
  ]);

  return (
    <main className="p-10 text-white space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Custom classes</h1>
        <Link href="/custom-classes/new" className="px-3 py-2 bg-blue-600 rounded text-sm">
          Create custom class
        </Link>
      </div>
      <ul className="border border-neutral-800 rounded-lg divide-y divide-neutral-800">
        {(items ?? []).length === 0 ? (
          <li className="px-4 py-8 text-neutral-500 text-center">No custom classes yet.</li>
        ) : null}
        {rows.map((m) => {
          const stat = voteStats.get(m.id) ?? { votes: 0, rawAverage: Number(m.average_rating ?? 0) };
          const tierData = computeTierResult(stat.rawAverage, stat.votes, globalAverage);
          return (
          <li key={m.id} className="px-4 py-3 flex justify-between gap-4">
            <Link href={`/custom-classes/${m.id}`} className="text-blue-400 hover:underline">
              {m.name}
            </Link>
            <span className="text-sm text-neutral-500">
              <TierBadge tier={tierData.tier} /> · {tierData.weightedRating.toFixed(2)}
            </span>
          </li>
          );
        })}
      </ul>
    </main>
  );
}
