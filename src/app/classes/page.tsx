import Link from "next/link";
import TierBadge from "@/components/TierBadge";
import { getClassLeaderboard } from "@/lib/queries/spellbook";

export default async function ClassesPage() {
  const rows = await getClassLeaderboard();

  return (
    <main className="p-10 text-white space-y-6">
      <div className="flex flex-wrap gap-4 items-baseline justify-between">
        <h1 className="text-2xl font-bold">Classes</h1>
        <Link href="/leaderboards/classes" className="text-sm text-blue-400 hover:underline">
          Class Leaderboard →
        </Link>
      </div>
      <p className="text-sm text-neutral-400 max-w-2xl">
        Rate each class 1–5 stars. Ratings are stored in Supabase table{" "}
        <code className="text-neutral-300">class_ratings</code> and aggregated for leaderboard ranking.
      </p>
      <ul className="border border-neutral-800 rounded-lg divide-y divide-neutral-800">
        {rows.length === 0 ? (
          <li className="px-4 py-8 text-neutral-500 text-center">No classes found.</li>
        ) : null}
        {rows.map((r) => (
          <li key={r.id} className="px-4 py-3 flex justify-between gap-4">
            <Link href={`/classes/${r.id}`} className="text-blue-400 hover:underline">
              {r.name}
            </Link>
            <span className="text-sm text-neutral-500">
              <TierBadge tier={r.tier as "S+" | "S" | "A" | "B" | "C" | "D" | "F"} /> · {r.weighted_rating.toFixed(2)} · {r.ratings_count} vote{r.ratings_count === 1 ? "" : "s"}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}

