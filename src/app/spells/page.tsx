import Link from "next/link";
import TierBadge from "@/components/TierBadge";
import { getAllSpellsList } from "@/lib/queries/spellbook";
import AutoQuerySelect from "@/components/AutoQuerySelect";

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
    sections.push({ title: "All Spells", rows: filtered });
  }

  return (
    <main className="p-10 text-white space-y-6">
      <div className="flex flex-wrap gap-4 items-baseline justify-between">
        <h1 className="text-2xl font-bold">Spells</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <AutoQuerySelect
            name="group"
            label="Display"
            value={group}
            clearValue="all"
            options={[
              { value: "all", label: "All" },
              { value: "type", label: "Type" },
              { value: "school", label: "School" },
            ]}
          />
          <Link href="/leaderboards/spells" className="text-sm text-blue-400 underline">
            Spell Leaderboard
          </Link>
        </div>
      </div>

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
                  <TierBadge tier={(s.tier as "S+" | "S" | "A" | "B" | "C" | "D" | "F") ?? "C"} /> · {Number(s.weighted_rating ?? 0).toFixed(2)} · {Number(s.ratings_count ?? 0)} votes
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
