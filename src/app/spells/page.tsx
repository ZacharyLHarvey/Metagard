import Link from "next/link";
import { getAllSpellsList } from "@/lib/queries/spellbook";

type Search = { group?: string };

export default async function SpellsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { group = "all" } = await searchParams;
  const spells = await getAllSpellsList();

  const filtered =
    group === "school"
      ? [...spells].sort((a, b) => (a.school ?? "").localeCompare(b.school ?? "") || a.name.localeCompare(b.name))
      : group === "type"
        ? [...spells].sort((a, b) => (a.type ?? "").localeCompare(b.type ?? "") || a.name.localeCompare(b.name))
        : spells;

  const sections: { title: string; rows: typeof spells }[] = [];
  if (group === "school") {
    const map = new Map<string, typeof spells>();
    for (const s of filtered) {
      const k = s.school ?? "—";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    for (const k of [...map.keys()].sort()) {
      sections.push({ title: k, rows: map.get(k)! });
    }
  } else if (group === "type") {
    const map = new Map<string, typeof spells>();
    for (const s of filtered) {
      const k = s.type ?? "—";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    for (const k of [...map.keys()].sort()) {
      sections.push({ title: k, rows: map.get(k)! });
    }
  } else {
    sections.push({ title: "All spells", rows: filtered });
  }

  return (
    <main className="p-10 text-white space-y-6">
      <h1 className="text-2xl font-bold">Spells</h1>
      <p className="text-sm text-neutral-400">
        Catalog from Supabase. Group by{" "}
        <Link href="/spells" className="text-blue-400 underline">
          all
        </Link>
        {" · "}
        <Link href="/spells?group=type" className="text-blue-400 underline">
          type
        </Link>
        {" · "}
        <Link href="/spells?group=school" className="text-blue-400 underline">
          school
        </Link>
        .{" "}
        <Link href="/leaderboards/spells" className="text-blue-400 underline">
          Leaderboard
        </Link>
      </p>

      {sections.map((sec) => (
        <section key={sec.title} className="border border-neutral-800 rounded-lg overflow-hidden">
          <h2 className="px-4 py-2 bg-neutral-900 text-lg font-semibold border-b border-neutral-800">{sec.title}</h2>
          <ul className="divide-y divide-neutral-800">
            {sec.rows.map((s) => (
              <li key={s.id} className="px-4 py-2 flex justify-between gap-4 hover:bg-neutral-900/40">
                <Link href={`/spells/${s.id}`} className="text-blue-400 hover:underline">
                  {s.name}
                </Link>
                <span className="text-xs text-neutral-500 shrink-0">
                  {s.type ?? "—"} · {s.school ?? "—"} · ★ {Number(s.average_rating ?? 0).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
