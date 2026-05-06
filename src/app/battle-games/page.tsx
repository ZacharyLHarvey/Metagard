import Link from "next/link";
import { createClient } from "@/lib/server/supabaseServer";

export default async function BattleGamesPage() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("battle_games")
    .select("*")
    .order("average_rating", { ascending: false });

  return (
    <main className="p-10 text-white space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Battle games</h1>
        <Link href="/battle-games/new" className="px-3 py-2 bg-blue-600 rounded text-sm">
          Create battle game
        </Link>
      </div>
      <ul className="border border-neutral-800 rounded-lg divide-y divide-neutral-800">
        {(items ?? []).length === 0 ? (
          <li className="px-4 py-8 text-neutral-500 text-center">No battle games yet.</li>
        ) : null}
        {(items ?? []).map((m: { id: number; name: string; average_rating: number | null }) => (
          <li key={m.id} className="px-4 py-3 flex justify-between gap-4">
            <Link href={`/battle-games/${m.id}`} className="text-blue-400 hover:underline">
              {m.name}
            </Link>
            <span className="text-sm text-neutral-500">★ {Number(m.average_rating ?? 0).toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
