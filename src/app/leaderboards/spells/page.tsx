import Link from "next/link";
import { getAllSpellsList } from "@/lib/queries/spellbook";

export default async function SpellLeaderboardPage() {
  const spells = await getAllSpellsList();
  const ranked = [...spells].sort(
    (a, b) => Number(b.average_rating ?? 0) - Number(a.average_rating ?? 0)
  );

  return (
    <main className="p-10 text-white space-y-6">
      <div className="flex flex-wrap gap-4 items-baseline justify-between">
        <h1 className="text-2xl font-bold">Spell leaderboard</h1>
        <Link href="/leaderboards" className="text-sm text-blue-400 hover:underline">
          ← Build leaderboards
        </Link>
      </div>
      <p className="text-sm text-neutral-400 max-w-2xl">
        Spells ranked by <code className="text-neutral-300">average_rating</code> (requires extended SQL
        migration). Ties keep catalog order within the same rating.
      </p>
      <ol className="list-decimal list-inside space-y-1 text-sm max-w-3xl">
        {ranked.slice(0, 100).map((s) => (
          <li key={s.id}>
            <Link href={`/spells/${s.id}`} className="text-blue-400 hover:underline">
              {s.name}
            </Link>{" "}
            <span className="text-neutral-500">
              L{s.level ?? "—"} · {s.type ?? "—"} · {s.school ?? "—"} · ★{" "}
              {Number(s.average_rating ?? 0).toFixed(2)}
            </span>
          </li>
        ))}
      </ol>
    </main>
  );
}
